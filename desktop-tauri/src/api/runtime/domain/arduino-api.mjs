export class DesktopArduinoApi {
  constructor({
    client,
    runtime
  } = {}) {
    if (!client) {
      throw new TypeError(
        'Az API kliens kötelező.'
      );
    }

    if (!runtime) {
      throw new TypeError(
        'A desktop runtime kötelező.'
      );
    }

    this.client = client;
    this.runtime = runtime;
  }

  status({
    allowStaleOnError = true
  } = {}) {
    return this.runtime.read(
      'arduino:status',
      () =>
        this.client
          .getArduinoStatus(),
      {
        ttlMs: 5000,
        allowStaleOnError
      }
    );
  }

  monitor() {
    return this.runtime.read(
      'arduino:monitor',
      () =>
        this.client
          .getArduinoMonitor(),
      {
        ttlMs: 5000
      }
    );
  }

  pollMonitor() {
    return this.runtime.write(
      () =>
        this.client
          .postArduinoMonitorActionsPoll()
    );
  }
}
