export class DesktopScheduleApi {
  constructor({ client, runtime } = {}) {
    if (!client || !runtime) {
      throw new TypeError('A kliens és a desktop runtime kötelező.');
    }
    this.client = client;
    this.runtime = runtime;
  }

  listLocal({ allowStaleOnError = true } = {}) {
    return this.runtime.read(
      'local-schedules:list',
      () => this.client.getLocalSchedules(),
      { ttlMs: 5000, allowStaleOnError }
    );
  }

  exportLocal() {
    return this.runtime.read(
      'local-schedules:export',
      () => this.client.getLocalSchedulesExport(),
      { ttlMs: 0, allowStaleOnError: false }
    );
  }

  replaceAll(schedules) {
    return this.runtime.write(
      () => this.client.postLocalSchedulesImport({
        body: { schedules }
      })
    );
  }

  createLocal(schedule) {
    return this.runtime.write(
      () => this.client.postLocalSchedules({ body: schedule })
    );
  }

  updateLocal(id, schedule) {
    return this.runtime.write(
      () => this.client.putLocalSchedulesById({
        path: { id },
        body: schedule
      })
    );
  }

  deleteLocal(id) {
    return this.runtime.write(
      () => this.client.deleteLocalSchedulesById({
        path: { id }
      })
    );
  }

  syncArduino() {
    return this.runtime.write(
      () => this.client.postLocalSchedulesActionsSyncArduino()
    );
  }

  runnerStatus() {
    return this.runtime.read(
      'local-schedules:runner',
      () => this.client.getLocalSchedulesRunner(),
      { ttlMs: 5000 }
    );
  }

  forceTick() {
    return this.runtime.write(
      () => this.client.postLocalSchedulesRunnerActionsTick({
        body: { force: true }
      })
    );
  }

  arduinoOverview() {
    return this.runtime.read(
      'arduino-schedules:overview',
      () => this.client.getSchedules(),
      { ttlMs: 10000 }
    );
  }

  arduinoStatus() {
    return this.runtime.read(
      'arduino-schedules:status',
      () => this.client.getSchedulesStatus(),
      { ttlMs: 5000 }
    );
  }

  reloadArduino() {
    return this.runtime.write(
      () => this.client.postSchedulesActionsReload()
    );
  }

  generateArduino() {
    return this.runtime.write(
      () => this.client.postSchedulesActionsGenerate()
    );
  }

  clearArduino() {
    return this.runtime.write(
      () => this.client.deleteSchedules()
    );
  }
}
