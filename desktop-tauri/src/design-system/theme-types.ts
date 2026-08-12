export type AppearanceMode =
  | 'system'
  | 'light'
  | 'dark';

export type ThemeId =
  | 'arctic'
  | 'midnight'
  | 'sunset-glass'
  | 'midnight-neon'
  | 'arctic-frost'
  | 'oled-black'
  | 'amber-control';

export type AccentId =
  | 'blue'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'red';

export type DensityId =
  | 'compact'
  | 'comfortable'
  | 'touch';

export type RadiusId =
  | 'square'
  | 'rounded'
  | 'extra-rounded';

export type MotionId =
  | 'reduced'
  | 'balanced'
  | 'expressive';

export type GlassStrengthId =
  | 'off'
  | 'soft'
  | 'strong';

export type GlowId =
  | 'off'
  | 'soft'
  | 'strong';

export interface AppearanceSettings {
  mode: AppearanceMode;
  theme: ThemeId;
  accent: AccentId;
  density: DensityId;
  radius: RadiusId;
  animations: boolean;
  glass: boolean;
  motion: MotionId;
  glassStrength: GlassStrengthId;
  glow: GlowId;
  backgroundArt: boolean;
}

export const THEME_ENGINE_VERSION = '2.0';
export const CORE_UI_VERSION = '1.5';

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  mode: 'system',
  theme: 'midnight-neon',
  accent: 'cyan',
  density: 'comfortable',
  radius: 'rounded',
  animations: true,
  glass: true,
  motion: 'balanced',
  glassStrength: 'strong',
  glow: 'soft',
  backgroundArt: true
};
