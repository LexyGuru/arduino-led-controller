import type {
  ArduinoStatus,
  LedSchedule,
  NetworkLog
} from '../types';
import type {
  TauriAuditEntry,
  TauriAuditLevel
} from '../services/tauriAudit';

export interface DashboardStatistics {
  enabledStrips: number;
  stripCount: number;
  averageBrightness: number;
  activeEffects: number;
  scheduleCount: number;
  scheduleDays: Array<{ day: number; count: number }>;
  httpRequests: number | null;
  httpTimeouts: number | null;
  httpTimeoutFreePercent: number | null;
  auditCount: number;
  auditErrors: number;
  networkCount: number;
  networkErrors: number;
  sourceCounts: Array<{ source: string; count: number }>;
  levelCounts: Array<{ level: TauriAuditLevel; count: number }>;
}

export function buildDashboardStatistics(
  status: ArduinoStatus | null,
  schedules: LedSchedule[],
  audit: TauriAuditEntry[],
  network: NetworkLog[]
): DashboardStatistics {
  const strips = status?.strips ?? [];
  const enabled = strips.filter((strip) => strip.enabled);
  const averageBrightness = enabled.length
    ? Math.round(
        enabled.reduce((sum, strip) => sum + strip.brightness, 0) /
          enabled.length
      )
    : 0;

  const scheduleDays = Array.from({ length: 7 }, (_, index) => ({
    day: index + 1,
    count: schedules.filter((item) => item.day === index + 1).length
  }));

  const requests = status?.http?.requests;
  const timeouts = status?.http?.timeouts;
  const timeoutFreePercent =
    requests != null && requests > 0 && timeouts != null
      ? Math.max(0, Math.min(100, Math.round(((requests - timeouts) / requests) * 100)))
      : null;

  const sourceMap = new Map<string, number>();
  for (const entry of audit) {
    sourceMap.set(entry.source, (sourceMap.get(entry.source) ?? 0) + 1);
  }

  const levels: TauriAuditLevel[] = ['info', 'action', 'success', 'warning', 'error'];

  return {
    enabledStrips: enabled.length,
    stripCount: strips.length,
    averageBrightness,
    activeEffects: new Set(enabled.map((strip) => strip.effect)).size,
    scheduleCount: schedules.length,
    scheduleDays,
    httpRequests: requests ?? null,
    httpTimeouts: timeouts ?? null,
    httpTimeoutFreePercent: timeoutFreePercent,
    auditCount: audit.length,
    auditErrors: audit.filter((entry) => entry.level === 'error').length,
    networkCount: network.length,
    networkErrors: network.filter((entry) => !entry.ok).length,
    sourceCounts: [...sourceMap.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    levelCounts: levels.map((level) => ({
      level,
      count: audit.filter((entry) => entry.level === level).length
    }))
  };
}

export function percent(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}
