'use strict';

const fs = require('fs');
const path = require('path');

const {
  SystemServiceError
} = require('./system-error');

function normalizeReason(value) {
  const reason =
    String(value || '')
      .trim()
      .slice(0, 240);

  return reason ||
    'Tervezett karbantartás.';
}

class MaintenanceModeService {
  constructor({
    stateFile,
    logger = null,
    eventBus = null,
    initialEnabled = false
  } = {}) {
    if (
      typeof stateFile !== 'string' ||
      !stateFile.trim()
    ) {
      throw new TypeError(
        'A maintenance state fájlútvonala kötelező.'
      );
    }

    this.stateFile = stateFile;
    this.logger = logger;
    this.eventBus = eventBus;
    this.state = {
      enabled:
        initialEnabled === true,
      reason:
        initialEnabled
          ? 'Környezeti változóval aktivált karbantartás.'
          : null,
      enabledAt: null,
      enabledBy: null
    };

    this.load();
  }

  load() {
    try {
      if (
        !fs.existsSync(
          this.stateFile
        )
      ) {
        return this.getStatus();
      }

      const parsed =
        JSON.parse(
          fs.readFileSync(
            this.stateFile,
            'utf8'
          )
        );

      this.state = {
        enabled:
          parsed.enabled === true,
        reason:
          parsed.enabled
            ? normalizeReason(
                parsed.reason
              )
            : null,
        enabledAt:
          parsed.enabledAt || null,
        enabledBy:
          parsed.enabledBy || null
      };
    } catch (error) {
      this.logger?.warn?.(
        'A maintenance state betöltése sikertelen.',
        {
          code:
            error.code,
          message:
            error.message
        }
      );
    }

    return this.getStatus();
  }

  async persist() {
    await fs.promises.mkdir(
      path.dirname(
        this.stateFile
      ),
      {
        recursive: true
      }
    );

    const temporary =
      `${this.stateFile}.tmp-${process.pid}-${Date.now()}`;

    await fs.promises.writeFile(
      temporary,
      `${JSON.stringify(
        this.state,
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
      this.stateFile
    );
  }

  getStatus() {
    return {
      ...this.state
    };
  }

  isEnabled() {
    return this.state.enabled;
  }

  async enable({
    reason,
    principal = null
  } = {}) {
    if (this.state.enabled) {
      throw SystemServiceError
        .conflict(
          'MAINTENANCE_ALREADY_ENABLED',
          'A karbantartási mód már aktív.',
          this.getStatus()
        );
    }

    this.state = {
      enabled: true,
      reason:
        normalizeReason(reason),
      enabledAt:
        new Date().toISOString(),
      enabledBy:
        principal?.subject ||
        'system'
    };

    await this.persist();

    this.eventBus?.publish?.(
      'system.maintenance.enabled',
      this.getStatus()
    );

    this.logger?.warn?.(
      'Karbantartási mód aktiválva.',
      this.getStatus()
    );

    return this.getStatus();
  }

  async disable({
    principal = null
  } = {}) {
    const previous =
      this.getStatus();

    this.state = {
      enabled: false,
      reason: null,
      enabledAt: null,
      enabledBy: null
    };

    await this.persist();

    this.eventBus?.publish?.(
      'system.maintenance.disabled',
      {
        previous,
        disabledBy:
          principal?.subject ||
          'system',
        disabledAt:
          new Date().toISOString()
      }
    );

    this.logger?.info?.(
      'Karbantartási mód kikapcsolva.'
    );

    return this.getStatus();
  }
}

function createMaintenanceMiddleware({
  serviceProvider,
  errorSender
} = {}) {
  if (
    typeof serviceProvider !==
      'function'
  ) {
    throw new TypeError(
      'A maintenance serviceProvider kötelező.'
    );
  }

  if (
    typeof errorSender !==
      'function'
  ) {
    throw new TypeError(
      'A maintenance errorSender kötelező.'
    );
  }

  return function maintenanceMiddleware(
    req,
    res,
    next
  ) {
    const service =
      serviceProvider();

    if (!service?.isEnabled?.()) {
      return next();
    }

    if (
      ['GET', 'HEAD', 'OPTIONS']
        .includes(req.method)
    ) {
      return next();
    }

    if (
      req.path ===
        '/system/maintenance' ||
      req.originalUrl ===
        '/api/v2/system/maintenance' ||
      req.originalUrl ===
        '/api/v2/auth/logout'
    ) {
      return next();
    }

    return errorSender(
      req,
      res,
      new SystemServiceError(
        503,
        'MAINTENANCE_MODE',
        'A rendszer karbantartási módban van.',
        service.getStatus()
      )
    );
  };
}

module.exports = {
  MaintenanceModeService,
  createMaintenanceMiddleware,
  normalizeReason
};
