import type { ThemeId } from './theme-types';

export interface ThemeDefinition {
  id: ThemeId;
  nameKey: string;
  descriptionKey: string;
  legacy?: boolean;
}

export const THEME_CATALOG: readonly ThemeDefinition[] = [
  {
    id: 'sunset-glass',
    nameKey: 'appearance.theme.sunset-glass',
    descriptionKey: 'appearance.themeDescription.sunset-glass'
  },
  {
    id: 'midnight-neon',
    nameKey: 'appearance.theme.midnight-neon',
    descriptionKey: 'appearance.themeDescription.midnight-neon'
  },
  {
    id: 'arctic-frost',
    nameKey: 'appearance.theme.arctic-frost',
    descriptionKey: 'appearance.themeDescription.arctic-frost'
  },
  {
    id: 'oled-black',
    nameKey: 'appearance.theme.oled-black',
    descriptionKey: 'appearance.themeDescription.oled-black'
  },
  {
    id: 'amber-control',
    nameKey: 'appearance.theme.amber-control',
    descriptionKey: 'appearance.themeDescription.amber-control'
  },
  {
    id: 'midnight',
    nameKey: 'appearance.theme.midnight',
    descriptionKey: 'appearance.themeDescription.midnight',
    legacy: true
  },
  {
    id: 'arctic',
    nameKey: 'appearance.theme.arctic',
    descriptionKey: 'appearance.themeDescription.arctic',
    legacy: true
  }
] as const;
