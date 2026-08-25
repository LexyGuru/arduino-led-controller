import embeddedEnglishJson from './locales/en.json';
import packageJson from '../../package.json';
import { assertNoDuplicateJsonKeys } from './jsonIntegrity';
export { localeForLanguage } from './locale';

export type AppLanguage = string;
export type Dictionary = Record<string, string>;

export interface LanguageCatalogEntry {
  name: string;
  nativeName: string;
  status: 'available' | 'pending';
  version?: string;
  packVersion?: string;
  file?: string;
  sha256?: string;
  minAppVersion?: string;
  maxAppVersion?: string;
}

export interface LanguageCatalogItem extends LanguageCatalogEntry {
  code: string;
  installedVersion?: string;
  updateAvailable?: boolean;
}

export interface LanguagePackManifest {
  schemaVersion: number;
  catalogVersion: string;
  defaultLanguage: string;
  embedded?: Record<string, { name: string; nativeName: string; source: string }>;
  languages: Record<string, LanguageCatalogEntry>;
}

export interface StoredLanguagePack {
  schemaVersion: 1;
  language: string;
  packVersion: string;
  minAppVersion: string;
  maxAppVersion?: string;
  translations: Dictionary;
  sha256?: string;
  installedAt: string;
}

const LANGUAGE_STORAGE_KEY = 'alc.language';
const PACK_PREFIX = 'alc.languagePack.';
const PACK_TEMP_PREFIX = 'alc.languagePack.tmp.';
const MANIFEST_CACHE_KEY = 'alc.languagePack.manifest';
const MANIFEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PACK_BYTES = 1024 * 1024;
const APP_VERSION = String(packageJson.version || '0.0.0');

interface CachedLanguageManifest {
  fetchedAt: number;
  manifest: LanguagePackManifest;
}

export const LANGUAGE_PACK_MANIFEST_URL =
  import.meta.env.VITE_LANGUAGE_PACK_MANIFEST_URL ||
  'https://raw.githubusercontent.com/LexyGuru/arduino-led-controller/language-packs/language-packs/manifest.json';

const embeddedEnglish: Dictionary = embeddedEnglishJson as Dictionary;
let activeLanguage: AppLanguage = 'en';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isDictionary(value: unknown): value is Dictionary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    item => typeof item === 'string' && item.length > 0
  );
}

interface ParsedSemver {
  core: [number, number, number];
  prerelease: Array<string | number>;
}

function parseSemver(value: string): ParsedSemver | null {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]
      ? match[4].split('.').map(part => /^\d+$/.test(part) ? Number(part) : part)
      : []
  };
}

export function compareSemver(left: string, right: string): number {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) throw new Error(`Invalid semantic version comparison: ${left} / ${right}`);
  for (let i = 0; i < 3; i += 1) {
    if (a.core[i] !== b.core[i]) return a.core[i] < b.core[i] ? -1 : 1;
  }
  if (!a.prerelease.length && !b.prerelease.length) return 0;
  if (!a.prerelease.length) return 1;
  if (!b.prerelease.length) return -1;
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i += 1) {
    const av = a.prerelease[i];
    const bv = b.prerelease[i];
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    if (av === bv) continue;
    if (typeof av === 'number' && typeof bv === 'number') return av < bv ? -1 : 1;
    if (typeof av === 'number') return -1;
    if (typeof bv === 'number') return 1;
    return av < bv ? -1 : 1;
  }
  return 0;
}

function appVersionCompatible(minimum?: string, maximum?: string): boolean {
  if (minimum && compareSemver(APP_VERSION, minimum) < 0) return false;
  if (maximum && compareSemver(APP_VERSION, maximum) > 0) return false;
  return true;
}

function installedPackKey(language: string) {
  return `${PACK_PREFIX}${language}`;
}

export function getInstalledPack(language: string): StoredLanguagePack | null {
  if (language === 'en') return null;
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(installedPackKey(language));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLanguagePack;
    if (
      parsed.schemaVersion !== 1 ||
      parsed.language !== language ||
      typeof parsed.packVersion !== 'string' ||
      typeof parsed.minAppVersion !== 'string' ||
      (parsed.maxAppVersion !== undefined && typeof parsed.maxAppVersion !== 'string') ||
      !isDictionary(parsed.translations)
    ) return null;
    if (!appVersionCompatible(parsed.minAppVersion, parsed.maxAppVersion)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getInstalledLanguages(): string[] {
  const store = storage();
  const values = new Set<string>(['en']);
  if (!store) return [...values];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (!key?.startsWith(PACK_PREFIX) || key.startsWith(PACK_TEMP_PREFIX)) continue;
    const language = key.slice(PACK_PREFIX.length);
    if (getInstalledPack(language)) values.add(language);
  }
  return [...values].sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)));
}

function dictionaryFor(language: string): Dictionary {
  if (language === 'en') return embeddedEnglish;
  return getInstalledPack(language)?.translations || embeddedEnglish;
}

