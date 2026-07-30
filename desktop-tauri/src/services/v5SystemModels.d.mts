export interface V5ReleaseView {
  service: string;
  version: string;
  environment: string;
  lifecycle: string;
  maintenance: boolean;
  migrationPending: number;
  channel: string;
  candidate: string;
  commit: string;
  builtAt: string;
  openApiSha256: string;
}

export interface V5PreflightView {
  ready: boolean;
  checks: Array<
    Record<string, unknown>
  >;
  summary: {
    total: number;
    passed: number;
    blocking: number;
    warnings: number;
  };
}

export interface V5MaintenanceView {
  enabled: boolean;
  reason: string | null;
  enabledAt: string | null;
  enabledBy: string | null;
}

export interface V5SnapshotView {
  id: string;
  label: string;
  createdAt: string | null;
  createdBy: string | null;
  files: number;
}

export interface V5MigrationsView {
  pending: number;
  migrations: Array<
    Record<string, unknown>
  >;
}

export function normalizeRelease(
  value: unknown
): V5ReleaseView;

export function normalizePreflight(
  value: unknown
): V5PreflightView;

export function normalizeMaintenance(
  value: unknown
): V5MaintenanceView;

export function normalizeSnapshots(
  value: unknown
): V5SnapshotView[];

export function normalizeMigrations(
  value: unknown
): V5MigrationsView;

export function formatDateTime(
  value: unknown
): string;
