export class DesktopFirmwareApi {
  constructor({ client, runtime } = {}) {
    if (!client || !runtime) {
      throw new TypeError('A kliens és a desktop runtime kötelező.');
    }
    this.client = client;
    this.runtime = runtime;
  }

  status({ allowStaleOnError = true } = {}) {
    return this.runtime.read(
      'firmware:status',
      () => this.client.getFirmwareStatus(),
      { ttlMs: 3000, allowStaleOnError }
    );
  }

  check() {
    return this.runtime.write(
      () => this.client.postFirmwareActionsCheck()
    );
  }

  update(payload = {}) {
    return this.runtime.write(
      () => this.client.postFirmwareActionsUpdate({ body: payload })
    );
  }

  cancel() {
    return this.runtime.write(
      () => this.client.postFirmwareActionsCancel()
    );
  }

  backups() {
    return this.runtime.read(
      'firmware:backups',
      () => this.client.getFirmwareBackups(),
      { ttlMs: 5000 }
    );
  }

  rollback(backupId) {
    return this.runtime.write(
      () => this.client.postFirmwareActionsRollback({
        body: { backupId }
      })
    );
  }

  deleteBackup(id) {
    return this.runtime.write(
      () => this.client.deleteFirmwareBackupsById({
        path: { id }
      })
    );
  }
}
