export interface LxcOrchestrationPhase {
  name: string;
  status: string;
  message: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface LxcOrchestrationView {
  present: boolean;
  status: string;
  currentPhase: string;
  candidateRef: string;
  candidateCommit: string;
  baselineBranch: string;
  baselineCommit: string;
  readyForPromotion: boolean;
  readyForFinalization: boolean;
  guardPassed: boolean;
  phases:
    LxcOrchestrationPhase[];
  lastError:
    Record<string, unknown> |
    null;
  artifacts:
    Record<string, unknown>;
  generatedAt: string | null;
}

export function normalizeLxcOrchestration(
  value: unknown
): LxcOrchestrationView;
