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
  latestGateReportPath,
  readGateReport,
  readJsonObject,
  resolveGitCommit,
  sha256File,
  validateGateReport
} =
  require('./release-gate-report');

async function atomicWriteJson(
  filePath,
  value,
  mode = 0o640
) {
  await fs.promises.mkdir(
    path.dirname(
      filePath
    ),
    {
      recursive: true
    }
  );

  const temporary =
    `${filePath}.tmp-${process.pid}-${Date.now()}`;

  await fs.promises.writeFile(
    temporary,
    `${JSON.stringify(
      value,
      null,
      2
    )}\n`,
    {
      encoding:
        'utf8',
      mode
    }
  );

  await fs.promises.rename(
    temporary,
    filePath
  );
}

class ReleaseGateService {
  constructor({
    reportDirectory,
    approvalFile,
    projectRoot,
    metadataFile,
    version,
    targetVersion =
      '5.0.0-alpha.2',
    maxAgeHours = 72,
    preflightProvider =
      null,
    maintenanceProvider =
      null,
    migrationProvider =
      null,
    logger = null,
    eventBus = null
  } = {}) {
    if (
      !reportDirectory ||
      !approvalFile ||
      !projectRoot ||
      !metadataFile
    ) {
      throw new TypeError(
        'A ReleaseGateService reportDirectory, approvalFile, projectRoot és metadataFile beállítása kötelező.'
      );
    }

    this.reportDirectory =
      reportDirectory;
    this.approvalFile =
      approvalFile;
    this.projectRoot =
      projectRoot;
    this.metadataFile =
      metadataFile;
    this.version =
      version;
    this.targetVersion =
      targetVersion;
    this.maxAgeHours =
      Math.max(
        1,
        Number(
          maxAgeHours
        ) || 72
      );
    this.preflightProvider =
      preflightProvider;
    this.maintenanceProvider =
      maintenanceProvider;
    this.migrationProvider =
      migrationProvider;
    this.logger = logger;
    this.eventBus = eventBus;
  }

  currentCommit() {
    return resolveGitCommit(
      this.projectRoot
    );
  }

  latestReportFile() {
    return latestGateReportPath(
      this.reportDirectory
    );
  }

