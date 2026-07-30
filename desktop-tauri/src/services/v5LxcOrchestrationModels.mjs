import {
  unwrapApiPayload
} from '../api/ui/api-payload.mjs';

const phaseOrder = [
  'preflight',
  'gate',
  'staging-bundle',
  'staging-deployment',
  'rollback-rehearsal',
  'promotion-bundle',
  'promotion-deployment',
  'receipt-verification',
  'artifact-collection'
];

export function normalizeLxcOrchestration(
  value
) {
  const payload =
    unwrapApiPayload(value) ||
    {};

  const state =
    payload.state &&
    typeof payload.state ===
      'object'
      ? payload.state
      : {};

  const phases =
    phaseOrder.map(
      (name) => ({
        name,
        status:
          state.phases
            ?.[name]
            ?.status ||
          'pending',
        message:
          state.phases
            ?.[name]
            ?.message ||
          '',
        startedAt:
          state.phases
            ?.[name]
            ?.startedAt ||
          null,
        finishedAt:
          state.phases
            ?.[name]
            ?.finishedAt ||
          null
      })
    );

  return {
    present:
      payload.present ===
        true,
    status:
      state.status ||
      'not-started',
    currentPhase:
      state.currentPhase ||
      '',
    candidateRef:
      state.candidateRef ||
      '',
    candidateCommit:
      state.candidateCommit ||
      '',
    baselineBranch:
      state.baselineBranch ||
      '',
    baselineCommit:
      state.baselineCommit ||
      '',
    readyForPromotion:
      payload.readyForPromotion ===
        true,
    readyForFinalization:
      payload.readyForFinalization ===
        true,
    guardPassed:
      payload.guardPassed ===
        true,
    phases,
    lastError:
      state.lastError ||
      null,
    artifacts:
      payload.artifacts ||
      {
        present: false
      },
    generatedAt:
      payload.generatedAt ||
      null
  };
}