export function placeholdersOf(template: string): string[] {
  const result = new Set<string>();
  const matcher = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}|\{\s*([A-Za-z0-9_.-]+)\s*\}/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(template)) !== null) {
    result.add(match[1] || match[2]);
  }
  return [...result].sort();
}

function assertPlaceholderParity(translations: Dictionary): void {
  for (const [key, englishValue] of Object.entries(embeddedEnglish)) {
    const expected = placeholdersOf(englishValue);
    const actual = placeholdersOf(translations[key] || '');
    if (
      expected.length !== actual.length ||
      expected.some((placeholder, index) => placeholder !== actual[index])
    ) {
      throw new Error(`Language pack placeholder mismatch: ${key}`);
    }
  }
}

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(
    /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}|\{\s*([A-Za-z0-9_.-]+)\s*\}/g,
    (match, doubleKey: string | undefined, singleKey: string | undefined) => {
      const key = doubleKey || singleKey;
      return key && Object.prototype.hasOwnProperty.call(values, key)
        ? String(values[key])
        : match;
    }
  );
}

export function translateFor(
  language: AppLanguage,
  key: string,
  values?: Record<string, string | number>
): string {
  const selected = dictionaryFor(language);
  const template = selected[key] ?? embeddedEnglish[key] ?? key;
  return interpolate(template, values);
}

export function translate(key: string, values?: Record<string, string | number>): string {
  return translateFor(activeLanguage, key, values);
}

export function detectLanguage(): AppLanguage {
  const store = storage();
  const saved = store?.getItem(LANGUAGE_STORAGE_KEY)?.trim();
  if (saved && (saved === 'en' || getInstalledPack(saved))) return saved;
  const detected = typeof navigator !== 'undefined'
    ? String(navigator.language || '').slice(0, 2).toLowerCase()
    : '';
  if (detected === 'en' || (detected && getInstalledPack(detected))) return detected;
  return 'en';
}

export function setActiveLanguage(language: AppLanguage): void {
  const next = language === 'en' || getInstalledPack(language) ? language : 'en';
  activeLanguage = next;
  storage()?.setItem(LANGUAGE_STORAGE_KEY, next);
}

export function getActiveLanguage(): AppLanguage {
  return activeLanguage;
}

export const languageOptions: AppLanguage[] = getInstalledLanguages();

function validateManifest(value: unknown): LanguagePackManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid language-pack manifest.');
  }
  const manifest = value as LanguagePackManifest;
  if (manifest.schemaVersion !== 1 || manifest.defaultLanguage !== 'en') {
    throw new Error('Unsupported language-pack manifest schema.');
  }
  if (!manifest.languages || typeof manifest.languages !== 'object') {
    throw new Error('Language-pack manifest does not contain languages.');
  }
  for (const [code, entry] of Object.entries(manifest.languages)) {
    if (!/^[a-z]{2}$/.test(code)) throw new Error(`Invalid language code: ${code}`);
    if (!entry?.name || !entry.nativeName) throw new Error(`Language metadata missing: ${code}`);
    if (entry.status !== 'available' && entry.status !== 'pending') {
      throw new Error(`Invalid language status: ${code}`);
    }
    if (entry.status === 'available' && (!entry.file || !(entry.packVersion || entry.version))) {
      throw new Error(`Download metadata missing: ${code}`);
    }
    if (entry.minAppVersion !== undefined && typeof entry.minAppVersion !== 'string') {
      throw new Error(`Invalid minimum app version: ${code}`);
    }
    if (entry.maxAppVersion !== undefined && typeof entry.maxAppVersion !== 'string') {
      throw new Error(`Invalid maximum app version: ${code}`);
    }
  }
  return manifest;
}

