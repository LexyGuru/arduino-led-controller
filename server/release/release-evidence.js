'use strict';

const crypto =
  require('crypto');

const fs =
  require('fs');

const path =
  require('path');

const {
  commitsMatch,
  readGateReport,
  sha256File,
  validateGateReport
} =
  require(
    './release-gate-report'
  );

const EVIDENCE_SCHEMA_VERSION =
  1;

const TARGET_VERSION =
  '5.0.0-alpha.2';

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
      `A JSON fájl objektum legyen: ${filePath}`
    );
  }

  return parsed;
}

function writeJsonAtomic(
  filePath,
  value,
  mode = 0o640
) {
  const directory =
    path.dirname(
      filePath
    );

  fs.mkdirSync(
    directory,
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

function hashObject(
  value
) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify(value)
    )
    .digest('hex');
}

function validateApproval(
  approval,
  {
    expectedCommit,
    targetVersion =
      TARGET_VERSION
  } = {}
) {
  const reasons = [];

  if (
    approval?.approved !==
      true
  ) {
    reasons.push({
      code:
        'PROMOTION_NOT_APPROVED',
      message:
        'A promóció nincs jóváhagyva.'
    });
  }

  if (
    String(
      approval?.targetVersion ||
      ''
    ) !==
    targetVersion
  ) {
    reasons.push({
      code:
        'PROMOTION_TARGET_VERSION_MISMATCH',
      message:
        'A promóciós jóváhagyás célverziója eltér.',
      details: {
        expected:
          targetVersion,
        received:
          approval?.targetVersion ||
          null
      }
    });
  }

  if (
    expectedCommit &&
    !commitsMatch(
      approval?.commit,
      expectedCommit
    )
  ) {
    reasons.push({
      code:
        'PROMOTION_COMMIT_MISMATCH',
      message:
        'A promóciós jóváhagyás más commitra vonatkozik.',
      details: {
        expected:
          expectedCommit,
        received:
          approval?.commit ||
          null
      }
    });
  }

  return {
    passed:
      reasons.length === 0,
    reasons
  };
}

function artifactDescriptor(
  evidenceDirectory,
  fileName
) {
  const filePath =
    path.join(
      evidenceDirectory,
      fileName
    );

  if (
    !fs.existsSync(
      filePath
    )
  ) {
    throw new Error(
      `Hiányzó evidence fájl: ${fileName}`
    );
  }

  const stats =
    fs.statSync(
      filePath
    );

  return {
    file:
      fileName,
    bytes:
      stats.size,
    sha256:
      sha256File(
        filePath
      )
  };
}

function buildReleaseEvidence({
  root,
  evidenceDirectory,
  gateReportFile,
  approvalFile = null,
  phase =
    'staging',
  commit,
  generatedAt =
    new Date()
      .toISOString(),
  maxGateAgeHours = 72
}) {
  const packageData =
    readJsonObject(
      path.join(
        root,
        'package.json'
      )
    );

  const resolvedCommit =
    String(
      commit ||
      ''
    ).trim();

  if (
    !/^[a-f0-9]{7,40}$/i
      .test(resolvedCommit)
  ) {
    throw new TypeError(
      'Érvényes Git commit szükséges az evidence-hez.'
    );
  }

  const gateReport =
    readGateReport(
      gateReportFile
    );

  const gateValidation =
    validateGateReport(
      gateReport,
      {
        expectedCommit:
          resolvedCommit,
        maxAgeHours:
          maxGateAgeHours,
        now:
          Date.parse(
            generatedAt
          )
      }
    );

  if (
    !gateValidation.passed
  ) {
    const error =
      new Error(
        'A release-gate jelentés nem érvényes.'
      );

    error.code =
      'RELEASE_GATE_INVALID';

    error.details =
      gateValidation;

    throw error;
  }

  let approval =
    null;

  let approvalValidation = {
    passed:
      phase !==
      'promotion',
    reasons: []
  };

  if (approvalFile) {
    approval =
      readJsonObject(
        approvalFile
      );

    approvalValidation =
      validateApproval(
        approval,
        {
          expectedCommit:
            resolvedCommit
        }
      );
  }

  if (
    phase ===
      'promotion' &&
    !approvalValidation
      .passed
  ) {
    const error =
      new Error(
        'A promóciós jóváhagyás hiányzik vagy érvénytelen.'
      );

    error.code =
      'PROMOTION_APPROVAL_INVALID';

    error.details =
      approvalValidation;

    throw error;
  }

  const requiredArtifacts = [
    'sbom.cdx.json',
    'provenance.json',
    'secret-scan.json',
    'release-gate-report.json'
  ];

  if (approvalFile) {
    requiredArtifacts.push(
      'promotion-approval.json'
    );
  }

  const artifacts =
    requiredArtifacts
      .map(
        (fileName) =>
          artifactDescriptor(
            evidenceDirectory,
            fileName
          )
      )
      .sort(
        (left, right) =>
          left.file
            .localeCompare(
              right.file
            )
      );

  const secretScan =
    readJsonObject(
      path.join(
        evidenceDirectory,
        'secret-scan.json'
      )
    );

  if (
    secretScan.passed !==
      true ||
    (
      Array.isArray(
        secretScan.findings
      ) &&
      secretScan.findings
        .length > 0
    )
  ) {
    throw new Error(
      'A titokszivárgás-vizsgálat nem sikeres.'
    );
  }

  const evidence = {
    schemaVersion:
      EVIDENCE_SCHEMA_VERSION,
    product:
      packageData.name ||
      'arduino-led-controller',
    currentVersion:
      packageData.version,
    targetVersion:
      TARGET_VERSION,
    phase,
    commit:
      resolvedCommit,
    generatedAt,
    gate: {
      passed: true,
      report:
        artifactDescriptor(
          evidenceDirectory,
          'release-gate-report.json'
        ),
      validationSha256:
        hashObject(
          gateValidation
        )
    },
    promotion: {
      required:
        phase ===
        'promotion',
      approved:
        approvalValidation
          .passed,
      approval:
        approvalFile
          ? artifactDescriptor(
              evidenceDirectory,
              'promotion-approval.json'
            )
          : null,
      validationSha256:
        hashObject(
          approvalValidation
        )
    },
    artifacts
  };

  evidence.evidenceSha256 =
    hashObject({
      ...evidence,
      evidenceSha256:
        undefined
    });

  return evidence;
}