  installedMetadata() {
    try {
      const parsed =
        readJsonObject(
          this.metadataFile
        );

      return {
        present: true,
        name:
          parsed.name ||
          null,
        version:
          parsed.version ||
          null,
        commit:
          parsed.commit ||
          null,
        createdAt:
          parsed.createdAt ||
          parsed.installedAt ||
          null,
        target:
          parsed.target ||
          null,
        file:
          path.basename(
            this.metadataFile
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
              this.metadataFile
            )
        };
      }

      return {
        present: false,
        error:
          error.message,
        file:
          path.basename(
            this.metadataFile
          )
      };
    }
  }

  approval() {
    try {
      const parsed =
        readJsonObject(
          this.approvalFile
        );

      return {
        present: true,
        ...parsed,
        file:
          path.basename(
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
        error:
          error.message,
        file:
          path.basename(
            this.approvalFile
          )
      };
    }
  }

  status({
    expectedCommit =
      this.currentCommit()
  } = {}) {
    const reportFile =
      this.latestReportFile();

    if (!reportFile) {
      return {
        passed: false,
        projectVersion:
          this.version,
        targetVersion:
          this.targetVersion,
        expectedCommit,
        reportDirectory:
          this.reportDirectory,
        report: null,
        reasons: [
          {
            code:
              'RELEASE_GATE_REPORT_NOT_FOUND',
            message:
              'Nem található alpha.2 LXC release-gate jelentés.'
          }
        ],
        installedMetadata:
          this.installedMetadata(),
        approval:
          this.approval()
      };
    }

    const report =
      readGateReport(
        reportFile
      );

    const validation =
      validateGateReport(
        report,
        {
          expectedCommit,
          maxAgeHours:
            this.maxAgeHours
        }
      );

    return {
      ...validation,
      projectVersion:
        this.version,
      targetVersion:
        this.targetVersion,
      expectedCommit,
      reportDirectory:
        this.reportDirectory,
      report: {
        fileName:
          path.basename(
            reportFile
          ),
        sha256:
          sha256File(
            reportFile
          )
      },
      installedMetadata:
        this.installedMetadata(),
      approval:
        this.approval()
    };
  }

  verify(
    options = {}
  ) {
    const status =
      this.status(
        options
      );

    if (!status.report) {
      throw ReleaseServiceError
        .gateNotFound(
          this.reportDirectory
        );
    }

    if (!status.passed) {
      throw ReleaseServiceError
        .gateRejected(
          status
        );
    }

    this.logger?.info?.(
      'Alpha.2 release-gate jelentés elfogadva.',
      {
        candidateCommit:
          status.candidateCommit,
        report:
          status.report.fileName
      }
    );

    this.eventBus?.publish?.(
      'release.gate.verified',
      {
        candidateCommit:
          status.candidateCommit,
        report:
          status.report.fileName,
        version:
          this.version
      }
    );

    return status;
  }

  async readiness() {
    const gate =
      this.status();

    const preflight =
      this.preflightProvider
        ? await this
            .preflightProvider()
        : {
            ready: true,
            unavailable:
              true
          };

    const maintenance =
      this.maintenanceProvider
        ? await this
            .maintenanceProvider()
        : {
            enabled: false,
            unavailable:
              true
          };

    const migrations =
      this.migrationProvider
        ? await this
            .migrationProvider()
        : {
            pending: 0,
            unavailable:
              true
          };

    const reasons = [
      ...(
        gate.passed
          ? []
          : gate.reasons
      )
    ];

    if (
      preflight.ready !==
      true
    ) {
      reasons.push({
        code:
          'PREFLIGHT_NOT_READY',
        message:
          'A konfigurációs preflight blokkoló hibát tartalmaz.',
        details:
          preflight.summary ||
          null
      });
    }

    if (
      maintenance.enabled ===
      true
    ) {
      reasons.push({
        code:
          'MAINTENANCE_MODE_ACTIVE',
        message:
          'A promóció előtt a karbantartási módot ki kell kapcsolni.'
      });
    }

    if (
      Number(
        migrations.pending
      ) > 0
    ) {
      reasons.push({
        code:
          'PENDING_MIGRATIONS',
        message:
          'A promóció előtt minden rendszer-migrációt alkalmazni kell.',
        details: {
          pending:
            Number(
              migrations.pending
            )
        }
      });
    }

    return {
      ready:
        reasons.length ===
        0,
      targetVersion:
        this.targetVersion,
      projectVersion:
        this.version,
      candidateCommit:
        gate.candidateCommit ||
        gate.expectedCommit ||
        '',
      gate,
      preflight,
      maintenance,
      migrations,
      approval:
        this.approval(),
      reasons,
      generatedAt:
        new Date()
          .toISOString()
    };
  }

  async approve({
    confirm,
    principal = null
  } = {}) {
    if (
      confirm !==
      'APPROVE_ALPHA2_PROMOTION'
    ) {
      throw ReleaseServiceError
        .confirmationRequired();
    }

    const readiness =
      await this.readiness();

    if (!readiness.ready) {
      throw ReleaseServiceError
        .readinessRejected(
          readiness
        );
    }

    const approval = {
      schemaVersion: 1,
      targetVersion:
        this.targetVersion,
      projectVersion:
        this.version,
      candidateCommit:
        readiness
          .candidateCommit,
      gateReport:
        readiness.gate
          .report,
      approvedAt:
        new Date()
          .toISOString(),
      approvedBy:
        principal?.subject ||
        'system'
    };

    await atomicWriteJson(
      this.approvalFile,
      approval
    );

    this.eventBus?.publish?.(
      'release.promotion.approved',
      approval
    );

    this.logger?.warn?.(
      'Alpha.2 promóció jóváhagyva.',
      approval
    );

    return {
      present: true,
      ...approval,
      file:
        path.basename(
          this.approvalFile
        )
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
      throw ReleaseServiceError
        .approvalNotFound(
          this.approvalFile
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
      'release.promotion.revoked',
      result
    );

    return result;
  }
}

module.exports = {
  ReleaseGateService,
  atomicWriteJson
};
