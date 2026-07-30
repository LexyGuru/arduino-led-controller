export class DesktopLedApi {
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

  list({
    allowStaleOnError = true
  } = {}) {
    return this.runtime.read(
      'leds:list',
      () =>
        this.client.getLeds(),
      {
        ttlMs: 3000,
        allowStaleOnError
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
        ttlMs: 3000
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

  updateMany(commands) {
    if (
      !Array.isArray(commands)
    ) {
      throw new TypeError(
        'A LED parancslista tömb legyen.'
      );
    }

    return Promise.all(
      commands.map(
        (entry) =>
          this.update(
            entry.id,
            entry.command
          )
      )
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
