import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

import {
  loadAppearance,
  saveAppearance
} from './theme-storage';

import {
  THEME_ENGINE_VERSION,
  type AppearanceSettings
} from './theme-types';

interface ThemeContextValue {
  appearance: AppearanceSettings;
  setAppearance: (appearance: AppearanceSettings) => void;
  resetAppearance: () => void;
  resolvedMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function systemMode(): 'light' | 'dark' {
  return globalThis.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<AppearanceSettings>(loadAppearance);
  const [detectedMode, setDetectedMode] = useState<'light' | 'dark'>(systemMode);

  useEffect(() => {
    const media = globalThis.matchMedia?.('(prefers-color-scheme: light)');
    if (!media) return;

    const listener = () => setDetectedMode(media.matches ? 'light' : 'dark');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedMode = appearance.mode === 'system'
    ? detectedMode
    : appearance.mode;

  useEffect(() => {
    saveAppearance(appearance);
    const root = document.documentElement;

    root.dataset.themeEngine = THEME_ENGINE_VERSION;
    root.dataset.theme = appearance.theme;
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
    root.style.colorScheme = resolvedMode;
  }, [appearance, resolvedMode]);

  const resetAppearance = () => {
    globalThis.localStorage?.removeItem('arduino-led-controller.appearance.v2');
    setAppearance(loadAppearance());
  };

  const value = useMemo(
    () => ({ appearance, setAppearance, resetAppearance, resolvedMode }),
    [appearance, resolvedMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
}
