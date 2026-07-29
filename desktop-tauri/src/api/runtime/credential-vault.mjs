import {
  DesktopApiRuntimeError
} from './runtime-error.mjs';

const DEFAULT_SERVICE =
  'arduino-led-controller';

const DEFAULT_ACCOUNT =
  'api-v2-bearer';

function normalizeToken(value) {
  const token =
    String(value || '')
      .trim();

  if (!token) {
    return null;
  }

  if (token.length < 16) {
    throw new DesktopApiRuntimeError(
      'TOKEN_TOO_SHORT',
      'Az API-token túl rövid.'
    );
  }

  return token;
}

function errorView(error) {
  return {
    code:
      String(
        error?.code ||
        'CREDENTIAL_STORE_ERROR'
      ),
    message:
      String(
        error?.message ||
        error ||
        'A credential művelet sikertelen.'
      )
  };
}

export class VolatileCredentialVault {
  #token = null;

  async probe() {
    return this.snapshot();
  }

  async getBearerToken() {
    return this.#token;
  }

  async setBearerToken(value) {
    this.#token =
      normalizeToken(value);

    return this.#token;
  }

  async clearBearerToken() {
    this.#token = null;
  }

  async clear() {
    await this.clearBearerToken();
  }

  snapshot() {
    return {
      bearerTokenPresent:
        Boolean(this.#token),
      persistent:
        false,
      available:
        true,
      supported:
        true,
      fallbackActive:
        false,
      backend:
        'memory',
      platformBackend:
        'Folyamatmemória',
      platform:
        'web',
      lastError:
        null
    };
  }
}

export class TauriCredentialVault {
  constructor({
    invoke,
    service =
      DEFAULT_SERVICE,
    account =
      DEFAULT_ACCOUNT
  } = {}) {
    if (
      typeof invoke !==
      'function'
    ) {
      throw new TypeError(
        'A Tauri invoke függvény kötelező.'
      );
    }

    this.invoke =
      invoke;
    this.service =
      String(service);
    this.account =
      String(account);

    this.fallback =
      new VolatileCredentialVault();

    this.state = {
      bearerTokenPresent:
        null,
      persistent:
        true,
      available:
        null,
      supported:
        true,
      fallbackActive:
        false,
      backend:
        'native-keyring',
      platformBackend:
        'Natív operációs rendszer kulcstár',
      platform:
        'desktop',
      lastError:
        null
    };
  }

  async probe() {
    try {
      const response =
        await this.invoke(
          'credential_status',
          {
            service:
              this.service,
            account:
              this.account
          }
        );

      this.state = {
        ...this.state,
        bearerTokenPresent:
          typeof response
            ?.present ===
            'boolean'
            ? response.present
            : null,
        persistent:
          response
            ?.available ===
            true,
        available:
          response
            ?.available ===
            true,
        supported:
          response
            ?.supported !==
            false,
        fallbackActive:
          response
            ?.available !==
            true,
        platformBackend:
          String(
            response?.backend ||
            this.state
              .platformBackend
          ),
        platform:
          String(
            response?.platform ||
            this.state.platform
          ),
        lastError:
          response?.errorCode
            ? {
                code:
                  String(
                    response
                      .errorCode
                  ),
                message:
                  'A natív kulcstár jelenleg nem érhető el.'
              }
            : null
      };
    } catch (error) {
      this.state = {
        ...this.state,
        persistent:
          false,
        available:
          false,
        fallbackActive:
          true,
        lastError:
          errorView(error)
      };
    }

    return this.snapshot();
  }

  async ensureProbed() {
    if (
      this.state.available ===
        null
    ) {
      await this.probe();
    }

    return this.state.available ===
      true;
  }

  async getBearerToken() {
    const nativeAvailable =
      await this.ensureProbed();

    if (!nativeAvailable) {
      return this.fallback
        .getBearerToken();
    }

    try {
      const value =
        await this.invoke(
          'credential_get',
          {
            service:
              this.service,
            account:
              this.account
          }
        );

      const token =
        value
          ? String(value)
          : null;

      this.state = {
        ...this.state,
        bearerTokenPresent:
          Boolean(token),
        lastError:
          null
      };

      return token;
    } catch (error) {
      this.state = {
        ...this.state,
        persistent:
          false,
        available:
          false,
        fallbackActive:
          true,
        lastError:
          errorView(error)
      };

      return this.fallback
        .getBearerToken();
    }
  }

  async setBearerToken(value) {
    const token =
      normalizeToken(value);

    if (!token) {
      await this.clearBearerToken();
      return null;
    }

    const nativeAvailable =
      await this.ensureProbed();

    if (!nativeAvailable) {
      await this.fallback
        .setBearerToken(token);

      this.state = {
        ...this.state,
        bearerTokenPresent:
          true,
        persistent:
          false,
        fallbackActive:
          true
      };

      return token;
    }

    try {
      await this.invoke(
        'credential_set',
        {
          service:
            this.service,
          account:
            this.account,
          secret:
            token
        }
      );

      this.state = {
        ...this.state,
        bearerTokenPresent:
          true,
        persistent:
          true,
        fallbackActive:
          false,
        lastError:
          null
      };

      return token;
    } catch (error) {
      await this.fallback
        .setBearerToken(token);

      this.state = {
        ...this.state,
        bearerTokenPresent:
          true,
        persistent:
          false,
        available:
          false,
        fallbackActive:
          true,
        lastError:
          errorView(error)
      };

      return token;
    }
  }

  async clearBearerToken() {
    await this.fallback
      .clearBearerToken();

    const nativeAvailable =
      await this.ensureProbed();

    if (nativeAvailable) {
      try {
        await this.invoke(
          'credential_delete',
          {
            service:
              this.service,
            account:
              this.account
          }
        );
      } catch (error) {
        this.state = {
          ...this.state,
          lastError:
            errorView(error)
        };

        throw error;
      }
    }

    this.state = {
      ...this.state,
      bearerTokenPresent:
        false
    };
  }

  async clear() {
    await this.clearBearerToken();
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
}

export function createCredentialVault({
  invoke = null,
  allowPersistentBearer =
    false
} = {}) {
  if (
    allowPersistentBearer &&
    typeof invoke ===
      'function'
  ) {
    return new TauriCredentialVault({
      invoke
    });
  }

  return new VolatileCredentialVault();
}

export {
  DEFAULT_ACCOUNT,
  DEFAULT_SERVICE,
  normalizeToken
};
