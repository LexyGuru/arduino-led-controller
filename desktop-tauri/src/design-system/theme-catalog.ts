import type { ThemeId } from './theme-types';

export interface ThemeDefinition {
  id: ThemeId;
  nameKey: string;
  descriptionKey: string;
  legacy?: boolean;
  custom?: boolean;
  tone: 'cool' | 'warm' | 'neutral' | 'vivid';
}

export const THEME_CATALOG: readonly ThemeDefinition[] = [
  { id: 'midnight-neon', nameKey: 'appearance.theme.midnight-neon', descriptionKey: 'appearance.themeDescription.midnight-neon', tone: 'cool' },
  { id: 'graphite-pro', nameKey: 'appearance.theme.graphite-pro', descriptionKey: 'appearance.themeDescription.graphite-pro', tone: 'neutral' },
  { id: 'aurora-drive', nameKey: 'appearance.theme.aurora-drive', descriptionKey: 'appearance.themeDescription.aurora-drive', tone: 'vivid' },
  { id: 'cyber-violet', nameKey: 'appearance.theme.cyber-violet', descriptionKey: 'appearance.themeDescription.cyber-violet', tone: 'vivid' },
  { id: 'crimson-noir', nameKey: 'appearance.theme.crimson-noir', descriptionKey: 'appearance.themeDescription.crimson-noir', tone: 'warm' },
  { id: 'mint-lab', nameKey: 'appearance.theme.mint-lab', descriptionKey: 'appearance.themeDescription.mint-lab', tone: 'cool' },
  { id: 'sunset-glass', nameKey: 'appearance.theme.sunset-glass', descriptionKey: 'appearance.themeDescription.sunset-glass', tone: 'warm' },
  { id: 'arctic-frost', nameKey: 'appearance.theme.arctic-frost', descriptionKey: 'appearance.themeDescription.arctic-frost', tone: 'cool' },
  { id: 'oled-black', nameKey: 'appearance.theme.oled-black', descriptionKey: 'appearance.themeDescription.oled-black', tone: 'neutral' },
  { id: 'amber-control', nameKey: 'appearance.theme.amber-control', descriptionKey: 'appearance.themeDescription.amber-control', tone: 'warm' },
  { id: 'midnight', nameKey: 'appearance.theme.midnight', descriptionKey: 'appearance.themeDescription.midnight', legacy: true, tone: 'neutral' },
  { id: 'arctic', nameKey: 'appearance.theme.arctic', descriptionKey: 'appearance.themeDescription.arctic', legacy: true, tone: 'cool' },
  { id: 'custom', nameKey: 'appearance.theme.custom', descriptionKey: 'appearance.themeDescription.custom', custom: true, tone: 'vivid' }
] as const;
