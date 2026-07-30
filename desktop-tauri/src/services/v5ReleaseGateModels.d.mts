export interface ReleaseGateView {
  passed: boolean;
  projectVersion: string;
  targetVersion: string;
  candidateCommit: string;
  report:
    | Record<string, unknown>
    | null;
  reasons:
    Array<
      Record<string, unknown>
    >;
  approval:
    Record<string, unknown>;
  finishedAt: string | null;
}

export interface PromotionReadinessView {
  ready: boolean;
  targetVersion: string;
  projectVersion: string;
  candidateCommit: string;
  reasons:
    Array<
      Record<string, unknown>
    >;
  approval:
    Record<string, unknown>;
  gate:
    ReleaseGateView;
  preflight:
    Record<string, unknown>
    | null;
  maintenance:
    Record<string, unknown>
    | null;
  migrations:
    Record<string, unknown>
    | null;
  generatedAt: string | null;
}

export function normalizeReleaseGate(
  value: unknown
): ReleaseGateView;

export function normalizePromotionReadiness(
  value: unknown
): PromotionReadinessView;
