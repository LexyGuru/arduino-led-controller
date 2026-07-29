export class DesktopScheduleApi {
  constructor({
    client,
    runtime
  } = {}) {
    this.client = client;
    this.runtime = runtime;
  }

  listLocal() {
    return this.runtime.read(
      'local-schedules:list',
      () =>
        this.client
          .getLocalSchedules(),
      {
        ttlMs: 10000
      }
    );
  }

  createLocal(schedule) {
    return this.runtime.write(
      () =>
        this.client
          .postLocalSchedules({
            body:
              schedule
          })
    );
  }

  updateLocal(id, schedule) {
    return this.runtime.write(
      () =>
        this.client
          .putLocalSchedulesById({
            path: {
              id
            },
            body:
              schedule
          })
    );
  }

  deleteLocal(id) {
    return this.runtime.write(
      () =>
        this.client
          .deleteLocalSchedulesById({
            path: {
              id
            }
          })
    );
  }

  listFiles() {
    return this.runtime.read(
      'schedule-files:list',
      () =>
        this.client
          .getFilesSchedules(),
      {
        ttlMs: 15000
      }
    );
  }

  uploadFile(payload) {
    return this.runtime.write(
      () =>
        this.client
          .postFilesSchedules({
            body:
              payload
          })
    );
  }

  forceTick() {
    return this.runtime.write(
      () =>
        this.client
          .postLocalSchedulesRunnerActionsTick()
    );
  }
}
