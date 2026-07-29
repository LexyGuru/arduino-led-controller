function extractData(payload) {
  if (
    payload &&
    typeof payload ===
      'object' &&
    payload.success === true &&
    Object.hasOwn(
      payload,
      'data'
    )
  ) {
    return payload.data;
  }

  return payload;
}

export class DesktopAuthController {
  constructor({
    client,
    credentialVault,
    connectivityStore = null
  } = {}) {
    if (!client) {
      throw new TypeError(
        'Az API kliens kötelező.'
      );
    }

    if (!credentialVault) {
      throw new TypeError(
        'A credentialVault kötelező.'
      );
    }

    this.client = client;
    this.credentialVault =
      credentialVault;
    this.connectivityStore =
      connectivityStore;
    this.csrfToken = null;
    this.principal = null;
    this.mode = 'session';
    this.listeners =
      new Set();
  }

  subscribe(listener) {
    this.listeners.add(
      listener
    );

    listener(
      this.snapshot()
    );

    return () =>
      this.listeners.delete(
        listener
      );
  }

  snapshot() {
    return {
      mode:
        this.mode,
      authenticated:
        Boolean(
          this.principal
        ),
      principal:
        this.principal,
      csrfTokenPresent:
        Boolean(
          this.csrfToken
        ),
      vault:
        this.credentialVault
          .snapshot?.() ||
        null
    };
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

  async bearerToken() {
    return this.credentialVault
      .getBearerToken();
  }

  currentCsrfToken() {
    return this.csrfToken;
  }

  async useBearerToken(token) {
    await this.credentialVault
      .setBearerToken(token);

    this.mode =
      'bearer';

    await this.refresh();

    return this.snapshot();
  }

  async login({
    username,
    password
  } = {}) {
    this.mode =
      'session';

    await this.credentialVault
      .clearBearerToken();

    const response =
      await this.client
        .postAuthLogin({
          body: {
            username:
              String(
                username || ''
              ),
            password:
              String(
                password || ''
              )
          }
        });

    const data =
      extractData(response);

    this.principal =
      data?.principal ||
      data?.user ||
      data ||
      null;

    await this.refreshCsrf();

    this.connectivityStore
      ?.markOnline?.();

    this.emit();

    return this.snapshot();
  }

  async refreshCsrf() {
    if (
      this.mode !==
      'session'
    ) {
      this.csrfToken = null;
      return null;
    }

    const response =
      await this.client
        .getAuthCsrf();

    const data =
      extractData(response);

    this.csrfToken =
      data?.csrfToken ||
      data?.token ||
      null;

    this.emit();

    return this.csrfToken;
  }

  async refresh() {
    try {
      const response =
        await this.client
          .getAuthStatus();

      const data =
        extractData(response);

      this.principal =
        data?.principal ||
        data?.user ||
        (
          data?.authenticated
            ? data
            : null
        );

      if (
        this.mode ===
          'session' &&
        this.principal
      ) {
        await this.refreshCsrf();
      }

      this.connectivityStore
        ?.markOnline?.();

      this.emit();

      return this.snapshot();
    } catch (error) {
      this.connectivityStore
        ?.markOffline?.(
          error
        );

      throw error;
    }
  }

  async logout() {
    try {
      if (this.principal) {
        await this.client
          .postAuthLogout();
      }
    } finally {
      await this.credentialVault
        .clear();

      this.csrfToken = null;
      this.principal = null;
      this.mode =
        'session';
      this.emit();
    }

    return this.snapshot();
  }
}
