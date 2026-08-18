import {
  Database,
  RadioTower,
  Server,
  WifiOff
} from 'lucide-react';

import { useI18n } from '../../i18n';

export type V5DataSource =
  | 'api-v2'
  | 'api-v2-cache'
  | 'legacy-direct'
  | 'legacy-fallback';

const labelKeys:
  Record<
    V5DataSource,
    string
  > = {
    'api-v2':
      'logs.sourceBadge.apiV2Live',
    'api-v2-cache':
      'logs.sourceBadge.apiV2Cache',
    'legacy-direct':
      'logs.sourceBadge.directTauri',
    'legacy-fallback':
      'logs.sourceBadge.tauriFallback'
  };

export function V5DataSourceBadge({
  source
}: {
  source:
    V5DataSource;
}) {
  const { t } = useI18n();
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
      {t(labelKeys[source])}
    </span>
  );
}
