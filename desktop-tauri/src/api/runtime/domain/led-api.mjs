export class DesktopLedApi {
  constructor({
    client,
    runtime
  } = {}) {
    this.client = client;
    this.runtime = runtime;
  }

  list() {
    return this.runtime.read(
      'leds:list',
      () =>
        this.client.getLeds(),
      {
        ttlMs: 5000
      }
    );
  }

  get(id) {
    return this.runtime.read(
      `leds:${id}`,
      () =>
        this.client
          .getLedsById({
            path: {
              id
            }
          }),
      {
        ttlMs: 5000
      }
    );
  }

  update(id, command) {
    return this.runtime.write(
      () =>
        this.client
          .putLedsById({
            path: {
              id
            },
            body:
              command
          })
    );
  }

  allOn(command = {}) {
    return this.runtime.write(
      () =>
        this.client
          .postLedsActionsAllOn({
            body:
              command
          })
    );
  }

  allOff() {
    return this.runtime.write(
      () =>
        this.client
          .postLedsActionsAllOff()
    );
  }

  reset() {
    return this.runtime.write(
      () =>
        this.client
          .postLedsActionsReset()
    );
  }
}
