const VALID_STATES =
  new Set([
    'idle',
    'checking',
    'online',
    'offline',
    'reconnecting'
  ]);

function normalizeError(error) {
  if (!error) return null;

  return {
    name:
      error.name ||
      'Error',
    code:
      error.code ||
      null,
    message:
      error.message ||
      String(error)
  };
}

export class ConnectivityStore {
  constructor({
    now =
      () => new Date()
  } = {}) {
    this.now = now;
    this.listeners =
      new Set();
    this.state = {
      status:
        'idle',
      online:
        null,
      consecutiveFailures:
        0,
      lastSuccessAt:
        null,
      lastFailureAt:
        null,
      lastError:
        null
    };
  }

  subscribe(listener) {
    if (
      typeof listener !==
      'function'
    ) {
      throw new TypeError(
        'A listener függvény kötelező.'
      );
    }

    this.listeners.add(
      listener
    );

    listener(
      this.snapshot()
    );

    return () => {
      this.listeners.delete(
        listener
      );
    };
  }

  snapshot() {
    return {
      ...this.state,
      lastError:
        this.state.lastError
          ? {
              ...this.state
                .lastError
            }
          : null
    };
  }

  setStatus(status) {
    if (
      !VALID_STATES.has(
        status
      )
    ) {
      throw new TypeError(
        `Érvénytelen hálózati állapot: ${status}`
      );
    }

    this.state.status =
      status;
    this.emit();
  }

  markChecking({
    reconnecting = false
  } = {}) {
    this.state.status =
      reconnecting
        ? 'reconnecting'
        : 'checking';
    this.emit();
  }

  markOnline() {
    this.state = {
      ...this.state,
      status:
        'online',
      online:
        true,
      consecutiveFailures:
        0,
      lastSuccessAt:
        this.now()
          .toISOString(),
      lastError:
        null
    };

    this.emit();
  }

  markOffline(error = null) {
    this.state = {
      ...this.state,
      status:
        'offline',
      online:
        false,
      consecutiveFailures:
        this.state
          .consecutiveFailures +
        1,
      lastFailureAt:
        this.now()
          .toISOString(),
      lastError:
        normalizeError(
          error
        )
    };

    this.emit();
  }

  emit() {
    const snapshot =
      this.snapshot();

    for (
      const listener
      of this.listeners
    ) {
      listener(snapshot);
    }
  }
}
