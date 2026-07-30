'use strict';

const crypto =
  require('crypto');

const fs =
  require('fs');

const path =
  require('path');

const {
  execFileSync
} =
  require('child_process');

const COMMIT_PATTERN =
  /^[a-f0-9]{7,40}$/i;

const EXPECTED_GATE =
  'alpha2-lxc';

function normalizeCommit(
  value
) {
  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();

  return COMMIT_PATTERN
    .test(normalized)
      ? normalized
      : '';
}

function commitsMatch(
  left,
  right
) {
  const normalizedLeft =
    normalizeCommit(left);

  const normalizedRight =
    normalizeCommit(right);

  if (
    !normalizedLeft ||
    !normalizedRight
  ) {
    return false;
  }

  return (
    normalizedLeft ===
      normalizedRight ||
    normalizedLeft.startsWith(
      normalizedRight
    ) ||
    normalizedRight.startsWith(
      normalizedLeft
    )
  );
}

function resolveGitCommit(
  projectRoot
) {
  try {
    return normalizeCommit(
      execFileSync(
        'git',
        [
          '-C',
          projectRoot,
          'rev-parse',
          'HEAD'
        ],
        {
          encoding:
            'utf8',
          timeout:
            5000,
          stdio: [
            'ignore',
            'pipe',
            'ignore'
          ]
        }
      )
    );
  } catch (_) {
    return '';
  }
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
      `A JSON fájl objektum legyen: ${filePath}`
    );
  }

  return parsed;
}

function readGateReport(
  filePath
) {
  return readJsonObject(
    filePath
  );
}

function latestGateReportPath(
  directory
) {
  try {
    const reports =
      fs.readdirSync(
        directory
      )
        .filter(
          (name) =>
            /^alpha2-.*\.json$/i
              .test(name)
        )
        .map(
          (name) => {
            const filePath =
              path.join(
                directory,
                name
              );

            const stats =
              fs.statSync(
                filePath
              );

            return {
              filePath,
              modifiedAt:
                stats.mtimeMs
            };
          }
        )
        .sort(
          (left, right) =>
            right.modifiedAt -
            left.modifiedAt
        );

    return (
      reports[0]
        ?.filePath ||
      null
    );
  } catch (error) {
    if (
      error.code ===
      'ENOENT'
    ) {
      return null;
    }

    throw error;
  }
}

function validateGateReport(
  report,
  {
    expectedCommit = '',
    expectedGate =
      EXPECTED_GATE,
    maxAgeHours = 72,
    now =
      Date.now()
  } = {}
) {
  const reasons = [];

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
      report?.schemaVersion
    ) !== 1
  ) {
    addReason(
      'RELEASE_GATE_SCHEMA_INVALID',
      'A release-gate schemaVersion értéke nem 1.'
    );
  }

  if (
    String(
      report?.gate ||
      ''
    ) !==
    String(
      expectedGate
    )
  ) {
    addReason(
      'RELEASE_GATE_NAME_INVALID',
      'A jelentés nem az elvárt release-gate futásból származik.',
      {
        expected:
          expectedGate,
        received:
          report?.gate ||
          null
      }
    );
  }

  if (
    String(
      report?.status ||
      ''
    ).toLowerCase() !==
    'passed'
  ) {
    addReason(
      'RELEASE_GATE_NOT_PASSED',
      'A release-gate állapota nem passed.',
      {
        received:
          report?.status ||
          null
      }
    );
  }

  const candidateCommit =
    normalizeCommit(
      report?.candidateCommit
    );

  if (!candidateCommit) {
    addReason(
      'RELEASE_GATE_COMMIT_INVALID',
      'A candidateCommit hiányzik vagy érvénytelen.'
    );
  }

  if (
    expectedCommit &&
    !commitsMatch(
      candidateCommit,
      expectedCommit
    )
  ) {
    addReason(
      'RELEASE_GATE_COMMIT_MISMATCH',
      'A release-gate nem a jelenlegi candidate commitra futott.',
      {
        expected:
          normalizeCommit(
            expectedCommit
          ),
        received:
          candidateCommit
      }
    );
  }

  const finishedAt =
    Date.parse(
      String(
        report?.finishedAt ||
        ''
      )
    );

  const maximumAgeMs =
    Math.max(
      1,
      Number(
        maxAgeHours
      ) || 72
    ) *
    60 *
    60 *
    1000;

  if (
    !Number.isFinite(
      finishedAt
    )
  ) {
    addReason(
      'RELEASE_GATE_FINISHED_AT_INVALID',
      'A release-gate finishedAt időpontja érvénytelen.'
    );
  } else {
    const ageMs =
      now -
      finishedAt;

    if (
      ageMs <
      -5 * 60 * 1000
    ) {
      addReason(
        'RELEASE_GATE_FROM_FUTURE',
        'A release-gate időpontja több mint öt perccel a jövőben van.'
      );
    }

    if (
      ageMs >
      maximumAgeMs
    ) {
      addReason(
        'RELEASE_GATE_EXPIRED',
        'A release-gate jelentés túl régi.',
        {
          maxAgeHours:
            Number(
              maxAgeHours
            ) || 72,
          ageHours:
            Math.round(
              (
                ageMs /
                3600000
              ) *
              100
            ) /
            100
        }
      );
    }
  }

  return {
    passed:
      reasons.length ===
      0,
    reasons,
    gate:
      String(
        report?.gate ||
        ''
      ),
    status:
      String(
        report?.status ||
        ''
      ),
    candidateCommit,
    baselineCommit:
      normalizeCommit(
        report?.baselineCommit
      ),
    startedAt:
      report?.startedAt ||
      null,
    finishedAt:
      report?.finishedAt ||
      null,
    serviceName:
      report?.serviceName ||
      null,
    hostname:
      report?.hostname ||
      null,
    nodeVersion:
      report?.nodeVersion ||
      null,
    checks:
      Array.isArray(
        report?.checks
      )
        ? report.checks
        : []
  };
}

function sha256File(
  filePath
) {
  return crypto
    .createHash(
      'sha256'
    )
    .update(
      fs.readFileSync(
        filePath
      )
    )
    .digest(
      'hex'
    );
}

module.exports = {
  COMMIT_PATTERN,
  EXPECTED_GATE,
  commitsMatch,
  latestGateReportPath,
  normalizeCommit,
  readGateReport,
  readJsonObject,
  resolveGitCommit,
  sha256File,
  validateGateReport
};
