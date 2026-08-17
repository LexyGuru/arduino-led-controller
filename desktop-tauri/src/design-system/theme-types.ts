export type AppearanceMode =
  | 'system'
  | 'light'
  | 'dark';

export type FactoryThemeId =
  | 'arctic'
  | 'midnight'
  | 'sunset-glass'
  | 'midnight-neon'
  | 'arctic-frost'
  | 'oled-black'
  | 'amber-control'
  | 'graphite-pro'
  | 'aurora-drive'
  | 'cyber-violet'
  | 'crimson-noir'
  | 'mint-lab';

export type ThemeId = FactoryThemeId | 'custom';

export type AccentId =
  | 'blue'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'red'
  | 'teal'
  | 'amber'
  | 'lime'
  | 'indigo';

export type DensityId = 'compact' | 'comfortable' | 'touch';
export type RadiusId = 'square' | 'rounded' | 'extra-rounded';
export type MotionId = 'reduced' | 'balanced' | 'expressive';
export type GlassStrengthId = 'off' | 'soft' | 'strong';
export type GlowId = 'off' | 'soft' | 'strong';
export type MaterialId = 'solid' | 'translucent' | 'glass';
export type GradientId = 'off' | 'subtle' | 'vivid';
export type ContrastId = 'standard' | 'high';

export type VisualFxId =
  | 'none'
  | 'ambient'
  | 'scanlines'
  | 'tech-grid'
  | 'aurora-flow'
  | 'soft-pulse';

export type ThemeTokenName =
  | 'background'
  | 'backgroundArt'
  | 'surface'
  | 'surfaceRaised'
  | 'surfaceSoft'
  | 'surfaceHover'
  | 'border'
  | 'borderStrong'
  | 'text'
  | 'textSecondary'
  | 'textMuted'
  | 'shadow'
  | 'accent'
  | 'accentHover'
  | 'accentSoft'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'chart1'
  | 'chart2'
  | 'chart3'
  | 'chart4'
  | 'chart5'
  | 'chart6';

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
  material: MaterialId;
  gradient: GradientId;
  contrast: ContrastId;
  visualFx: VisualFxId;
}

export interface CustomThemeDocument {
  schemaVersion: 2;
  themeEngine: '2.0';
  name: string;
  baseTheme: FactoryThemeId;
  tokens: Partial<Record<ThemeTokenName, string>>;
}

export interface ThemeProfileDocument {
  schemaVersion: 2;
  themeEngine: '2.0';
  exportedAt: string;
  appearance: AppearanceSettings;
  customTheme?: CustomThemeDocument;
}

// Internal compatibility selector used by the already-tested CSS/runtime contract.
export const THEME_ENGINE_VERSION = '3.0';
// Canonical user-visible product identity and portable profile schema.
export const THEME_ENGINE_PRODUCT_VERSION = '2.0';
export const THEME_SCHEMA_VERSION = 2;
export const CORE_UI_VERSION = '2.0';

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
  backgroundArt: true,
  material: 'glass',
  gradient: 'subtle',
  contrast: 'standard',
  visualFx: 'ambient'
};
