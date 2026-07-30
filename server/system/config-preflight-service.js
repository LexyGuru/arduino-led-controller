'use strict';

const fs = require('fs');

const {
  isConfiguredSecret
} = require('../core/config');

function check(
  name,
  ok,
  {
    code = null,
    severity = 'error',
    details = null
  } = {}
) {
  return ok
    ? {
        name,
        ok: true
      }
    : {
        name,
        ok: false,
        code,
        severity,
        details
      };
}

class ConfigPreflightService {
  constructor({
    config,
    paths,
    apiTokenStore,
    logger = null
  } = {}) {
    this.config = config;
    this.paths = paths;
    this.apiTokenStore =
      apiTokenStore;
    this.logger = logger;
  }

  async pathCheck(
    name,
    targetPath,
    {
      create = false,
      file = false
    } = {}
  ) {
    try {
      if (create && !file) {
        await fs.promises.mkdir(
          targetPath,
          {
            recursive: true
          }
        );
      }

      const stats =
        await fs.promises.stat(
          targetPath
        );

      const valid =
        file
          ? stats.isFile()
          : stats.isDirectory();

      if (!valid) {
        return check(
          name,
          false,
          {
            code:
              file
                ? 'NOT_FILE'
                : 'NOT_DIRECTORY',
            details: {
              path:
                targetPath
            }
          }
        );
      }

      if (!file) {
        await fs.promises.access(
          targetPath,
          fs.constants.R_OK |
          fs.constants.W_OK
        );
      }

      return check(
        name,
        true
      );
    } catch (error) {
      return check(
        name,
        false,
        {
          code:
            error.code ||
            'PATH_CHECK_FAILED',
          details: {
            path:
              targetPath
          }
        }
      );
    }
  }

  async run() {
    const checks = [
      check(
        'arduinoApiPath',
        Boolean(
          this.config.arduino
            .apiPath
        ),
        {
          code:
            'ARDUINO_API_PATH_MISSING'
        }
      ),
      check(
        'arduinoApiKey',
        isConfiguredSecret(
          this.config.arduino
            .apiKey,
          24
        ),
        {
          code:
            'ARDUINO_API_KEY_INVALID'
        }
      ),
      ...(
        this.apiTokenStore
          ?.configurationChecks?.() ||
        []
      ),
      check(
        'cookieSecure',
        this.config.service
          .environment !==
          'production' ||
        this.config.security
          .cookieSecure === true,
        {
          code:
            'COOKIE_SECURE_DISABLED',
          severity:
            'warning'
        }
      ),
      check(
        'allowedOrigin',
        this.config.service
          .environment !==
          'production' ||
        !this.config.apiV2
          .allowedOrigins
          .includes('*'),
        {
          code:
            'WILDCARD_ORIGIN',
          severity:
            'warning'
        }
      )
    ];

    const pathChecks =
      await Promise.all([
        this.pathCheck(
          'dataDir',
          this.paths.dataDir,
          {
            create: true
          }
        ),
        this.pathCheck(
          'configDir',
          this.paths.configDir,
          {
            create: true
          }
        ),
        this.pathCheck(
          'schedulesDir',
          this.paths.schedulesDir,
          {
            create: true
          }
        ),
        this.pathCheck(
          'snapshotsDir',
          this.paths.snapshotsDir,
          {
            create: true
          }
        ),
        this.pathCheck(
          'migrationDir',
          this.paths.migrationDir,
          {
            create: true
          }
        ),
        this.pathCheck(
          'openApiDocument',
          this.paths
            .openApiDocumentFile,
          {
            file: true
          }
        )
      ]);

    checks.push(
      ...pathChecks
    );

    const blocking =
      checks.filter(
        (item) =>
          !item.ok &&
          item.severity !==
            'warning'
      );

    const warnings =
      checks.filter(
        (item) =>
          !item.ok &&
          item.severity ===
            'warning'
      );

    const result = {
      ready:
        blocking.length === 0,
      checks,
      summary: {
        total:
          checks.length,
        passed:
          checks.filter(
            (item) => item.ok
          ).length,
        blocking:
          blocking.length,
        warnings:
          warnings.length
      },
      generatedAt:
        new Date().toISOString()
    };

    this.logger?.info?.(
      'Konfigurációs preflight lefutott.',
      result.summary
    );

    return result;
  }
}

module.exports = {
  ConfigPreflightService,
  check
};
