import {
  DesktopApiRuntimeError
} from './runtime-error.mjs';

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

export class VolatileCredentialVault {
  #token = null;

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
      backend:
        'memory'
    };
  }
}

export class TauriCredentialVault {
  constructor({
    invoke,
    service =
      'arduino-led-controller',
    account =
      'api-v2-bearer'
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
  }

  async getBearerToken() {
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

    return value
      ? String(value)
      : null;
  }

  async setBearerToken(value) {
    const token =
      normalizeToken(value);

    if (!token) {
      await this.clearBearerToken();
      return null;
    }

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

    return token;
  }

  async clearBearerToken() {
    await this.invoke(
      'credential_delete',
      {
        service:
          this.service,
        account:
          this.account
      }
    );
  }

  async clear() {
    await this.clearBearerToken();
  }

  snapshot() {
    return {
      bearerTokenPresent:
        null,
      persistent:
        true,
      backend:
        'tauri-command'
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
