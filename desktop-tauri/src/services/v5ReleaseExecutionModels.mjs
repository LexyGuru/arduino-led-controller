import {
  unwrapApiPayload
} from '../api/ui/api-payload.mjs';

function normalizeReceipt(
  value
) {
  const entry =
    value &&
    typeof value ===
      'object'
      ? value
      : {};

  const data =
    entry.data &&
    typeof entry.data ===
      'object'
      ? entry.data
      : null;

  return {
    present:
      entry.present ===
        true,
    file:
      entry.file ||
      '',
    sha256:
      entry.sha256 ||
      '',
    kind:
      data?.kind ||
      '',
    status:
      data?.status ||
      '',
    commit:
      data?.commit ||
      '',
    finishedAt:
      data?.finishedAt ||
      null,
    evidencePhase:
      data?.evidence
        ?.phase ||
      '',
    receiptSha256:
      data?.receiptSha256 ||
      ''
  };
}

export function normalizeExecutionReceipts(
  value
) {
  const payload =
    unwrapApiPayload(value) ||
    {};

  return {
    staging:
      normalizeReceipt(
        payload.staging
      ),
    rollback:
      normalizeReceipt(
        payload.rollback
      ),
    promotion:
      normalizeReceipt(
        payload.promotion
      ),
    approval:
      payload.approval || {
        present: false
      }
  };
}

export function normalizeFinalizationReadiness(
  value
) {
  const payload =
    unwrapApiPayload(value) ||
    {};

  return {
    ready:
      payload.ready === true,
    projectVersion:
      payload.projectVersion ||
      '',
    targetVersion:
      payload.targetVersion ||
      '5.0.0-alpha.2',
    candidateCommit:
      payload.candidateCommit ||
      '',
    confirmation:
      payload.confirmation ||
      'FINALIZE_ALPHA2_VERSION_SYNC',
    reasons:
      Array.isArray(
        payload.reasons
      )
        ? payload.reasons
        : [],
    receipts:
      normalizeExecutionReceipts(
        payload.receipts
      ),
    approval:
      payload.approval || {
        present: false
      },
    generatedAt:
      payload.generatedAt ||
      null
  };
}
