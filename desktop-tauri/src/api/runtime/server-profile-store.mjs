import {
  DesktopApiRuntimeError
} from './runtime-error.mjs';

const DEFAULT_PROFILE = Object.freeze({
  id:
    'default',
  label:
    'Arduino LED Controller',
  baseUrl:
    'http://127.0.0.1:3000',
  authMode:
    'session'
});

function normalizeBaseUrl(value) {
  const raw =
    String(value || '')
      .trim()
      .replace(/\/+$/, '');

  if (!raw) {
    throw DesktopApiRuntimeError
      .invalidProfile(
        'A szerver címe kötelező.'
      );
  }

  let url;

  try {
    url =
      new URL(raw);
  } catch (error) {
    throw DesktopApiRuntimeError
      .invalidProfile(
        'Érvénytelen szervercím.',
        {
          value:
            raw
        }
      );
  }

  if (
    !['http:', 'https:']
      .includes(url.protocol)
  ) {
    throw DesktopApiRuntimeError
      .invalidProfile(
        'Csak HTTP vagy HTTPS szervercím használható.',
        {
          protocol:
            url.protocol
        }
      );
  }

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw DesktopApiRuntimeError
      .invalidProfile(
        'A szervercím nem tartalmazhat felhasználónevet, jelszót, queryt vagy fragmentet.'
      );
  }

  url.pathname =
    url.pathname.replace(
      /\/+$/,
      ''
    );

  return url.toString()
    .replace(/\/$/, '');
}

function normalizeProfile(input = {}) {
  const id =
    String(
      input.id ||
      'default'
    )
      .trim()
      .replace(
        /[^a-z0-9_-]/gi,
        '-'
      )
      .slice(0, 64) ||
    'default';

  const authMode =
    input.authMode ===
      'bearer'
      ? 'bearer'
      : 'session';

  return {
    id,
    label:
      String(
        input.label ||
        'Arduino LED Controller'
      )
        .trim()
        .slice(0, 80),
    baseUrl:
      normalizeBaseUrl(
        input.baseUrl ||
        DEFAULT_PROFILE.baseUrl
      ),
    authMode
  };
}

export class ServerProfileStore {
  constructor({
    storage = null,
    key =
      'arduino-led-controller.server-profile'
  } = {}) {
    this.storage =
      storage;
    this.key =
      String(key);
    this.profile =
      normalizeProfile(
        DEFAULT_PROFILE
      );
  }

  load() {
    if (!this.storage) {
      return this.get();
    }

    try {
      const raw =
        this.storage.getItem(
          this.key
        );

      if (!raw) {
        return this.get();
      }

      this.profile =
        normalizeProfile(
          JSON.parse(raw)
        );
    } catch (_) {
      this.profile =
        normalizeProfile(
          DEFAULT_PROFILE
        );
    }

    return this.get();
  }

  save(profile) {
    this.profile =
      normalizeProfile(
        profile
      );

    this.storage?.setItem?.(
      this.key,
      JSON.stringify(
        this.profile
      )
    );

    return this.get();
  }

  reset() {
    this.profile =
      normalizeProfile(
        DEFAULT_PROFILE
      );

    this.storage?.removeItem?.(
      this.key
    );

    return this.get();
  }

  get() {
    return {
      ...this.profile
    };
  }
}

export {
  DEFAULT_PROFILE,
  normalizeBaseUrl,
  normalizeProfile
};
