'use strict';

const crypto =
  require('crypto');

const fs =
  require('fs');

const path =
  require('path');

const STATE_SCHEMA_VERSION =
  1;

const TARGET_VERSION =
  '5.0.0-alpha.2';

const PHASES =
  Object.freeze([
    'preflight',
    'gate',
    'staging-bundle',
    'staging-deployment',
    'rollback-rehearsal',
    'promotion-bundle',
    'promotion-deployment',
    'receipt-verification',
    'artifact-collection'
  ]);

const TERMINAL_STATUSES =
  new Set([
    'awaiting-promotion',
    'ready-for-finalization',
    'failed'
  ]);

function sha256(
  value
) {
  return crypto
    .createHash('sha256')
    .update(
      typeof value ===
        'string'
        ? value
        : JSON.stringify(value)
    )
    .digest('hex');
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

function stateHash(
  state
) {
  return sha256({
    ...state,
    stateSha256:
      undefined
  });
}

function emptyPhases() {
  return Object.fromEntries(
    PHASES.map(
      (phase) => [
        phase,
        {
          status:
            'pending',
          startedAt:
            null,
          finishedAt:
            null,
          message:
            '',
          artifacts:
            {}
        }
      ]
    )
  );
}

function createState({
  candidateRef,
  candidateCommit,
  baselineBranch,
  baselineCommit,
  startedAt =
    new Date()
      .toISOString()
}) {
  for (
    const [
      name,
      value
    ]
    of Object.entries({
      candidateRef,
      candidateCommit,
      baselineBranch,
      baselineCommit
    })
  ) {
    if (
      typeof value !==
        'string' ||
      !value.trim()
    ) {
      throw new TypeError(
        `A state mező kötelező: ${name}`
      );
    }
  }

  const state = {
    schemaVersion:
      STATE_SCHEMA_VERSION,
    targetVersion:
      TARGET_VERSION,
    candidateRef,
    candidateCommit,
    baselineBranch,
    baselineCommit,
    status:
      'running',
    currentPhase:
      'preflight',
    startedAt,
    updatedAt:
      startedAt,
    completedAt:
      null,
    phases:
      emptyPhases(),
    artifacts: {},
    lastError:
      null,
    events: [
      {
        at:
          startedAt,
        phase:
          'preflight',
        status:
          'running',
        message:
          'Az alpha.2 LXC végrehajtás elindult.'
      }
    ]
  };

  state.phases
    .preflight.status =
      'running';

  state.phases
    .preflight.startedAt =
      startedAt;

  state.stateSha256 =
    stateHash(state);

  return state;
}

function validateState(
  state,
  {
    expectedCommit = ''
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
      state
        ?.schemaVersion
    ) !==
    STATE_SCHEMA_VERSION
  ) {
    add(
      'ORCHESTRATION_STATE_SCHEMA_INVALID',
      'Az orchestration state schemaVersion értéke érvénytelen.'
    );
  }

  if (
    state?.targetVersion !==
      TARGET_VERSION
  ) {
    add(
      'ORCHESTRATION_TARGET_VERSION_INVALID',
      'Az orchestration célverziója nem alpha.2.'
    );
  }

  if (
    !/^[a-f0-9]{7,40}$/i
      .test(
        String(
          state
            ?.candidateCommit ||
          ''
        )
      )
  ) {
    add(
      'ORCHESTRATION_COMMIT_INVALID',
      'A candidate commit érvénytelen.'
    );
  }

  if (
    expectedCommit &&
    !commitsMatch(
      state?.candidateCommit,
      expectedCommit
    )
  ) {
    add(
      'ORCHESTRATION_COMMIT_MISMATCH',
      'Az orchestration state más candidate commitra vonatkozik.',
      {
        expected:
          expectedCommit,
        received:
          state?.candidateCommit ||
          null
      }
    );
  }

  if (
    ![
      'running',
      'awaiting-promotion',
      'ready-for-finalization',
      'failed'
    ].includes(
      state?.status
    )
  ) {
    add(
      'ORCHESTRATION_STATUS_INVALID',
      'Az orchestration állapot érvénytelen.'
    );
  }

  if (
    !PHASES.includes(
      state?.currentPhase
    )
  ) {
    add(
      'ORCHESTRATION_PHASE_INVALID',
      'Az aktuális orchestration fázis érvénytelen.'
    );
  }

  for (
    const phase
    of PHASES
  ) {
    if (
      !state?.phases ||
      typeof state
        .phases[phase] !==
        'object'
    ) {
      add(
        'ORCHESTRATION_PHASE_MISSING',
        `Hiányzó orchestration fázis: ${phase}`
      );
    }
  }

  if (
    state?.stateSha256 !==
      stateHash(state)
  ) {
    add(
      'ORCHESTRATION_STATE_HASH_INVALID',
      'Az orchestration state belső SHA-256 lenyomata eltér.'
    );
  }

  return {
    passed:
      reasons.length === 0,
    reasons,
    state
  };
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

function updateState(
  state,
  {
    phase = '',
    phaseStatus = '',
    status = '',
    message = '',
    artifactName = '',
    artifactValue = '',
    errorCode = '',
    errorMessage = '',
    at =
      new Date()
        .toISOString()
  } = {}
) {
  const next =
    JSON.parse(
      JSON.stringify(state)
    );

  if (
    phase &&
    !PHASES.includes(
      phase
    )
  ) {
    throw new TypeError(
      `Érvénytelen orchestration fázis: ${phase}`
    );
  }

  if (
    phaseStatus &&
    ![
      'pending',
      'running',
      'passed',
      'failed',
      'skipped'
    ].includes(
      phaseStatus
    )
  ) {
    throw new TypeError(
      `Érvénytelen fázisállapot: ${phaseStatus}`
    );
  }

  if (
    status &&
    ![
      'running',
      'awaiting-promotion',
      'ready-for-finalization',
      'failed'
    ].includes(
      status
    )
  ) {
    throw new TypeError(
      `Érvénytelen orchestration status: ${status}`
    );
  }

  if (phase) {
    next.currentPhase =
      phase;

    const target =
      next.phases[phase];

    if (
      phaseStatus ===
        'running' &&
      !target.startedAt
    ) {
      target.startedAt =
        at;
    }

    if (
      [
        'passed',
        'failed',
        'skipped'
      ].includes(
        phaseStatus
      )
    ) {
      target.finishedAt =
        at;
    }

    if (phaseStatus) {
      target.status =
        phaseStatus;
    }

    if (message) {
      target.message =
        message;
    }

    if (artifactName) {
      target.artifacts[
        artifactName
      ] =
        artifactValue;

      next.artifacts[
        artifactName
      ] =
        artifactValue;
    }
  } else if (
    artifactName
  ) {
    next.artifacts[
      artifactName
    ] =
      artifactValue;
  }

  if (status) {
    next.status =
      status;

    if (
      TERMINAL_STATUSES
        .has(status)
    ) {
      next.completedAt =
        at;
    }
  }

  if (
    errorCode ||
    errorMessage
  ) {
    next.lastError = {
      code:
        errorCode ||
        'ORCHESTRATION_ERROR',
      message:
        errorMessage ||
        'Az orchestration fázis sikertelen.',
      at,
      phase:
        phase ||
        next.currentPhase
    };
  } else if (
    phaseStatus ===
      'passed'
  ) {
    next.lastError =
      null;
  }

  next.updatedAt =
    at;

  next.events = [
    ...(
      Array.isArray(
        next.events
      )
        ? next.events
        : []
    ),
    {
      at,
      phase:
        phase ||
        next.currentPhase,
      status:
        phaseStatus ||
        status ||
        next.status,
      message:
        message ||
        errorMessage ||
        ''
    }
  ].slice(-100);

  next.stateSha256 =
    stateHash(next);

  return next;
}

function readState(
  filePath
) {
  return readJsonObject(
    filePath
  );
}

function writeState(
  filePath,
  state
) {
  writeJsonAtomic(
    filePath,
    {
      ...state,
      stateSha256:
        stateHash(state)
    }
  );
}

module.exports = {
  PHASES,
  STATE_SCHEMA_VERSION,
  TARGET_VERSION,
  commitsMatch,
  createState,
  readJsonObject,
  readState,
  sha256,
  stateHash,
  updateState,
  validateState,
  writeJsonAtomic,
  writeState
};
