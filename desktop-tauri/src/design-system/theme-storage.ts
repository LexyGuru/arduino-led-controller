import {
  DEFAULT_APPEARANCE,
  type AccentId,
  type AppearanceMode,
  type AppearanceSettings,
  type ContrastId,
  type CustomThemeDocument,
  type DensityId,
  type FactoryThemeId,
  type GlassStrengthId,
  type GlowId,
  type GradientId,
  type MaterialId,
  type MotionId,
  type RadiusId,
  type ThemeId,
  type ThemeProfileDocument,
  type ThemeTokenName,
  type VisualFxId
} from './theme-types';
import { validateThemeContrast } from './theme-contrast';

const STORAGE_KEY_V3 = 'arduino-led-controller.appearance.v3';
const STORAGE_KEY_V2 = 'arduino-led-controller.appearance.v2';
const STORAGE_KEY_V1 = 'arduino-led-controller.appearance.v1';
const CUSTOM_THEME_KEY = 'arduino-led-controller.custom-theme.v1';

const MODES: AppearanceMode[] = ['system', 'light', 'dark'];
const FACTORY_THEMES: FactoryThemeId[] = [
  'arctic', 'midnight', 'sunset-glass', 'midnight-neon',
  'arctic-frost', 'oled-black', 'amber-control', 'graphite-pro',
  'aurora-drive', 'cyber-violet', 'crimson-noir', 'mint-lab'
];
const THEMES: ThemeId[] = [...FACTORY_THEMES, 'custom'];
const ACCENTS: AccentId[] = [
  'blue', 'cyan', 'green', 'purple', 'pink', 'orange', 'red',
  'teal', 'amber', 'lime', 'indigo'
];
const DENSITIES: DensityId[] = ['compact', 'comfortable', 'touch'];
const RADII: RadiusId[] = ['square', 'rounded', 'extra-rounded'];
const MOTIONS: MotionId[] = ['reduced', 'balanced', 'expressive'];
const GLASS_STRENGTHS: GlassStrengthId[] = ['off', 'soft', 'strong'];
const GLOWS: GlowId[] = ['off', 'soft', 'strong'];
const MATERIALS: MaterialId[] = ['solid', 'translucent', 'glass'];
const GRADIENTS: GradientId[] = ['off', 'subtle', 'vivid'];
const CONTRASTS: ContrastId[] = ['standard', 'high'];
const VISUAL_FX: VisualFxId[] = [
  'none',
  'ambient',
  'scanlines',
  'tech-grid',
  'aurora-flow',
  'soft-pulse'
];

export const CUSTOM_THEME_TOKEN_MAP: Record<ThemeTokenName, string> = {
  background: '--ds-background',
  backgroundArt: '--ds-background-art',
  surface: '--ds-surface',
  surfaceRaised: '--ds-surface-raised',
  surfaceSoft: '--ds-surface-soft',
  surfaceHover: '--ds-surface-hover',
  border: '--ds-border',
  borderStrong: '--ds-border-strong',
  text: '--ds-text',
  textSecondary: '--ds-text-secondary',
  textMuted: '--ds-text-muted',
  shadow: '--ds-shadow',
  accent: '--ds-accent',
  accentHover: '--ds-accent-hover',
  accentSoft: '--ds-accent-soft',
  success: '--ds-success',
  info: '--ds-info',
  warning: '--ds-warning',
  error: '--ds-error',
  chart1: '--ds-chart-1',
  chart2: '--ds-chart-2',
  chart3: '--ds-chart-3',
  chart4: '--ds-chart-4',
  chart5: '--ds-chart-5',
  chart6: '--ds-chart-6'
};

function allowed<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
}

export function normalizeAppearance(value: unknown): AppearanceSettings {
  const source = value && typeof value === 'object'
    ? value as Partial<AppearanceSettings>
    : {};
  const legacyGlass = typeof source.glass === 'boolean'
    ? source.glass
    : DEFAULT_APPEARANCE.glass;
  const glassStrength = allowed(
    GLASS_STRENGTHS,
    source.glassStrength,
    legacyGlass ? DEFAULT_APPEARANCE.glassStrength : 'off'
  );
  return {
    mode: allowed(MODES, source.mode, DEFAULT_APPEARANCE.mode),
    theme: allowed(THEMES, source.theme, DEFAULT_APPEARANCE.theme),
    accent: allowed(ACCENTS, source.accent, DEFAULT_APPEARANCE.accent),
    density: allowed(DENSITIES, source.density, DEFAULT_APPEARANCE.density),
    radius: allowed(RADII, source.radius, DEFAULT_APPEARANCE.radius),
    animations: typeof source.animations === 'boolean' ? source.animations : DEFAULT_APPEARANCE.animations,
    glass: glassStrength !== 'off',
    motion: allowed(MOTIONS, source.motion, DEFAULT_APPEARANCE.motion),
    glassStrength,
    glow: allowed(GLOWS, source.glow, DEFAULT_APPEARANCE.glow),
    backgroundArt: typeof source.backgroundArt === 'boolean' ? source.backgroundArt : DEFAULT_APPEARANCE.backgroundArt,
    material: allowed(MATERIALS, source.material, glassStrength === 'off' ? 'solid' : DEFAULT_APPEARANCE.material),
    gradient: allowed(GRADIENTS, source.gradient, DEFAULT_APPEARANCE.gradient),
    contrast: allowed(CONTRASTS, source.contrast, DEFAULT_APPEARANCE.contrast),
    visualFx: allowed(VISUAL_FX, source.visualFx, DEFAULT_APPEARANCE.visualFx)
  };
}

