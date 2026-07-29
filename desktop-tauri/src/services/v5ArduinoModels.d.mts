import type {
  ArduinoStatus
} from '../types';

export type DashboardDataSource =
  | 'api-v2'
  | 'api-v2-cache'
  | 'legacy-direct'
  | 'legacy-fallback';

export function normalizeArduinoStatus(
  value: unknown,
  fallback?: ArduinoStatus | null
): ArduinoStatus & {
  latencyMs?: number;
};

export function dashboardDataSource(
  options?: {
    authenticated?: boolean;
    online?: boolean;
    responseSource?:
      'network' |
      'cache' |
      string;
    error?: unknown;
  }
): DashboardDataSource;
