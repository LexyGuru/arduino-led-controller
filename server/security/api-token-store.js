'use strict';

const crypto = require('crypto');

const {
  isConfiguredSecret
} = require('../core/config');

const {
  createPrincipal,
  normalizeRole
} = require('./roles');

function safeTokenEquals(received, expected) {
  const receivedBuffer = Buffer.from(
    String(received || ''),
    'utf8'
  );

  const expectedBuffer = Buffer.from(
    String(expected || ''),
    'utf8'
  );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(String(token || ''), 'utf8')
    .digest('hex');
}

function safeHashEquals(receivedHash, expectedHash) {
  return safeTokenEquals(
    String(receivedHash || '').toLowerCase(),
    String(expectedHash || '').toLowerCase()
  );
}

function normalizeTokenEntry(entry, index) {
  if (
    !entry ||
    typeof entry !== 'object' ||
    Array.isArray(entry)
  ) {
    return null;
  }

  const token = String(entry.token || '').trim();

  if (!isConfiguredSecret(token, 32)) {
    return null;
  }

  return Object.freeze({
    id:
      String(
        entry.id ||
        `api-token-${index + 1}`
      )
        .trim()
        .slice(0, 64),
    token,
    tokenHash: hashToken(token),
    role: normalizeRole(
      entry.role,
      'viewer'
    ),
    enabled: entry.enabled !== false,
    source: 'configuration',
    expiresAt: null
  });
}

function normalizeManagedEntry(entry) {
  if (
    !entry ||
    typeof entry !== 'object' ||
    !/^[a-f0-9]{64}$/i.test(
      String(entry.tokenHash || '')
    )
  ) {
    return null;
  }

  return Object.freeze({
    id: String(entry.id || '').trim(),
    label: String(entry.label || entry.id || '').trim(),
    tokenHash:
      String(entry.tokenHash)
        .toLowerCase(),
    role: normalizeRole(
      entry.role,
      'viewer'
    ),
    enabled: entry.enabled !== false,
    source: 'managed',
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || null,
    expiresAt: entry.expiresAt || null,
    rotatedFrom: entry.rotatedFrom || null
  });
}

function isEntryActive(entry, now = Date.now()) {
  if (!entry.enabled) return false;

  if (!entry.expiresAt) return true;

  const expiresAt = new Date(
    entry.expiresAt
  ).getTime();

  return (
    Number.isFinite(expiresAt) &&
    expiresAt > now
  );
}

class ApiTokenStore {
  constructor({ entries = [], parseError = null } = {}) {
    this.staticEntries = Object.freeze(
      entries
        .map(normalizeTokenEntry)
        .filter(Boolean)
    );

    this.managedEntries = Object.freeze([]);
    this.parseError = parseError
      ? String(parseError)
      : null;
  }

  get entries() {
    return Object.freeze([
      ...this.staticEntries,
      ...this.managedEntries
    ]);
  }

  replaceManagedEntries(entries = []) {
    this.managedEntries = Object.freeze(
      entries
        .map(normalizeManagedEntry)
        .filter(Boolean)
    );

    return this.managedEntries;
  }

  configurationChecks() {
    const checks = [
      {
        name: 'apiV2Tokens',
        ok: this.entries.some(
          (entry) => isEntryActive(entry)
        ),
        code: 'API_V2_TOKEN_INVALID'
      }
    ];

    if (this.parseError) {
      checks.push({
        name: 'apiV2TokensJson',
        ok: false,
        code: 'API_V2_TOKENS_JSON_INVALID'
      });
    }

    return checks.map((check) => (
      check.ok
        ? { name: check.name, ok: true }
        : check
    ));
  }

  isConfigured() {
    return this.configurationChecks()
      .every((check) => check.ok);
  }

  authenticate(token) {
    const received = String(token || '');
    const receivedHash = hashToken(received);
    const now = Date.now();

    for (const entry of this.entries) {
      if (!isEntryActive(entry, now)) {
        continue;
      }

      const matches =
        entry.source === 'managed'
          ? safeHashEquals(
              receivedHash,
              entry.tokenHash
            )
          : safeTokenEquals(
              received,
              entry.token
            );

      if (matches) {
        return createPrincipal({
          subject: entry.id,
          role: entry.role,
          type: 'service-token'
        });
      }
    }

    return null;
  }

  hasActiveStaticAdmin() {
    return this.staticEntries.some(
      (entry) =>
        entry.role === 'admin' &&
        isEntryActive(entry)
    );
  }

  publicSummary() {
    return this.entries.map((entry) => ({
      id: entry.id,
      role: entry.role,
      enabled:
        isEntryActive(entry)
    }));
  }

  detailedSummary() {
    return this.entries.map((entry) => ({
      id: entry.id,
      label: entry.label || entry.id,
      role: entry.role,
      enabled: entry.enabled,
      active: isEntryActive(entry),
      source: entry.source,
      createdAt: entry.createdAt || null,
      updatedAt: entry.updatedAt || null,
      expiresAt: entry.expiresAt || null,
      rotatedFrom: entry.rotatedFrom || null
    }));
  }

  static fromConfig(apiV2Config = {}) {
    const entries = Array.isArray(
      apiV2Config.tokens
    )
      ? [...apiV2Config.tokens]
      : [];

    if (
      entries.length === 0 &&
      apiV2Config.token
    ) {
      entries.push({
        id: 'legacy-api-v2-token',
        token: apiV2Config.token,
        role: apiV2Config.role || 'admin',
        enabled: true
      });
    }

    return new ApiTokenStore({
      entries,
      parseError:
        apiV2Config.tokensParseError
    });
  }
}

module.exports = {
  ApiTokenStore,
  hashToken,
  isEntryActive,
  normalizeManagedEntry,
  normalizeTokenEntry,
  safeHashEquals,
  safeTokenEquals
};
