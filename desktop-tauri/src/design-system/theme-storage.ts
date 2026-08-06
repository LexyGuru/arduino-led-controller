import {
  DEFAULT_APPEARANCE,
  type AccentId,
  type AppearanceMode,
  type AppearanceSettings,
  type DensityId,
  type RadiusId,
  type ThemeId
} from './theme-types';

const STORAGE_KEY =
  'arduino-led-controller.appearance.v1';

const MODES: AppearanceMode[] = [
  'system',
  'light',
  'dark'
];

const THEMES: ThemeId[] = [
  'arctic',
  'midnight'
];

const ACCENTS: AccentId[] = [
  'blue',
  'cyan',
  'green',
  'purple',
  'pink',
  'orange',
  'red'
];

const DENSITIES: DensityId[] = [
  'compact',
  'comfortable',
  'touch'
];

const RADII: RadiusId[] = [
  'square',
  'rounded',
  'extra-rounded'
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
    value &&
    typeof value === 'object'
      ? value as Partial<AppearanceSettings>
      : {};

  return {
    mode: allowed(
      MODES,
      source.mode,
      DEFAULT_APPEARANCE.mode
    ),
    theme: allowed(
      THEMES,
      source.theme,
      DEFAULT_APPEARANCE.theme
    ),
    accent: allowed(
      ACCENTS,
      source.accent,
      DEFAULT_APPEARANCE.accent
    ),
    density: allowed(
      DENSITIES,
      source.density,
      DEFAULT_APPEARANCE.density
    ),
    radius: allowed(
      RADII,
      source.radius,
      DEFAULT_APPEARANCE.radius
    ),
    animations:
      typeof source.animations === 'boolean'
        ? source.animations
        : DEFAULT_APPEARANCE.animations,
    glass:
      typeof source.glass === 'boolean'
        ? source.glass
        : DEFAULT_APPEARANCE.glass
  };
}

export function loadAppearance():
  AppearanceSettings {
  try {
    const raw =
      globalThis.localStorage
        ?.getItem(STORAGE_KEY);

    return raw
      ? normalizeAppearance(
          JSON.parse(raw)
        )
      : DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(
  settings: AppearanceSettings
) {
  globalThis.localStorage
    ?.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );
}
