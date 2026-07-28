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
  const receivedBuffer = Buffer.from(String(received || ''), 'utf8');
  const expectedBuffer = Buffer.from(String(expected || ''), 'utf8');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function normalizeTokenEntry(entry, index) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const token = String(entry.token || '').trim();

  if (!isConfiguredSecret(token, 32)) {
    return null;
  }

  return Object.freeze({
    id: String(entry.id || `api-token-${index + 1}`).trim().slice(0, 64),
    token,
    role: normalizeRole(entry.role, 'viewer'),
    enabled: entry.enabled !== false
  });
}

class ApiTokenStore {
  constructor({ entries = [], parseError = null } = {}) {
    this.entries = Object.freeze(
      entries.map(normalizeTokenEntry).filter(Boolean)
    );
    this.parseError = parseError ? String(parseError) : null;
  }

  configurationChecks() {
    const checks = [
      {
        name: 'apiV2Tokens',
        ok: this.entries.some((entry) => entry.enabled),
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
      check.ok ? { name: check.name, ok: true } : check
    ));
  }

  isConfigured() {
    return this.configurationChecks().every((check) => check.ok);
  }

  authenticate(token) {
    for (const entry of this.entries) {
      if (entry.enabled && safeTokenEquals(token, entry.token)) {
        return createPrincipal({
          subject: entry.id,
          role: entry.role,
          type: 'service-token'
        });
      }
    }

    return null;
  }

  publicSummary() {
    return this.entries.map((entry) => ({
      id: entry.id,
      role: entry.role,
      enabled: entry.enabled
    }));
  }

  static fromConfig(apiV2Config = {}) {
    const entries = Array.isArray(apiV2Config.tokens)
      ? [...apiV2Config.tokens]
      : [];

    if (entries.length === 0 && apiV2Config.token) {
      entries.push({
        id: 'legacy-api-v2-token',
        token: apiV2Config.token,
        role: apiV2Config.role || 'admin',
        enabled: true
      });
    }

    return new ApiTokenStore({
      entries,
      parseError: apiV2Config.tokensParseError
    });
  }
}

module.exports = {
  ApiTokenStore,
  normalizeTokenEntry,
  safeTokenEquals
};
