'use strict';

const crypto =
  require('crypto');

const fs =
  require('fs');

const path =
  require('path');

const RECEIPT_SCHEMA_VERSION =
  1;

const RECEIPT_KINDS =
  Object.freeze([
    'staging-deployment',
    'rollback-rehearsal',
    'promotion-deployment'
  ]);

function sha256Buffer(
  value
) {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
}

function sha256File(
  filePath
) {
  return sha256Buffer(
    fs.readFileSync(
      filePath
    )
  );
}

function readJsonObject(
  filePath
) {
  const parsed =
    JSON.parse(
      fs.readFileSync(
        filePath,
        'utf8'
      )
    );

  if (
    !parsed ||
    typeof parsed !==
      'object' ||
    Array.isArray(parsed)
  ) {
    throw new TypeError(
      `A JSON objektum legyen: ${filePath}`
    );
  }

  return parsed;
}

function writeJsonAtomic(
  filePath,
  value,
  mode = 0o640
) {
  fs.mkdirSync(
    path.dirname(
      filePath
    ),
    {
      recursive: true
    }
  );

  const temporary =
    `${filePath}.tmp-${process.pid}-${Date.now()}`;

  fs.writeFileSync(
    temporary,
    `${JSON.stringify(
      value,
      null,
      2
    )}\n`,
    {
      mode
    }
  );

  fs.renameSync(
    temporary,
    filePath
  );
}

function commitsMatch(
  left,
  right
) {
  const a =
    String(left || '')
      .trim()
      .toLowerCase();

  const b =
    String(right || '')
      .trim()
      .toLowerCase();

  return Boolean(
    a &&
    b &&
    (
      a === b ||
      a.startsWith(b) ||
      b.startsWith(a)
    )
  );
}

function receiptFileName(
  kind
) {
  switch (kind) {
    case 'staging-deployment':
      return 'staging-deployment.json';
    case 'rollback-rehearsal':
      return 'rollback-rehearsal.json';
    case 'promotion-deployment':
      return 'promotion-deployment.json';
    default:
      throw new TypeError(
        `Ismeretlen receipt kind: ${kind}`
      );
  }
}

function normalizeEvidence(
  evidence,
  evidenceFile
) {
  if (
    !evidence ||
    typeof evidence !==
      'object'
  ) {
    throw new TypeError(
      'A receipt evidence objektuma kötelező.'
    );
  }

  if (
    evidence.targetVersion !==
      '5.0.0-alpha.2'
  ) {
    throw new TypeError(
      'A receipt evidence célverziója nem alpha.2.'
    );
  }

  if (
    ![
      'staging',
      'promotion'
    ].includes(
      evidence.phase
    )
  ) {
    throw new TypeError(
      'A receipt evidence fázisa érvénytelen.'
    );
  }

  return {
    file:
      evidenceFile,
    sha256:
      sha256File(
        evidenceFile
      ),
    evidenceSha256:
      String(
        evidence.evidenceSha256 ||
        ''
      ),
    phase:
      evidence.phase,
    commit:
      String(
        evidence.commit ||
        ''
      ),
    currentVersion:
      String(
        evidence.currentVersion ||
        ''
      ),
    targetVersion:
      evidence.targetVersion,
    gatePassed:
      evidence.gate
        ?.passed === true,
    promotionApproved:
      evidence.promotion
        ?.approved === true
  };
}

function createExecutionReceipt({
  kind,
  metadata,
  evidence,
  evidenceFile,
  status =
    'passed',
  serviceName = '',
  healthUrl = '',
  previousReceiptFile = '',
  previousRelease = '',
  currentRelease = '',
  startedAt =
    new Date()
      .toISOString(),
  finishedAt =
    new Date()
      .toISOString(),
  actor =
    'system'
}) {
  if (
    !RECEIPT_KINDS
      .includes(kind)
  ) {
    throw new TypeError(
      `Érvénytelen receipt kind: ${kind}`
    );
  }

  if (
    ![
      'passed',
      'failed'
    ].includes(
      status
    )
  ) {
    throw new TypeError(
      'A receipt status passed vagy failed legyen.'
    );
  }

  const commit =
    String(
      metadata?.commit ||
      evidence?.commit ||
      ''
    ).trim();

  if (
    !/^[a-f0-9]{7,40}$/i
      .test(commit)
  ) {
    throw new TypeError(
      'A receipt Git commit értéke érvénytelen.'
    );
  }

  const evidenceView =
    normalizeEvidence(
      evidence,
      evidenceFile
    );

  if (
    !commitsMatch(
      commit,
      evidenceView.commit
    )
  ) {
    throw new TypeError(
      'A release metadata és evidence commit eltér.'
    );
  }

  const expectedPhase =
    kind ===
      'promotion-deployment'
      ? 'promotion'
      : 'staging';

  if (
    evidenceView.phase !==
      expectedPhase
  ) {
    throw new TypeError(
      `A ${kind} receipt ${expectedPhase} evidence-et igényel.`
    );
  }

  const previousReceipt =
    previousReceiptFile
      ? {
          file:
            path.basename(
              previousReceiptFile
            ),
          sha256:
            sha256File(
              previousReceiptFile
            )
        }
      : null;

  const receipt = {
    schemaVersion:
      RECEIPT_SCHEMA_VERSION,
    kind,
    status,
    commit,
    version:
      String(
        metadata?.version ||
        evidenceView
          .currentVersion ||
        ''
      ),
    targetVersion:
      '5.0.0-alpha.2',
    serviceName:
      String(
        serviceName ||
        ''
      ),
    healthUrl:
      String(
        healthUrl ||
        ''
      ),
    previousRelease:
      String(
        previousRelease ||
        ''
      ),
    currentRelease:
      String(
        currentRelease ||
        ''
      ),
    actor:
      String(
        actor ||
        'system'
      ),
    startedAt,
    finishedAt,
    evidence:
      evidenceView,
    previousReceipt
  };

  receipt.receiptSha256 =
    sha256Buffer(
      JSON.stringify({
        ...receipt,
        receiptSha256:
          undefined
      })
    );

  return receipt;
}

