import {
  DEFAULT_APPEARANCE,
  type AccentId,
  type AppearanceMode,
  type AppearanceSettings,
  type DensityId,
  type GlassStrengthId,
  type GlowId,
  type MotionId,
  type RadiusId,
  type ThemeId
} from './theme-types';

const STORAGE_KEY_V2 =
  'arduino-led-controller.appearance.v2';
const STORAGE_KEY_V1 =
  'arduino-led-controller.appearance.v1';

const MODES: AppearanceMode[] = [
  'system', 'light', 'dark'
];
const THEMES: ThemeId[] = [
  'arctic', 'midnight', 'sunset-glass',
  'midnight-neon', 'arctic-frost', 'oled-black',
  'amber-control'
];
const ACCENTS: AccentId[] = [
  'blue', 'cyan', 'green', 'purple',
  'pink', 'orange', 'red'
];
const DENSITIES: DensityId[] = [
  'compact', 'comfortable', 'touch'
];
const RADII: RadiusId[] = [
  'square', 'rounded', 'extra-rounded'
];
const MOTIONS: MotionId[] = [
  'reduced', 'balanced', 'expressive'
];
const GLASS_STRENGTHS: GlassStrengthId[] = [
  'off', 'soft', 'strong'
];
const GLOWS: GlowId[] = [
  'off', 'soft', 'strong'
];

function allowed<T extends string>(
  values: readonly T[],
  value: unknown,
  fallback: T
): T {
  return typeof value === 'string' &&
    values.includes(value as T)
    ? value as T
    : fallback;
}

export function normalizeAppearance(
  value: unknown
): AppearanceSettings {
  const source =
    value && typeof value === 'object'
      ? value as Partial<AppearanceSettings>
      : {};

  const legacyGlass =
    typeof source.glass === 'boolean'
      ? source.glass
      : DEFAULT_APPEARANCE.glass;

  return {
    mode: allowed(MODES, source.mode, DEFAULT_APPEARANCE.mode),
    theme: allowed(THEMES, source.theme, DEFAULT_APPEARANCE.theme),
    accent: allowed(ACCENTS, source.accent, DEFAULT_APPEARANCE.accent),
    density: allowed(DENSITIES, source.density, DEFAULT_APPEARANCE.density),
    radius: allowed(RADII, source.radius, DEFAULT_APPEARANCE.radius),
    animations:
      typeof source.animations === 'boolean'
        ? source.animations
        : DEFAULT_APPEARANCE.animations,
    glass: legacyGlass,
    motion: allowed(MOTIONS, source.motion, DEFAULT_APPEARANCE.motion),
    glassStrength: allowed(
      GLASS_STRENGTHS,
      source.glassStrength,
      legacyGlass ? DEFAULT_APPEARANCE.glassStrength : 'off'
    ),
    glow: allowed(GLOWS, source.glow, DEFAULT_APPEARANCE.glow),
    backgroundArt:
      typeof source.backgroundArt === 'boolean'
        ? source.backgroundArt
        : DEFAULT_APPEARANCE.backgroundArt
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

export function loadAppearance(): AppearanceSettings {
  const v2 = readStorage(STORAGE_KEY_V2);
  if (v2) {
    return normalizeAppearance(v2);
  }

  const legacy = readStorage(STORAGE_KEY_V1);
  if (legacy) {
    const migrated = normalizeAppearance(legacy);
    saveAppearance(migrated);
    return migrated;
  }

  return DEFAULT_APPEARANCE;
}

export function saveAppearance(
  settings: AppearanceSettings
) {
  globalThis.localStorage?.setItem(
    STORAGE_KEY_V2,
    JSON.stringify(settings)
  );
}
