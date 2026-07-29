'use strict';

const fs =
  require('fs');

const path =
  require('path');

const {
  ReleaseServiceError
} =
  require('./release-error');

const {
  commitsMatch,
  readJsonObject,
  validateState
} =
  require(
    './alpha2-orchestration-state'
  );

const {
  receiptFileName,
  sha256File,
  validateExecutionReceipt
} =
  require(
    './release-execution-receipt'
  );

class Alpha2OrchestrationService {
  constructor({
    stateFile,
    artifactIndexFile,
    productionGuardFile,
    productionGuardVerificationFile,
    receiptDirectory,
    maxAgeHours = 168,
    logger = null
  } = {}) {
    if (
      !stateFile ||
      !artifactIndexFile ||
      !productionGuardFile ||
      !productionGuardVerificationFile ||
      !receiptDirectory
    ) {
      throw new TypeError(
        'Az Alpha2OrchestrationService minden útvonalbeállítása kötelező.'
      );
    }

    this.stateFile =
      stateFile;
    this.artifactIndexFile =
      artifactIndexFile;
    this.productionGuardFile =
      productionGuardFile;
    this.productionGuardVerificationFile =
      productionGuardVerificationFile;
    this.receiptDirectory =
      receiptDirectory;
    this.maxAgeHours =
      Math.max(
        1,
        Number(
          maxAgeHours
        ) || 168
      );
    this.logger = logger;
  }

  optionalJson(
    filePath
  ) {
    try {
      return {
        present: true,
        file:
          path.basename(filePath),
        sha256:
          sha256File(filePath),
        data:
          readJsonObject(filePath)
      };
    } catch (error) {
      if (
        error.code ===
          'ENOENT'
      ) {
        return {
          present: false,
          file:
            path.basename(filePath)
        };
      }

      return {
        present: false,
        file:
          path.basename(filePath),
        error:
          error.message
      };
    }
  }

  receipt(
    kind
  ) {
    return this.optionalJson(
      path.join(
        this.receiptDirectory,
        receiptFileName(kind)
      )
    );
  }

  artifacts() {
    return this.optionalJson(
      this.artifactIndexFile
    );
  }

  status() {
    const stateEntry =
      this.optionalJson(
        this.stateFile
      );

    const guard =
      this.optionalJson(
        this.productionGuardFile
      );

    const guardVerification =
      this.optionalJson(
        this.productionGuardVerificationFile
      );

    const receipts = {
      staging:
        this.receipt(
          'staging-deployment'
        ),
      rollback:
        this.receipt(
          'rollback-rehearsal'
        ),
      promotion:
        this.receipt(
          'promotion-deployment'
        )
    };

    const state =
      stateEntry.present
        ? stateEntry.data
        : null;

    const candidateCommit =
      state?.candidateCommit ||
      '';

    const stateValidation =
      state
        ? validateState(
            state
          )
        : {
            passed: false,
            reasons: [
              {
                code:
                  'ORCHESTRATION_STATE_MISSING',
                message:
                  'Hiányzik az orchestration state.'
              }
            ]
          };

    let previousSha = '';

    const receiptValidations = {};

    for (
      const [
        key,
        kind
      ]
      of [
        [
          'staging',
          'staging-deployment'
        ],
        [
          'rollback',
          'rollback-rehearsal'
        ],
        [
          'promotion',
          'promotion-deployment'
        ]
      ]
    ) {
      const entry =
        receipts[key];

      if (!entry.present) {
        receiptValidations[key] = {
          passed: false,
          reasons: [
            {
              code:
                'RECEIPT_NOT_FOUND'
            }
          ]
        };

        previousSha = '';
        continue;
      }

      const validation =
        validateExecutionReceipt(
          entry.data,
          {
            expectedKind:
              kind,
            expectedCommit:
              candidateCommit,
            expectedPreviousSha256:
              key ===
                'staging'
                ? ''
                : previousSha,
            maxAgeHours:
              this.maxAgeHours
          }
        );

      receiptValidations[key] =
        validation;

      previousSha =
        entry.sha256;
    }

    const guardPassed =
      guardVerification
        .present &&
      guardVerification
        .data?.passed === true &&
      (
        !candidateCommit ||
        commitsMatch(
          guardVerification
            .data?.candidateCommit,
          candidateCommit
        )
      );

    const readyForPromotion =
      stateValidation.passed &&
      state?.status ===
        'awaiting-promotion' &&
      receiptValidations
        .staging.passed &&
      receiptValidations
        .rollback.passed &&
      guardPassed;

    const readyForFinalization =
      stateValidation.passed &&
      state?.status ===
        'ready-for-finalization' &&
      receiptValidations
        .staging.passed &&
      receiptValidations
        .rollback.passed &&
      receiptValidations
        .promotion.passed &&
      guardPassed;

    return {
      present:
        stateEntry.present,
      state:
        state ||
        null,
      stateValidation,
      productionGuard:
        guard,
      productionGuardVerification:
        guardVerification,
      guardPassed,
      receipts,
      receiptValidations,
      artifacts:
        this.artifacts(),
      readyForPromotion,
      readyForFinalization,
      generatedAt:
        new Date()
          .toISOString()
    };
  }

  verify() {
    const status =
      this.status();

    const reasons = [
      ...(
        status
          .stateValidation
          .reasons ||
        []
      )
    ];

    if (
      !status.guardPassed
    ) {
      reasons.push({
        code:
          'PRODUCTION_GUARD_NOT_PASSED',
        message:
          'A produkciós repository és szolgáltatás őrellenőrzése nem sikeres.'
      });
    }

    const stateStatus =
      status.state?.status;

    const requiredReceipts =
      stateStatus ===
        'ready-for-finalization'
        ? [
            'staging',
            'rollback',
            'promotion'
          ]
        : [
            'staging',
            'rollback'
          ];

    for (
      const key
      of requiredReceipts
    ) {
      const validation =
        status
          .receiptValidations[key];

      if (!validation.passed) {
        reasons.push(
          ...(
            validation.reasons ||
            []
          ).map(
            (reason) => ({
              ...reason,
              code:
                `LXC_${key.toUpperCase()}_${reason.code}`
            })
          )
        );
      }
    }

    if (
      ![
        'awaiting-promotion',
        'ready-for-finalization'
      ].includes(
        stateStatus
      )
    ) {
      reasons.push({
        code:
          'ORCHESTRATION_NOT_AT_VERIFIABLE_MILESTONE',
        message:
          'Az orchestration még nem ért el ellenőrizhető mérföldkövet.'
      });
    }

    if (
      reasons.length > 0
    ) {
      throw new ReleaseServiceError(
        409,
        'ALPHA2_LXC_ORCHESTRATION_INVALID',
        'Az alpha.2 LXC orchestration ellenőrzése sikertelen.',
        {
          ...status,
          reasons
        }
      );
    }

    this.logger?.info?.(
      'Alpha.2 LXC orchestration ellenőrzése sikeres.',
      {
        candidateCommit:
          status.state
            .candidateCommit,
        status:
          stateStatus
      }
    );

    return {
      ...status,
      verified: true
    };
  }
}

module.exports = {
  Alpha2OrchestrationService
};
