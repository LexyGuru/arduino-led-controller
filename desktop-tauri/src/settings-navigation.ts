export type SettingsTarget = 'general' | 'connection' | 'updates' | 'hardware';

export const SETTINGS_TARGETS: readonly SettingsTarget[] = [
  'general',
  'connection',
  'updates',
  'hardware'
] as const;
