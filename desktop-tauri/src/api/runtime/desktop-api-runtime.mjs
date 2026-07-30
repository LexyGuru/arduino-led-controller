import {
  DesktopApiRuntimeError
} from './runtime-error.mjs';

export function isConnectivityFailure(error) {
  const status =
    Number(
      error?.status ||
      error?.statusCode ||
      0
    );

  if (status >= 400) {
    return false;
  }

  const code =
    String(
      error?.code ||
      ''
    ).toUpperCase();

  if (
    [
      'ECONNREFUSED',
      'ECONNRESET',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'ETIMEDOUT',
      'NETWORK_ERROR',
      'FETCH_ERROR'
    ].includes(code)
  ) {
    return true;
  }

  return (
    error instanceof TypeError &&
    /fetch|network|load failed/i.test(
      error.message || ''
    )
  );
}

export class DesktopApiRuntime {
  constructor({
    client,
    auth,
    connectivity,
    eventStream,
    cache
  } = {}) {
    if (!client) {
      throw new TypeError(
        'Az API kliens kötelező.'
      );
    }

    this.client = client;
    this.auth = auth;
    this.connectivity =
      connectivity;
    this.eventStream =
      eventStream;
    this.cache = cache;
    this.disposed = false;
  }

  assertActive() {
    if (this.disposed) {
      throw DesktopApiRuntimeError
        .disposed();
    }
  }

  async checkConnection() {
    this.assertActive();

    this.connectivity
      ?.markChecking?.({
        reconnecting:
          this.connectivity
            ?.snapshot?.()
            .online === false
      });

    try {
      const result =
        await this.client
          .getSystemHealth();

      this.connectivity
        ?.markOnline?.();

      return result;
    } catch (error) {
      this.connectivity
        ?.markOffline?.(
          error
        );

      throw error;
    }
  }

  async read(
    cacheKey,
    operation,
    {
      ttlMs,
      allowStaleOnError =
        true
    } = {}
  ) {
    this.assertActive();

    try {
      const result =
        await operation();

      this.connectivity
        ?.markOnline?.();

      this.cache?.set?.(
        cacheKey,
        result,
        {
          ttlMs
        }
      );

      return {
        data:
          result,
        source:
          'network',
        stale:
          false
      };
    } catch (error) {
      if (
        !isConnectivityFailure(
          error
        )
      ) {
        this.connectivity
          ?.markOnline?.();
        throw error;
      }

      this.connectivity
        ?.markOffline?.(
          error
        );

      const cached =
        this.cache?.get?.(
          cacheKey,
          {
            allowStale:
              allowStaleOnError
          }
        );

      if (cached) {
        return {
          data:
            cached.value,
          source:
            'cache',
          stale:
            cached.stale,
          ageMs:
            cached.ageMs,
          networkError:
            {
              code:
                error.code ||
                null,
              message:
                error.message ||
                String(error)
            }
        };
      }

      throw error;
    }
  }

  async write(operation) {
    this.assertActive();

    if (
      this.connectivity
        ?.snapshot?.()
        .online === false
    ) {
      throw DesktopApiRuntimeError
        .offline(
          this.connectivity
            .snapshot()
        );
    }

    try {
      const result =
        await operation();

      this.connectivity
        ?.markOnline?.();

      return result;
    } catch (error) {
      if (
        isConnectivityFailure(
          error
        )
      ) {
        this.connectivity
          ?.markOffline?.(
            error
          );
      } else {
        this.connectivity
          ?.markOnline?.();
      }

      throw error;
    }
  }

  async start() {
    this.assertActive();

    await this.checkConnection();

    await this.eventStream
      ?.start?.();

    return this.snapshot();
  }

  async dispose() {
    if (this.disposed) {
      return this.snapshot();
    }

    this.eventStream
      ?.stop?.();

    this.cache
      ?.clear?.();

    this.disposed = true;

    return this.snapshot();
  }

  snapshot() {
    return {
      disposed:
        this.disposed,
      connectivity:
        this.connectivity
          ?.snapshot?.() ||
        null,
      auth:
        this.auth
          ?.snapshot?.() ||
        null,
      realtime:
        this.eventStream
          ?.snapshot?.() ||
        null,
      cache:
        this.cache
          ?.snapshot?.() ||
        null
    };
  }
}