function readStorage(key: string): unknown | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeTokenValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 220) return null;
  if (/[;{}<>]/.test(candidate)) return null;
  if (/url\s*\(|@import|expression\s*\(|javascript:/i.test(candidate)) return null;
  return candidate;
}

export function normalizeCustomTheme(value: unknown): CustomThemeDocument | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<CustomThemeDocument>;
  const sourceRecord =
    source as unknown as Record<string, unknown>;
  const legacyThemeEngine3 =
    sourceRecord.schemaVersion === 1 &&
    sourceRecord.themeEngine === '3.0';
  const currentThemeEngine2 =
    sourceRecord.schemaVersion === 2 &&
    sourceRecord.themeEngine === '2.0';
  if (!legacyThemeEngine3 && !currentThemeEngine2) return null;
  const name = typeof source.name === 'string' ? source.name.trim().slice(0, 64) : '';
  if (!name) return null;
  const baseTheme = allowed(FACTORY_THEMES, source.baseTheme, DEFAULT_APPEARANCE.theme as FactoryThemeId);
  const rawTokens = source.tokens && typeof source.tokens === 'object' ? source.tokens : {};
  const tokens: Partial<Record<ThemeTokenName, string>> = {};
  for (const key of Object.keys(CUSTOM_THEME_TOKEN_MAP) as ThemeTokenName[]) {
    const safe = safeTokenValue((rawTokens as Partial<Record<ThemeTokenName, unknown>>)[key]);
    if (safe !== null) tokens[key] = safe;
  }
  const contrast = validateThemeContrast(tokens);
  if (!contrast.valid) throw new Error(contrast.message);
  return { schemaVersion: 2, themeEngine: '2.0', name, baseTheme, tokens };
}

export function loadAppearance(): AppearanceSettings {
  const v3 = readStorage(STORAGE_KEY_V3);
  if (v3) return normalizeAppearance(v3);
  const v2 = readStorage(STORAGE_KEY_V2);
  if (v2) {
    const migrated = normalizeAppearance(v2);
    saveAppearance(migrated);
    return migrated;
  }
  const v1 = readStorage(STORAGE_KEY_V1);
  if (v1) {
    const migrated = normalizeAppearance(v1);
    saveAppearance(migrated);
    return migrated;
  }
  return DEFAULT_APPEARANCE;
}

export function saveAppearance(settings: AppearanceSettings) {
  globalThis.localStorage?.setItem(STORAGE_KEY_V3, JSON.stringify(normalizeAppearance(settings)));
}

export function loadCustomTheme(): CustomThemeDocument | null {
  try {
    return normalizeCustomTheme(readStorage(CUSTOM_THEME_KEY));
  } catch {
    return null;
  }
}

export function saveCustomTheme(theme: CustomThemeDocument) {
  const normalized = normalizeCustomTheme(theme);
  if (!normalized) throw new Error('Invalid Theme Engine 3.0 custom theme.');
  globalThis.localStorage?.setItem(CUSTOM_THEME_KEY, JSON.stringify(normalized));
}

export function clearCustomThemeStorage() {
  globalThis.localStorage?.removeItem(CUSTOM_THEME_KEY);
}

export function clearAppearanceStorage() {
  globalThis.localStorage?.removeItem(STORAGE_KEY_V3);
  globalThis.localStorage?.removeItem(STORAGE_KEY_V2);
  globalThis.localStorage?.removeItem(STORAGE_KEY_V1);
}

export function createProfileDocument(
  appearance: AppearanceSettings,
  customTheme: CustomThemeDocument | null
): ThemeProfileDocument {
  return {
    schemaVersion: 2,
    themeEngine: '2.0',
    exportedAt: new Date().toISOString(),
    appearance: normalizeAppearance(appearance),
    ...(customTheme ? { customTheme } : {})
  };
}

export function parseProfileDocument(text: string): ThemeProfileDocument {
  const raw = JSON.parse(text) as Partial<ThemeProfileDocument>;
  const rawRecord =
    raw as unknown as Record<string, unknown>;
  const legacyThemeEngine3 =
    rawRecord.schemaVersion === 1 &&
    rawRecord.themeEngine === '3.0';
  const currentThemeEngine2 =
    rawRecord.schemaVersion === 2 &&
    rawRecord.themeEngine === '2.0';
  if (!legacyThemeEngine3 && !currentThemeEngine2) {
    throw new Error('Unsupported Theme Engine profile schema.');
  }
  const customTheme = raw.customTheme ? normalizeCustomTheme(raw.customTheme) : null;
  const appearance = normalizeAppearance(raw.appearance);
  if (appearance.theme === 'custom' && !customTheme) {
    appearance.theme = DEFAULT_APPEARANCE.theme;
  }
  return {
    schemaVersion: 2,
    themeEngine: '2.0',
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    appearance,
    ...(customTheme ? { customTheme } : {})
  };
}
