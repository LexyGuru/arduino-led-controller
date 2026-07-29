import {
  unwrapApiPayload
} from '../api/ui/api-payload.mjs';

export function normalizeReleaseGate(
  value
) {
  const payload =
    unwrapApiPayload(value) ||
    {};

  return {
    passed:
      payload.passed === true,
    projectVersion:
      payload.projectVersion ||
      '',
    targetVersion:
      payload.targetVersion ||
      '5.0.0-alpha.2',
    candidateCommit:
      payload.candidateCommit ||
      payload.expectedCommit ||
      '',
    report:
      payload.report ||
      null,
    reasons:
      Array.isArray(
        payload.reasons
      )
        ? payload.reasons
        : [],
    approval:
      payload.approval || {
        present: false
      },
    finishedAt:
      payload.finishedAt ||
      null
  };
}

export function normalizePromotionReadiness(
  value
) {
  const payload =
    unwrapApiPayload(value) ||
    {};

  return {
    ready:
      payload.ready === true,
    targetVersion:
      payload.targetVersion ||
      '5.0.0-alpha.2',
    projectVersion:
      payload.projectVersion ||
      '',
    candidateCommit:
      payload.candidateCommit ||
      '',
    reasons:
      Array.isArray(
        payload.reasons
      )
        ? payload.reasons
        : [],
    approval:
      payload.approval || {
        present: false
      },
    gate:
      normalizeReleaseGate(
        payload.gate
      ),
    preflight:
      payload.preflight ||
      null,
    maintenance:
      payload.maintenance ||
      null,
    migrations:
      payload.migrations ||
      null,
    generatedAt:
      payload.generatedAt ||
      null
  };
}