function verifyReleaseEvidence({
  root,
  evidenceFile,
  expectedCommit = '',
  expectedPhase = '',
  expectedVersion = '',
  maxAgeHours = 168,
  now =
    Date.now()
}) {
  const reasons = [];

  const evidence =
    readJsonObject(
      evidenceFile
    );

  const evidenceDirectory =
    path.dirname(
      evidenceFile
    );

  const addReason = (
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
      evidence
        .schemaVersion
    ) !==
    EVIDENCE_SCHEMA_VERSION
  ) {
    addReason(
      'EVIDENCE_SCHEMA_INVALID',
      'Az evidence schemaVersion értéke nem 1.'
    );
  }

  if (
    evidence.targetVersion !==
      TARGET_VERSION
  ) {
    addReason(
      'EVIDENCE_TARGET_VERSION_INVALID',
      'Az evidence célverziója nem alpha.2.'
    );
  }

  if (
    expectedCommit &&
    !commitsMatch(
      evidence.commit,
      expectedCommit
    )
  ) {
    addReason(
      'EVIDENCE_COMMIT_MISMATCH',
      'Az evidence más commitra vonatkozik.',
      {
        expected:
          expectedCommit,
        received:
          evidence.commit ||
          null
      }
    );
  }

  if (
    expectedPhase &&
    evidence.phase !==
      expectedPhase
  ) {
    addReason(
      'EVIDENCE_PHASE_MISMATCH',
      'Az evidence fázisa eltér.',
      {
        expected:
          expectedPhase,
        received:
          evidence.phase ||
          null
      }
    );
  }

  const packageData =
    readJsonObject(
      path.join(
        root,
        'package.json'
      )
    );

  const version =
    expectedVersion ||
    packageData.version;

  if (
    evidence.currentVersion !==
      version
  ) {
    addReason(
      'EVIDENCE_VERSION_MISMATCH',
      'Az evidence projektverziója eltér.',
      {
        expected:
          version,
        received:
          evidence.currentVersion ||
          null
      }
    );
  }

  const generatedAt =
    Date.parse(
      evidence.generatedAt
    );

  if (
    !Number.isFinite(
      generatedAt
    )
  ) {
    addReason(
      'EVIDENCE_DATE_INVALID',
      'Az evidence generatedAt mezője érvénytelen.'
    );
  } else {
    const ageHours =
      (
        now -
        generatedAt
      ) /
      3600000;

    if (
      ageHours < -0.25 ||
      ageHours >
        maxAgeHours
    ) {
      addReason(
        'EVIDENCE_EXPIRED',
        'Az evidence túl régi vagy jövőbeli.',
        {
          ageHours,
          maxAgeHours
        }
      );
    }
  }

  for (
    const artifact
    of evidence.artifacts ||
    []
  ) {
    const filePath =
      path.join(
        evidenceDirectory,
        artifact.file
      );

    if (
      !fs.existsSync(
        filePath
      )
    ) {
      addReason(
        'EVIDENCE_ARTIFACT_MISSING',
        'Hiányzó evidence artifact.',
        {
          file:
            artifact.file
        }
      );

      continue;
    }

    const actual =
      sha256File(
        filePath
      );

    if (
      actual !==
      artifact.sha256
    ) {
      addReason(
        'EVIDENCE_ARTIFACT_HASH_MISMATCH',
        'Eltérő evidence artifact SHA-256.',
        {
          file:
            artifact.file,
          expected:
            artifact.sha256,
          actual
        }
      );
    }
  }

  if (
    evidence.phase ===
      'promotion' &&
    evidence.promotion
      ?.approved !== true
  ) {
    addReason(
      'EVIDENCE_PROMOTION_NOT_APPROVED',
      'A promotion evidence nem tartalmaz jóváhagyást.'
    );
  }

  return {
    passed:
      reasons.length === 0,
    evidence,
    reasons
  };
}

module.exports = {
  EVIDENCE_SCHEMA_VERSION,
  TARGET_VERSION,
  artifactDescriptor,
  buildReleaseEvidence,
  hashObject,
  readJsonObject,
  validateApproval,
  verifyReleaseEvidence,
  writeJsonAtomic
};
