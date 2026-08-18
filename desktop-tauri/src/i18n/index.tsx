import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  detectLanguage,
  setActiveLanguage,
  translateFor,
  type AppLanguage
} from './runtime';

interface I18nValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<AppLanguage>(() => detectLanguage());
  const setLanguage = (next: AppLanguage) => {
    setActiveLanguage(next);
    updateLanguage(next);
  };
  useEffect(() => {
    setActiveLanguage(language);
    document.documentElement.lang = language;
  }, [language]);
  const value = useMemo<I18nValue>(() => ({
    language,
    setLanguage,
    t: (key, values) => translateFor(language, key, values)
  }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
