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
  readJsonObject,
  receiptFileName,
  sha256File,
  validateExecutionReceipt,
  writeJsonAtomic
} =
  require(
    './release-execution-receipt'
  );

const FINALIZATION_CONFIRMATION =
  'FINALIZE_ALPHA2_VERSION_SYNC';

class ReleaseFinalizationService {
  constructor({
    receiptDirectory,
    approvalFile,
    gateService,
    version,
    targetVersion =
      '5.0.0-alpha.2',
    maxAgeHours = 168,
    logger = null,
    eventBus = null
  } = {}) {
    if (
      !receiptDirectory ||
      !approvalFile ||
      !gateService ||
      !version
    ) {
      throw new TypeError(
        'A ReleaseFinalizationService receiptDirectory, approvalFile, gateService és version beállítása kötelező.'
      );
    }

    this.receiptDirectory =
      receiptDirectory;
    this.approvalFile =
      approvalFile;
    this.gateService =
      gateService;
    this.version =
      version;
    this.targetVersion =
      targetVersion;
    this.maxAgeHours =
      Math.max(
        1,
        Number(
          maxAgeHours
        ) || 168
      );
    this.logger = logger;
    this.eventBus = eventBus;
  }

  receiptPath(
    kind
  ) {
    return path.join(
      this.receiptDirectory,
      receiptFileName(
        kind
      )
    );
  }

  readReceipt(
    kind
  ) {
    const file =
      this.receiptPath(
        kind
      );

    try {
      return {
        present: true,
        file:
          path.basename(file),
        sha256:
          sha256File(file),
        data:
          readJsonObject(file)
      };
    } catch (error) {
      if (
        error.code ===
          'ENOENT'
      ) {
        return {
          present: false,
          file:
            path.basename(file)
        };
      }

      return {
        present: false,
        file:
          path.basename(file),
        error:
          error.message
      };
    }
  }

  approval() {
    try {
      return {
        present: true,
        file:
          path.basename(
            this.approvalFile
          ),
        ...readJsonObject(
          this.approvalFile
        )
      };
    } catch (error) {
      if (
        error.code ===
          'ENOENT'
      ) {
        return {
          present: false,
          file:
            path.basename(
              this.approvalFile
            )
        };
      }

      return {
        present: false,
        file:
          path.basename(
            this.approvalFile
          ),
        error:
          error.message
      };
    }
  }

  receipts() {
    return {
      directory:
        this.receiptDirectory,
      staging:
        this.readReceipt(
          'staging-deployment'
        ),
      rollback:
        this.readReceipt(
          'rollback-rehearsal'
        ),
      promotion:
        this.readReceipt(
          'promotion-deployment'
        ),
      approval:
        this.approval()
    };
  }

  async readiness() {
    const gate =
      await this.gateService
        .readiness();

    const receipts =
      this.receipts();

    const reasons = [
      ...(
        gate.ready
          ? []
          : gate.reasons
      )
    ];

    const candidateCommit =
      gate.candidateCommit ||
      gate.gate
        ?.candidateCommit ||
      '';

    let previousSha = '';

    const sequence = [
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
    ];

    const validations = {};

    for (
      const [
        key,
        kind
      ]
      of sequence
    ) {
      const entry =
        receipts[key];

      if (
        !entry.present
      ) {
        reasons.push({
          code:
            `FINALIZATION_${key.toUpperCase()}_RECEIPT_MISSING`,
          message:
            `Hiányzik a ${kind} receipt.`
        });

        validations[key] = {
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

      validations[key] =
        validation;

      if (
        !validation.passed
      ) {
        reasons.push(
          ...validation.reasons
            .map(
              (reason) => ({
                ...reason,
                code:
                  `FINALIZATION_${key.toUpperCase()}_${reason.code}`
              })
            )
        );
      }

      previousSha =
        entry.sha256;
    }

    if (
      this.version !==
        '5.0.0-alpha.1'
    ) {
      reasons.push({
        code:
          'FINALIZATION_SOURCE_VERSION_INVALID',
        message:
          'A véglegesítés csak 5.0.0-alpha.1 forrásverzióról indulhat.',
        details: {
          received:
            this.version
        }
      });
    }

    const ready =
      reasons.length ===
      0;

    return {
      ready,
      projectVersion:
        this.version,
      targetVersion:
        this.targetVersion,
      candidateCommit,
      gate,
      receipts,
      validations,
      approval:
        this.approval(),
      confirmation:
        FINALIZATION_CONFIRMATION,
      reasons,
      generatedAt:
        new Date()
          .toISOString()
    };
  }

  async verify() {
    const readiness =
      await this.readiness();

    if (!readiness.ready) {
      throw new ReleaseServiceError(
        409,
        'ALPHA2_FINALIZATION_NOT_READY',
        'Az alpha.2 verziószinkron véglegesítési feltételei nem teljesülnek.',
        readiness
      );
    }

    return readiness;
  }

  async approve({
    confirm,
    principal = null
  } = {}) {
    if (
      confirm !==
        FINALIZATION_CONFIRMATION
    ) {
      throw new ReleaseServiceError(
        400,
        'ALPHA2_FINALIZATION_CONFIRMATION_REQUIRED',
        `A megerősítés kötelező: ${FINALIZATION_CONFIRMATION}`,
        {
          required:
            FINALIZATION_CONFIRMATION
        }
      );
    }

    const readiness =
      await this.verify();

    const approval = {
      schemaVersion: 1,
      approved: true,
      projectVersion:
        this.version,
      targetVersion:
        this.targetVersion,
      candidateCommit:
        readiness
          .candidateCommit,
      approvedAt:
        new Date()
          .toISOString(),
      approvedBy:
        principal?.subject ||
        'system',
      receiptHashes: {
        staging:
          readiness.receipts
            .staging.sha256,
        rollback:
          readiness.receipts
            .rollback.sha256,
        promotion:
          readiness.receipts
            .promotion.sha256
      }
    };

    writeJsonAtomic(
      this.approvalFile,
      approval
    );

    this.logger?.warn?.(
      'Alpha.2 verziószinkron véglegesítése jóváhagyva.',
      approval
    );

    this.eventBus?.publish?.(
      'release.finalization.approved',
      approval
    );

    return {
      present: true,
      file:
        path.basename(
          this.approvalFile
        ),
      ...approval
    };
  }

  async revoke({
    principal = null
  } = {}) {
    if (
      !fs.existsSync(
        this.approvalFile
      )
    ) {
      throw new ReleaseServiceError(
        404,
        'ALPHA2_FINALIZATION_APPROVAL_NOT_FOUND',
        'Nem található alpha.2 véglegesítési jóváhagyás.'
      );
    }

    const previous =
      this.approval();

    await fs.promises.rm(
      this.approvalFile,
      {
        force: true
      }
    );

    const result = {
      revoked: true,
      revokedAt:
        new Date()
          .toISOString(),
      revokedBy:
        principal?.subject ||
        'system',
      previous
    };

    this.eventBus?.publish?.(
      'release.finalization.revoked',
      result
    );

    return result;
  }
}

module.exports = {
  FINALIZATION_CONFIRMATION,
  ReleaseFinalizationService
};
