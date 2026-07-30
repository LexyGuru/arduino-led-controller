import {
  Database,
  RadioTower,
  Server,
  WifiOff
} from 'lucide-react';

export type V5DataSource =
  | 'api-v2'
  | 'api-v2-cache'
  | 'legacy-direct'
  | 'legacy-fallback';

const labels:
  Record<
    V5DataSource,
    string
  > = {
    'api-v2':
      'API v2 élő adat',
    'api-v2-cache':
      'API v2 cache',
    'legacy-direct':
      'Közvetlen Tauri',
    'legacy-fallback':
      'Tauri fallback'
  };

export function V5DataSourceBadge({
  source
}: {
  source:
    V5DataSource;
}) {
  const Icon =
    source === 'api-v2'
      ? Server
      : source ===
          'api-v2-cache'
        ? Database
        : source ===
            'legacy-fallback'
          ? WifiOff
          : RadioTower;

  return (
    <span
      className={
        `v5-source-badge ${source}`
      }
    >
      <Icon size={15} />
      {labels[source]}
    </span>
  );
}
