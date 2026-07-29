export class DesktopFirmwareApi {
  constructor({
    client,
    runtime
  } = {}) {
    this.client = client;
    this.runtime = runtime;
  }

  status() {
    return this.runtime.read(
      'firmware:status',
      () =>
        this.client
          .getFirmwareStatus(),
      {
        ttlMs: 5000
      }
    );
  }

  check() {
    return this.runtime.write(
      () =>
        this.client
          .postFirmwareActionsCheck()
    );
  }

  update(payload = {}) {
    return this.runtime.write(
      () =>
        this.client
          .postFirmwareActionsUpdate({
            body:
              payload
          })
    );
  }

  cancel() {
    return this.runtime.write(
      () =>
        this.client
          .postFirmwareActionsCancel()
    );
  }

  backups() {
    return this.runtime.read(
      'firmware:backups',
      () =>
        this.client
          .getFirmwareBackups(),
      {
        ttlMs: 15000
      }
    );
  }

  rollback(backupId) {
    return this.runtime.write(
      () =>
        this.client
          .postFirmwareActionsRollback({
            body: {
              backupId
            }
          })
    );
  }
}
