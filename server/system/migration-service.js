'use strict';

const fs = require('fs');
const path = require('path');

const {
  SystemServiceError
} = require('./system-error');

const MIGRATIONS = Object.freeze([
  {
    id:
      '001-runtime-directories',
    description:
      'A V5 futásidejű könyvtárstruktúra létrehozása.',
    async inspect(context) {
      const targets = [
        context.paths.dataDir,
        context.paths.configDir,
        context.paths.schedulesDir,
        context.paths.snapshotsDir,
        context.paths.migrationDir
      ];

      return {
        required:
          targets.some(
            (target) =>
              !fs.existsSync(
                target
              )
          ),
        targets
      };
    },
    async apply(context) {
      const inspected =
        await this.inspect(
          context
        );

      for (
        const target
        of inspected.targets
      ) {
        await fs.promises.mkdir(
          target,
          {
            recursive: true
          }
        );
      }

      return {
        created:
          inspected.targets
      };
    }
  },
  {
    id:
      '002-runtime-state-files',
    description:
      'A maintenance és migrációs állapotfájlok előkészítése.',
    async inspect(context) {
      const targets = [
        {
          path:
            context.paths
              .maintenanceStateFile,
          initial: {
            enabled: false,
            reason: null,
            enabledAt: null,
            enabledBy: null
          }
        },
        {
          path:
            context.paths
              .migrationStateFile,
          initial: {
            applied: []
          }
        }
      ];

      return {
        required:
          targets.some(
            (target) =>
              !fs.existsSync(
                target.path
              )
          ),
        targets
      };
    },
    async apply(context) {
      const inspected =
        await this.inspect(
          context
        );

      const created = [];

      for (
        const target
        of inspected.targets
      ) {
        if (
          fs.existsSync(
            target.path
          )
        ) {
          continue;
        }

        await fs.promises.mkdir(
          path.dirname(
            target.path
          ),
          {
            recursive: true
          }
        );

        await fs.promises.writeFile(
          target.path,
          `${JSON.stringify(
            target.initial,
            null,
            2
          )}\n`,
          {
            encoding: 'utf8',
            mode: 0o600
          }
        );

        created.push(
          target.path
        );
      }

      return {
        created
      };
    }
  }
]);

class MigrationService {
  constructor({
    paths,
    logger = null,
    eventBus = null,
    migrations = MIGRATIONS
  } = {}) {
    this.paths = paths;
    this.logger = logger;
    this.eventBus = eventBus;
    this.migrations = migrations;
  }

  async readState() {
    try {
      return JSON.parse(
        await fs.promises.readFile(
          this.paths
            .migrationStateFile,
          'utf8'
        )
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          applied: []
        };
      }

      throw error;
    }
  }

  async writeState(state) {
    await fs.promises.mkdir(
      path.dirname(
        this.paths
          .migrationStateFile
      ),
      {
        recursive: true
      }
    );

    const temporary =
      `${this.paths.migrationStateFile}.tmp-${process.pid}-${Date.now()}`;

    await fs.promises.writeFile(
      temporary,
      `${JSON.stringify(
        state,
        null,
        2
      )}\n`,
      {
        encoding: 'utf8',
        mode: 0o600
      }
    );

    await fs.promises.rename(
      temporary,
      this.paths
        .migrationStateFile
    );
  }

  async status() {
    const state =
      await this.readState();

    const context = {
      paths:
        this.paths
    };

    const migrations = [];

    for (
      const migration
      of this.migrations
    ) {
      const inspection =
        await migration.inspect(
          context
        );

      migrations.push({
        id:
          migration.id,
        description:
          migration.description,
        applied:
          state.applied
            .some(
              (entry) =>
                entry.id ===
                migration.id
            ),
        required:
          inspection.required,
        inspection
      });
    }

    return {
      migrations,
      pending:
        migrations.filter(
          (migration) =>
            migration.required
        ).length,
      generatedAt:
        new Date().toISOString()
    };
  }

  async apply({
    dryRun = false,
    principal = null
  } = {}) {
    const state =
      await this.readState();

    const context = {
      paths:
        this.paths
    };

    const results = [];

    for (
      const migration
      of this.migrations
    ) {
      const inspection =
        await migration.inspect(
          context
        );

      if (!inspection.required) {
        results.push({
          id:
            migration.id,
          status:
            'not-required'
        });
        continue;
      }

      if (dryRun) {
        results.push({
          id:
            migration.id,
          status:
            'pending',
          inspection
        });
        continue;
      }

      const result =
        await migration.apply(
          context
        );

      state.applied =
        state.applied.filter(
          (entry) =>
            entry.id !==
            migration.id
        );

      state.applied.push({
        id:
          migration.id,
        appliedAt:
          new Date()
            .toISOString(),
        appliedBy:
          principal?.subject ||
          'system'
      });

      results.push({
        id:
          migration.id,
        status:
          'applied',
        result
      });
    }

    if (!dryRun) {
      await this.writeState(
        state
      );
    }

    this.eventBus?.publish?.(
      'system.migrations.completed',
      {
        dryRun,
        results
      }
    );

    return {
      dryRun,
      results,
      restartRequired:
        !dryRun &&
        results.some(
          (result) =>
            result.status ===
            'applied'
        )
    };
  }

  async assertNoPending() {
    const status =
      await this.status();

    if (status.pending > 0) {
      throw SystemServiceError
        .conflict(
          'PENDING_MIGRATIONS',
          'Függőben lévő rendszer-migrációk találhatók.',
          status
        );
    }

    return status;
  }
}

module.exports = {
  MIGRATIONS,
  MigrationService
};
