function unwrapEvents(payload) {
  const source =
    payload?.success === true
      ? payload.data
      : payload;

  if (
    Array.isArray(source)
  ) {
    return source;
  }

  if (
    Array.isArray(
      source?.events
    )
  ) {
    return source.events;
  }

  if (
    Array.isArray(
      source?.items
    )
  ) {
    return source.items;
  }

  return [];
}

function eventKey(event) {
  if (
    event &&
    event.id !==
      undefined
  ) {
    return `id:${event.id}`;
  }

  return JSON.stringify([
    event?.topic,
    event?.timestamp,
    event?.createdAt,
    event?.data
  ]);
}

export class DesktopEventStream {
  constructor({
    client,
    socketFactory = null,
    pollingIntervalMs =
      5000,
    recentLimit =
      100,
    maximumSeenEvents =
      1000,
    setTimeoutFn =
      setTimeout,
    clearTimeoutFn =
      clearTimeout
  } = {}) {
    if (!client) {
      throw new TypeError(
        'Az API kliens kötelező.'
      );
    }

    this.client = client;
    this.socketFactory =
      socketFactory;
    this.pollingIntervalMs =
      Math.max(
        1000,
        Number(
          pollingIntervalMs
        ) || 5000
      );
    this.recentLimit =
      Math.max(
        1,
        Math.min(
          500,
          Number(recentLimit) ||
          100
        )
      );
    this.maximumSeenEvents =
      Math.max(
        this.recentLimit,
        Number(
          maximumSeenEvents
        ) || 1000
      );
    this.setTimeoutFn =
      setTimeoutFn;
    this.clearTimeoutFn =
      clearTimeoutFn;
    this.listeners =
      new Set();
    this.seen =
      new Map();
    this.timer = null;
    this.socket = null;
    this.running = false;
    this.mode = 'stopped';
    this.lastError = null;
  }

  subscribe(listener) {
    this.listeners.add(
      listener
    );

    return () =>
      this.listeners.delete(
        listener
      );
  }

  snapshot() {
    return {
      running:
        this.running,
      mode:
        this.mode,
      seenEvents:
        this.seen.size,
      lastError:
        this.lastError
          ? {
              name:
                this.lastError.name,
              message:
                this.lastError.message,
              code:
                this.lastError.code ||
                null
            }
          : null
    };
  }

  emit(event) {
    const key =
      eventKey(event);

    if (this.seen.has(key)) {
      return false;
    }

    this.seen.set(
      key,
      Date.now()
    );

    while (
      this.seen.size >
      this.maximumSeenEvents
    ) {
      const oldest =
        this.seen.keys()
          .next()
          .value;

      this.seen.delete(
        oldest
      );
    }

    for (
      const listener
      of this.listeners
    ) {
      listener(event);
    }

    return true;
  }

  async start() {
    if (this.running) {
      return this.snapshot();
    }

    this.running = true;
    this.lastError = null;

    if (
      typeof this.socketFactory ===
        'function'
    ) {
      try {
        this.socket =
          await this.socketFactory();

        if (
          this.socket &&
          typeof this.socket.on ===
            'function'
        ) {
          this.mode =
            'socket';

          this.socket.on(
            'v5:event',
            (event) =>
              this.emit(event)
          );

          this.socket.on(
            'connect_error',
            (error) => {
              this.lastError =
                error;
              this.startPollingFallback();
            }
          );

          return this.snapshot();
        }
      } catch (error) {
        this.lastError =
          error;
      }
    }

    this.startPollingFallback();

    return this.snapshot();
  }

  startPollingFallback() {
    if (!this.running) {
      return;
    }

    this.mode =
      'polling';

    if (this.timer) {
      this.clearTimeoutFn(
        this.timer
      );
      this.timer = null;
    }

    void this.poll();
  }

  async poll() {
    if (
      !this.running ||
      this.mode !==
        'polling'
    ) {
      return;
    }

    try {
      const payload =
        await this.client
          .getEventsRecent({
            query: {
              limit:
                this.recentLimit
            }
          });

      for (
        const event
        of unwrapEvents(payload)
      ) {
        this.emit(event);
      }

      this.lastError = null;
    } catch (error) {
      this.lastError =
        error;
    } finally {
      if (
        this.running &&
        this.mode ===
          'polling'
      ) {
        this.timer =
          this.setTimeoutFn(
            () => {
              void this.poll();
            },
            this.pollingIntervalMs
          );
      }
    }
  }

  stop() {
    this.running = false;
    this.mode =
      'stopped';

    if (this.timer) {
      this.clearTimeoutFn(
        this.timer
      );
      this.timer = null;
    }

    this.socket
      ?.off?.(
        'v5:event'
      );

    this.socket
      ?.disconnect?.();

    this.socket = null;

    return this.snapshot();
  }
}

export {
  eventKey,
  unwrapEvents
};
