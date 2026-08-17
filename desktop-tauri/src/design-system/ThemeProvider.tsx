import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

import {
  clearAppearanceStorage,
  clearCustomThemeStorage,
  createProfileDocument,
  CUSTOM_THEME_TOKEN_MAP,
  loadAppearance,
  loadCustomTheme,
  parseProfileDocument,
  saveAppearance,
  saveCustomTheme
} from './theme-storage';

import { applyAdvancedThemeSettings, loadAdvancedThemeSettings } from './theme-advanced';

import {
  DEFAULT_APPEARANCE,
  THEME_ENGINE_VERSION,
  THEME_ENGINE_PRODUCT_VERSION,
  THEME_SCHEMA_VERSION,
  type AppearanceSettings,
  type CustomThemeDocument,
  type FactoryThemeId,
  type ThemeProfileDocument,
  type ThemeTokenName
} from './theme-types';

interface ThemeContextValue {
  appearance: AppearanceSettings;
  setAppearance: (appearance: AppearanceSettings) => void;
  resetAppearance: () => void;
  resolvedMode: 'light' | 'dark';
  customTheme: CustomThemeDocument | null;
  importThemeProfile: (text: string) => ThemeProfileDocument;
  exportThemeProfile: () => string;
  cloneCurrentTheme: (name?: string) => CustomThemeDocument;
  clearCustomTheme: () => void;
  updateCustomThemeToken: (token: ThemeTokenName, value: string) => void;
  renameCustomTheme: (name: string) => void;
  replaceCustomThemeTokens: (tokens: Partial<Record<ThemeTokenName, string>>) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function systemMode(): 'light' | 'dark' {
  return globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function effectiveBaseTheme(
  appearance: AppearanceSettings,
  customTheme: CustomThemeDocument | null
): FactoryThemeId {
  if (appearance.theme !== 'custom') return appearance.theme;
  return customTheme?.baseTheme ?? 'midnight-neon';
}

function clearInlineCustomTokens(root: HTMLElement) {
  for (const cssVariable of Object.values(CUSTOM_THEME_TOKEN_MAP)) {
    root.style.removeProperty(cssVariable);
  }
}

function applyInlineCustomTokens(
  root: HTMLElement,
  customTheme: CustomThemeDocument | null,
  active: boolean
) {
  clearInlineCustomTokens(root);
  if (!active || !customTheme) return;
  for (const [token, value] of Object.entries(customTheme.tokens)) {
    const cssVariable = CUSTOM_THEME_TOKEN_MAP[token as ThemeTokenName];
    if (cssVariable && value) root.style.setProperty(cssVariable, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<AppearanceSettings>(loadAppearance);
  const [customTheme, setCustomTheme] = useState<CustomThemeDocument | null>(loadCustomTheme);
  const [detectedMode, setDetectedMode] = useState<'light' | 'dark'>(systemMode);

  useEffect(() => {
    const media = globalThis.matchMedia?.('(prefers-color-scheme: light)');
    if (!media) return;
    const listener = () => setDetectedMode(media.matches ? 'light' : 'dark');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedMode = appearance.mode === 'system' ? detectedMode : appearance.mode;

  // V417_MACOS_DOCK_ICON_FOLLOWS_RESOLVED_MODE
  useEffect(() => {
    const tauriRuntime =
      typeof globalThis !== 'undefined' &&
      '__TAURI_INTERNALS__' in globalThis;
    if (!tauriRuntime) return;
    let disposed = false;
    void import('@tauri-apps/api/core')
      .then(({ invoke }) => {
        if (disposed) return undefined;
        return invoke<string>('macos_sync_app_icon', { theme: resolvedMode });
      })
      .catch(() => undefined);
    return () => { disposed = true; };
  }, [resolvedMode]);

  useEffect(() => {
    saveAppearance(appearance);
    if (customTheme) saveCustomTheme(customTheme);

    const root = document.documentElement;
    root.dataset.themeEngine = THEME_ENGINE_VERSION;
    root.dataset.themeProduct = THEME_ENGINE_PRODUCT_VERSION;
    root.dataset.themeSchema = String(THEME_SCHEMA_VERSION);
    root.dataset.themeProfile = appearance.theme;
    root.dataset.theme = effectiveBaseTheme(appearance, customTheme);
    root.dataset.appearance = resolvedMode;
    root.dataset.accent = appearance.accent;
    root.dataset.density = appearance.density;
    root.dataset.radius = appearance.radius;
    root.dataset.animations = appearance.animations ? 'on' : 'off';
    root.dataset.glass = appearance.glass ? 'on' : 'off';
    root.dataset.glassStrength = appearance.glassStrength;
    root.dataset.motion = appearance.motion;
    root.dataset.glow = appearance.glow;
    root.dataset.backgroundArt = appearance.backgroundArt ? 'on' : 'off';
    root.dataset.material = appearance.material;
    root.dataset.gradient = appearance.gradient;
    root.dataset.contrast = appearance.contrast;
    root.dataset.visualFx = appearance.visualFx;
    applyAdvancedThemeSettings(root, loadAdvancedThemeSettings());
    root.style.colorScheme = resolvedMode;

    applyInlineCustomTokens(root, customTheme, appearance.theme === 'custom');
  }, [appearance, customTheme, resolvedMode]);

  const resetAppearance = () => {
    clearAppearanceStorage();
    clearCustomThemeStorage();
    setCustomTheme(null);
    setAppearance(DEFAULT_APPEARANCE);
  };

  const importThemeProfile = (text: string) => {
    const profile = parseProfileDocument(text);
    if (profile.customTheme) {
      saveCustomTheme(profile.customTheme);
      setCustomTheme(profile.customTheme);
    } else {
      clearCustomThemeStorage();
      setCustomTheme(null);
    }
    setAppearance(profile.appearance);
    return profile;
  };

  const exportThemeProfile = () =>
    JSON.stringify(createProfileDocument(appearance, customTheme), null, 2);

  const cloneCurrentTheme = (name = 'Custom Theme') => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const tokens: Partial<Record<ThemeTokenName, string>> = {};
    for (const [token, cssVariable] of Object.entries(CUSTOM_THEME_TOKEN_MAP)) {
      const value = computed.getPropertyValue(cssVariable).trim();
      if (value) tokens[token as ThemeTokenName] = value;
    }
    const created: CustomThemeDocument = {
      schemaVersion: 2,
      themeEngine: '2.0',
      name,
      baseTheme: effectiveBaseTheme(appearance, customTheme),
      tokens
    };
    saveCustomTheme(created);
    setCustomTheme(created);
    setAppearance({ ...appearance, theme: 'custom' });
    return created;
  };

  const clearCustomTheme = () => {
    clearCustomThemeStorage();
    setCustomTheme(null);
    if (appearance.theme === 'custom') {
      setAppearance({ ...appearance, theme: DEFAULT_APPEARANCE.theme });
    }
  };

  const updateCustomThemeToken = (
    token: ThemeTokenName,
    value: string
  ) => {
    if (!customTheme) return;

    const next: CustomThemeDocument = {
      ...customTheme,
      tokens: {
        ...customTheme.tokens,
        [token]: value
      }
    };

    saveCustomTheme(next);
    setCustomTheme(next);

    if (appearance.theme !== 'custom') {
      setAppearance({ ...appearance, theme: 'custom' });
    }
  };

  const replaceCustomThemeTokens = (
    tokens: Partial<Record<ThemeTokenName, string>>
  ) => {
    if (!customTheme) return;
    const next: CustomThemeDocument = { ...customTheme, tokens: { ...tokens } };
    saveCustomTheme(next);
    setCustomTheme(next);
    if (appearance.theme !== 'custom') setAppearance({ ...appearance, theme: 'custom' });
  };

  const renameCustomTheme = (name: string) => {
    if (!customTheme) return;

    const normalizedName =
      name.trim().slice(0, 64) || 'Custom Theme';

    const next: CustomThemeDocument = {
      ...customTheme,
      name: normalizedName
    };

    saveCustomTheme(next);
    setCustomTheme(next);
  };

  const value = useMemo(
    () => ({
      appearance,
      setAppearance,
      resetAppearance,
      resolvedMode,
      customTheme,
      importThemeProfile,
      exportThemeProfile,
      cloneCurrentTheme,
      clearCustomTheme,
      updateCustomThemeToken,
      renameCustomTheme,
      replaceCustomThemeTokens
    }),
    [appearance, customTheme, resolvedMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
