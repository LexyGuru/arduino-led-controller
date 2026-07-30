export class DesktopLogApi {
  constructor({ client, runtime } = {}) {
    if (!client || !runtime) {
      throw new TypeError('A kliens és a desktop runtime kötelező.');
    }
    this.client = client;
    this.runtime = runtime;
  }

  consoleLogs({ force = false, allowStaleOnError = true } = {}) {
    return this.runtime.read(
      'logs:arduino-console',
      () => this.client.getArduinoConsoleLogs({
        query: {
          force: force ? '1' : undefined
        }
      }),
      {
        ttlMs: force ? 0 : 2500,
        allowStaleOnError
      }
    );
  }

  consoleStats() {
    return this.runtime.read(
      'logs:arduino-console-stats',
      () => this.client.getArduinoConsoleStats(),
      { ttlMs: 5000 }
    );
  }

  clearConsole() {
    return this.runtime.write(
      () => this.client.postArduinoConsoleActionsClear()
    );
  }

  auditRecent(limit = 100) {
    return this.runtime.read(
      `logs:audit:${limit}`,
      () => this.client.getAuditRecent({
        query: { limit }
      }),
      { ttlMs: 5000 }
    );
  }

  auditStatus() {
    return this.runtime.read(
      'logs:audit-status',
      () => this.client.getAuditStatus(),
      { ttlMs: 10000 }
    );
  }

  eventsRecent({ limit = 100, source = 'memory', topic } = {}) {
    return this.runtime.read(
      `logs:events:${source}:${topic || '*'}:${limit}`,
      () => this.client.getEventsRecent({
        query: { limit, source, topic }
      }),
      { ttlMs: 3000 }
    );
  }

  eventsStatus() {
    return this.runtime.read(
      'logs:events-status',
      () => this.client.getEventsStatus(),
      { ttlMs: 10000 }
    );
  }
}