function validateExecutionReceipt(
  receipt,
  {
    expectedKind = '',
    expectedCommit = '',
    expectedPreviousSha256 = '',
    maxAgeHours = 168,
    now =
      Date.now()
  } = {}
) {
  const reasons = [];

  const add = (
    code,
    message,
    details = null
  ) => {
    reasons.push({
      code,
      message,
      details
    });
  };

  if (
    Number(
      receipt
        ?.schemaVersion
    ) !==
    RECEIPT_SCHEMA_VERSION
  ) {
    add(
      'RECEIPT_SCHEMA_INVALID',
      'A receipt schemaVersion értéke érvénytelen.'
    );
  }

  if (
    !RECEIPT_KINDS
      .includes(
        receipt?.kind
      )
  ) {
    add(
      'RECEIPT_KIND_INVALID',
      'A receipt kind értéke érvénytelen.'
    );
  }

  if (
    expectedKind &&
    receipt?.kind !==
      expectedKind
  ) {
    add(
      'RECEIPT_KIND_MISMATCH',
      'A receipt típusa eltér.',
      {
        expected:
          expectedKind,
        received:
          receipt?.kind ||
          null
      }
    );
  }

  if (
    receipt?.status !==
      'passed'
  ) {
    add(
      'RECEIPT_NOT_PASSED',
      'A végrehajtási receipt nem sikeres.'
    );
  }

  if (
    receipt?.targetVersion !==
      '5.0.0-alpha.2'
  ) {
    add(
      'RECEIPT_TARGET_VERSION_INVALID',
      'A receipt célverziója nem alpha.2.'
    );
  }

  if (
    expectedCommit &&
    !commitsMatch(
      receipt?.commit,
      expectedCommit
    )
  ) {
    add(
      'RECEIPT_COMMIT_MISMATCH',
      'A receipt más commitra vonatkozik.',
      {
        expected:
          expectedCommit,
        received:
          receipt?.commit ||
          null
      }
    );
  }

  if (
    receipt?.evidence
      ?.gatePassed !== true
  ) {
    add(
      'RECEIPT_GATE_NOT_PASSED',
      'A receipt evidence nem igazol sikeres gate-et.'
    );
  }

  if (
    receipt?.kind ===
      'promotion-deployment' &&
    receipt?.evidence
      ?.promotionApproved !== true
  ) {
    add(
      'RECEIPT_PROMOTION_NOT_APPROVED',
      'A promotion receipt evidence nem jóváhagyott.'
    );
  }

  if (
    !commitsMatch(
      receipt?.commit,
      receipt?.evidence
        ?.commit
    )
  ) {
    add(
      'RECEIPT_EVIDENCE_COMMIT_MISMATCH',
      'A receipt és evidence commit eltér.'
    );
  }

  if (
    expectedPreviousSha256 &&
    receipt?.previousReceipt
      ?.sha256 !==
      expectedPreviousSha256
  ) {
    add(
      'RECEIPT_CHAIN_BROKEN',
      'A receipt előzménylánca eltér.',
      {
        expected:
          expectedPreviousSha256,
        received:
          receipt?.previousReceipt
            ?.sha256 ||
          null
      }
    );
  }

  const expectedHash =
    sha256Buffer(
      JSON.stringify({
        ...receipt,
        receiptSha256:
          undefined
      })
    );

  if (
    receipt?.receiptSha256 !==
      expectedHash
  ) {
    add(
      'RECEIPT_SELF_HASH_INVALID',
      'A receipt belső SHA-256 lenyomata eltér.'
    );
  }

  const finishedAt =
    Date.parse(
      receipt?.finishedAt
    );

  if (
    !Number.isFinite(
      finishedAt
    )
  ) {
    add(
      'RECEIPT_DATE_INVALID',
      'A receipt finishedAt mezője érvénytelen.'
    );
  } else {
    const ageHours =
      (
        now -
        finishedAt
      ) /
      3600000;

    if (
      ageHours < -0.25 ||
      ageHours >
        maxAgeHours
    ) {
      add(
        'RECEIPT_EXPIRED',
        'A receipt túl régi vagy jövőbeli.',
        {
          ageHours,
          maxAgeHours
        }
      );
    }
  }

  return {
    passed:
      reasons.length === 0,
    reasons,
    receipt
  };
}

module.exports = {
  RECEIPT_KINDS,
  RECEIPT_SCHEMA_VERSION,
  commitsMatch,
  createExecutionReceipt,
  readJsonObject,
  receiptFileName,
  sha256Buffer,
  sha256File,
  validateExecutionReceipt,
  writeJsonAtomic
};
