'use strict';

class ShutdownCoordinator {
  constructor({
    lifecycle,
    logger = null,
    eventBus = null,
    graceMs = 10000,
    exit = (code) => process.exit(code)
  } = {}) {
    if (!lifecycle) {
      throw new TypeError(
        'A ShutdownCoordinator számára LifecycleManager szükséges.'
      );
    }

    this.lifecycle = lifecycle;
    this.logger = logger;
    this.eventBus = eventBus;
    this.graceMs = Math.max(1000, Number(graceMs) || 10000);
    this.exit = exit;
    this.cleanups = [];
    this.started = false;
    this.installed = false;
    this.handlers = new Map();
  }

  register(name, cleanup) {
    const normalizedName = String(name || '').trim();

    if (!normalizedName || typeof cleanup !== 'function') {
      throw new TypeError(
        'A shutdown cleanup neve és függvénye kötelező.'
      );
    }

    this.cleanups.push({
      name: normalizedName,
      cleanup
    });

    return this;
  }

  async shutdown(reason = 'shutdown', {
    exitCode = 0,
    shouldExit = true
  } = {}) {
    if (this.started) {
      return {
        alreadyStarted: true,
        lifecycle: this.lifecycle.snapshot()
      };
    }

    this.started = true;
    this.lifecycle.beginDrain(reason);

    this.eventBus?.publish?.(
      'system.draining',
      {
        reason: String(reason)
      }
    );

    const results = [];

    const timeout = new Promise((resolve) => {
      const timer = setTimeout(
        () => resolve({
          timedOut: true
        }),
        this.graceMs
      );
      timer.unref?.();
    });

    const cleanupTask = (async () => {
      for (const item of [...this.cleanups].reverse()) {
        try {
          await item.cleanup(reason);
          results.push({
            name: item.name,
            ok: true
          });
        } catch (error) {
          results.push({
            name: item.name,
            ok: false,
            message: error.message
          });

          this.logger?.error?.(
            'Shutdown cleanup hiba.',
            {
              cleanup: item.name,
              message: error.message
            }
          );
        }
      }

      return {
        timedOut: false
      };
    })();

    const completion = await Promise.race([
      cleanupTask,
      timeout
    ]);

    this.lifecycle.markStopped(reason);

    if (shouldExit) {
      this.exit(exitCode);
    }

    return {
      ...completion,
      results,
      lifecycle: this.lifecycle.snapshot()
    };
  }

  installProcessHandlers() {
    if (this.installed) {
      return;
    }

    for (const signal of ['SIGTERM', 'SIGINT']) {
      const handler = () => {
        this.shutdown(signal, {
          exitCode: 0,
          shouldExit: true
        }).catch((error) => {
          this.logger?.error?.(
            'A szabályos leállítás sikertelen.',
            {
              signal,
              message: error.message
            }
          );
          this.exit(1);
        });
      };

      this.handlers.set(signal, handler);
      process.once(signal, handler);
    }

    this.installed = true;
  }

  uninstallProcessHandlers() {
    for (const [signal, handler] of this.handlers) {
      process.off(signal, handler);
    }

    this.handlers.clear();
    this.installed = false;
  }
}

module.exports = {
  ShutdownCoordinator
};
