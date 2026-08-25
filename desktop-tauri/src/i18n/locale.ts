const COMMON_LOCALES: Readonly<Record<string, string>> = Object.freeze({
  en: 'en-US',
  hu: 'hu-HU',
  de: 'de-DE',
  fr: 'fr-FR'
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