function readManifestCache(): CachedLanguageManifest | null {
  try {
    const raw = storage()?.getItem(MANIFEST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLanguageManifest | LanguagePackManifest;
    if (parsed && typeof parsed === 'object' && 'manifest' in parsed && 'fetchedAt' in parsed) {
      const envelope = parsed as CachedLanguageManifest;
      if (!Number.isFinite(envelope.fetchedAt)) return null;
      return { fetchedAt: envelope.fetchedAt, manifest: validateManifest(envelope.manifest) };
    }
    return { fetchedAt: 0, manifest: validateManifest(parsed) };
  } catch {
    return null;
  }
}

export function getCachedLanguageManifest(): LanguagePackManifest | null {
  return readManifestCache()?.manifest || null;
}

export function shouldRefreshLanguageManifest(now = Date.now()): boolean {
  const cached = readManifestCache();
  return !cached || now - cached.fetchedAt >= MANIFEST_CACHE_TTL_MS;
}

export async function fetchLanguageManifest(): Promise<LanguagePackManifest> {
  const response = await fetch(LANGUAGE_PACK_MANIFEST_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Language catalog HTTP ${response.status}`);
  const raw = await response.text();
  assertNoDuplicateJsonKeys(raw);
  const manifest = validateManifest(JSON.parse(raw));
  const cached: CachedLanguageManifest = { fetchedAt: Date.now(), manifest };
  storage()?.setItem(MANIFEST_CACHE_KEY, JSON.stringify(cached));
  return manifest;
}

async function sha256Hex(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 verification is unavailable.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map(value => value.toString(16).padStart(2, '0')).join('');
}

export async function installLanguagePack(
  language: string,
  entry: LanguageCatalogEntry
): Promise<StoredLanguagePack> {
  if (language === 'en') throw new Error('English is built into the application.');
  if (!/^[a-z]{2}$/.test(language)) throw new Error('Invalid language code.');
  if (entry.status !== 'available' || !entry.file) throw new Error('Language pack is not available yet.');
  if (!appVersionCompatible(entry.minAppVersion, entry.maxAppVersion)) {
    throw new Error('Language pack is not compatible with this application version.');
  }

  const packUrl = new URL(entry.file, LANGUAGE_PACK_MANIFEST_URL).toString();
  const response = await fetch(packUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Language pack HTTP ${response.status}`);
  const contentLength = Number(response.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_PACK_BYTES) {
    throw new Error('Language pack exceeds the maximum allowed size.');
  }
  const raw = await response.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_PACK_BYTES) {
    throw new Error('Language pack exceeds the maximum allowed size.');
  }

  if (entry.sha256) {
    const actual = await sha256Hex(raw);
    if (actual.toLowerCase() !== entry.sha256.toLowerCase()) {
      throw new Error('Language pack SHA-256 verification failed.');
    }
  }

  assertNoDuplicateJsonKeys(raw);
  const payload = JSON.parse(raw) as Omit<StoredLanguagePack, 'installedAt' | 'sha256'>;
  if (
    payload.schemaVersion !== 1 ||
    payload.language !== language ||
    typeof payload.packVersion !== 'string' ||
    typeof payload.minAppVersion !== 'string' ||
    (payload.maxAppVersion !== undefined && typeof payload.maxAppVersion !== 'string') ||
    !isDictionary(payload.translations)
  ) throw new Error('Language pack payload failed schema validation.');

  if (!appVersionCompatible(payload.minAppVersion, payload.maxAppVersion)) {
    throw new Error('Language pack payload is not compatible with this application version.');
  }

  const englishKeys = Object.keys(embeddedEnglish).sort();
  const packKeys = Object.keys(payload.translations).sort();
  if (
    englishKeys.length !== packKeys.length ||
    englishKeys.some((key, index) => key !== packKeys[index])
  ) throw new Error('Language pack keyset does not match the embedded English master.');

  assertPlaceholderParity(payload.translations);

  const installed: StoredLanguagePack = {
    ...payload,
    sha256: entry.sha256,
    installedAt: new Date().toISOString()
  };

  const store = storage();
  if (!store) throw new Error('Persistent language storage is unavailable.');
  const tempKey = `${PACK_TEMP_PREFIX}${language}`;
  const finalKey = installedPackKey(language);
  const previous = store.getItem(finalKey);
  const serialized = JSON.stringify(installed);

  try {
    store.setItem(tempKey, serialized);
    const staged = JSON.parse(store.getItem(tempKey) || 'null') as StoredLanguagePack | null;
    if (!staged || staged.language !== language || staged.packVersion !== installed.packVersion || !isDictionary(staged.translations)) {
      throw new Error('Language pack atomic staging verification failed.');
    }

    store.setItem(finalKey, serialized);
    const committed = JSON.parse(store.getItem(finalKey) || 'null') as StoredLanguagePack | null;
    if (!committed || committed.language !== language || committed.packVersion !== installed.packVersion || !isDictionary(committed.translations)) {
      throw new Error('Language pack atomic commit verification failed.');
    }
  } catch (error) {
    if (previous === null) store.removeItem(finalKey);
    else store.setItem(finalKey, previous);
    throw error;
  } finally {
    store.removeItem(tempKey);
  }
  return installed;
}

export function isLanguagePackUpdateAvailable(
  language: string,
  entry: LanguageCatalogEntry
): boolean {
  const installed = getInstalledPack(language);
  const remoteVersion = entry.packVersion || entry.version;
  if (!installed || !remoteVersion || entry.status !== 'available') return false;
  try {
    return compareSemver(remoteVersion, installed.packVersion) > 0;
  } catch {
    return false;
  }
}

export function removeLanguagePack(language: string): void {
  if (language === 'en') return;
  storage()?.removeItem(installedPackKey(language));
  storage()?.removeItem(`${PACK_TEMP_PREFIX}${language}`);
  if (activeLanguage === language) setActiveLanguage('en');
}

export function embeddedEnglishKeyCount(): number {
  return Object.keys(embeddedEnglish).length;
}
