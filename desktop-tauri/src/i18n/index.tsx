import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode
} from 'react';
import {
  detectLanguage, fetchLanguageManifest, getCachedLanguageManifest, getInstalledLanguages,
  getInstalledPack, installLanguagePack, isLanguagePackUpdateAvailable,
  removeLanguagePack, setActiveLanguage, shouldRefreshLanguageManifest, translateFor,
  type AppLanguage, type LanguageCatalogItem, type LanguagePackManifest
} from './runtime';

interface I18nValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  languageCatalog: LanguageCatalogItem[];
  installedLanguages: string[];
  languagePackBusy: string | null;
  languagePackError: string;
  languageCatalogOnline: boolean;
  refreshLanguageCatalog: () => Promise<void>;
  installLanguage: (language: string) => Promise<void>;
  uninstallLanguage: (language: string) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

function catalogItems(manifest: LanguagePackManifest | null): LanguageCatalogItem[] {
  if (!manifest) return [];
  return Object.entries(manifest.languages)
    .map(([code, entry]) => {
      const installed = getInstalledPack(code);
      return {
        code,
        ...entry,
        installedVersion: installed?.packVersion,
        updateAvailable: isLanguagePackUpdateAvailable(code, entry)
      };
    })
    .sort((a, b) => a.nativeName.localeCompare(b.nativeName));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<AppLanguage>(() => detectLanguage());
  const [manifest, setManifest] = useState<LanguagePackManifest | null>(() => getCachedLanguageManifest());
  const [installedLanguages, setInstalledLanguages] = useState<string[]>(() => getInstalledLanguages());
  const [languagePackBusy, setLanguagePackBusy] = useState<string | null>(null);
  const [languagePackError, setLanguagePackError] = useState('');
  const [languageCatalogOnline, setLanguageCatalogOnline] = useState<boolean>(
    () => typeof navigator === 'undefined' ? true : navigator.onLine
  );

  const setLanguage = useCallback((next: AppLanguage) => {
    const installed = getInstalledLanguages();
    const selected = next === 'en' || installed.includes(next) ? next : 'en';
    setActiveLanguage(selected);
    updateLanguage(selected);
  }, []);

  const refreshLanguageCatalog = useCallback(async () => {
    try {
      setLanguagePackError('');
      setManifest(await fetchLanguageManifest());
      setLanguageCatalogOnline(true);
    } catch (error) {
      setLanguageCatalogOnline(false);
      setLanguagePackError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const installLanguage = useCallback(async (code: string) => {
    const entry = manifest?.languages?.[code];
    if (!entry) throw new Error(`Unknown language: ${code}`);
    setLanguagePackBusy(code);
    setLanguagePackError('');
    try {
      await installLanguagePack(code, entry);
      setInstalledLanguages(getInstalledLanguages());
      setLanguage(code);
    } catch (error) {
      setLanguagePackError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setLanguagePackBusy(null);
    }
  }, [manifest, setLanguage]);

  const uninstallLanguage = useCallback((code: string) => {
    removeLanguagePack(code);
    setInstalledLanguages(getInstalledLanguages());
    if (language === code) setLanguage('en');
  }, [language, setLanguage]);

  useEffect(() => {
    setActiveLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const online = () => setLanguageCatalogOnline(true);
    const offline = () => setLanguageCatalogOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  useEffect(() => {
    if (!manifest || shouldRefreshLanguageManifest()) {
      void refreshLanguageCatalog();
    }
  }, [manifest, refreshLanguageCatalog]);

  const languageCatalog = useMemo(() => catalogItems(manifest), [manifest]);

  const value = useMemo<I18nValue>(() => ({
    language, setLanguage,
    t: (key, values) => translateFor(language, key, values),
    languageCatalog, installedLanguages, languagePackBusy, languagePackError,
    languageCatalogOnline, refreshLanguageCatalog, installLanguage, uninstallLanguage
  }), [
    language, setLanguage, languageCatalog, installedLanguages, languagePackBusy,
    languagePackError, languageCatalogOnline, refreshLanguageCatalog, installLanguage, uninstallLanguage
  ]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

export function I18nText({
  k,
  values
}: {
  k: string;
  values?: Record<string, string | number>;
}) {
  const { t } = useI18n();
  return <>{t(k, values)}</>;
}
