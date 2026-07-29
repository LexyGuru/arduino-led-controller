export interface ExecutionReceiptView {
  present: boolean;
  file: string;
  sha256: string;
  kind: string;
  status: string;
  commit: string;
  finishedAt: string | null;
  evidencePhase: string;
  receiptSha256: string;
}

export interface ExecutionReceiptsView {
  staging:
    ExecutionReceiptView;
  rollback:
    ExecutionReceiptView;
  promotion:
    ExecutionReceiptView;
  approval:
    Record<string, unknown>;
}

export interface FinalizationReadinessView {
  ready: boolean;
  projectVersion: string;
  targetVersion: string;
  candidateCommit: string;
  confirmation: string;
  reasons:
    Array<
      Record<string, unknown>
    >;
  receipts:
    ExecutionReceiptsView;
  approval:
    Record<string, unknown>;
  generatedAt: string | null;
}

export function normalizeExecutionReceipts(
  value: unknown
): ExecutionReceiptsView;

export function normalizeFinalizationReadiness(
  value: unknown
): FinalizationReadinessView;
