export type AppearanceMode =
  | 'system'
  | 'light'
  | 'dark';

export type ThemeId =
  | 'arctic'
  | 'midnight';

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

export interface AppearanceSettings {
  mode: AppearanceMode;
  theme: ThemeId;
  accent: AccentId;
  density: DensityId;
  radius: RadiusId;
  animations: boolean;
  glass: boolean;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  mode: 'system',
  theme: 'midnight',
  accent: 'cyan',
  density: 'comfortable',
  radius: 'rounded',
  animations: true,
  glass: true
};
