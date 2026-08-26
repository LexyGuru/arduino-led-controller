export type LanguageRegion = 'western' | 'centralEastern' | 'asia';
export interface LanguageCatalogTarget { code: string; name: string; nativeName: string; region: LanguageRegion; }
export const LANGUAGE_CATALOG_TARGETS: readonly LanguageCatalogTarget[] = Object.freeze([
  { code: 'de', name: 'German', nativeName: 'Deutsch', region: 'western' },
  { code: 'fr', name: 'French', nativeName: 'Français', region: 'western' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', region: 'western' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', region: 'western' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', region: 'western' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', region: 'centralEastern' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', region: 'centralEastern' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', region: 'centralEastern' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', region: 'centralEastern' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', region: 'centralEastern' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', region: 'centralEastern' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文', region: 'asia' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', region: 'asia' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', region: 'asia' }
]);
export const LANGUAGE_CATALOG_TOTAL_WITH_ENGLISH = LANGUAGE_CATALOG_TARGETS.length + 1;
