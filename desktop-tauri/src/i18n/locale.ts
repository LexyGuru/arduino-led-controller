const COMMON_LOCALES: Readonly<Record<string, string>> = Object.freeze({
  en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', pt: 'pt-PT',
  hu: 'hu-HU', uk: 'uk-UA', pl: 'pl-PL', ru: 'ru-RU', cs: 'cs-CZ', ro: 'ro-RO',
  'zh-cn': 'zh-CN', ja: 'ja-JP', ko: 'ko-KR'
});

export function localeForLanguage(language: string): string {
  const normalized = String(language || '')
    .trim()
    .replace(/_/g, '-')
    .toLowerCase();

  const preferredLocale = COMMON_LOCALES[normalized];
  if (preferredLocale) return preferredLocale;

  try {
    const canonical = Intl.getCanonicalLocales(normalized)[0];
    return canonical || 'en-US';
  } catch {
    return 'en-US';
  }
}
