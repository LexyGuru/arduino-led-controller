'use strict';

const crypto = require('crypto');

const {
  EVENT_TOPICS
} = require('../events/topics');

const {
  normalizeRole
} = require('./roles');

const {
  SecurityServiceError
} = require('./security-error');

function hashApiToken(token) {
  return crypto
    .createHash('sha256')
    .update(String(token || ''), 'utf8')
    .digest('hex');
}

function normalizeExpiration(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const parsed = new Date(value);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getTime() <= Date.now()
  ) {
    throw new SecurityServiceError(
      400,
      'API_TOKEN_EXPIRATION_INVALID',
      'A token lejárata jövőbeli ISO dátum legyen.'
    );
  }

  return parsed.toISOString();
}

function publicManagedToken(record) {
  return {
    id: record.id,
    label: record.label,
    role: record.role,
    enabled: record.enabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    expiresAt: record.expiresAt,
    rotatedFrom: record.rotatedFrom,
    source: 'managed'
  };
}

class ApiTokenService {
  constructor({
    repository,
    tokenStore,
    eventBus = null,
    auditLog = null,
    logger = null,
    tokenBytes = 32
  } = {}) {
    if (!repository || !tokenStore) {
      throw new TypeError(
        'Az API-token szolgáltatáshoz repository és tokenStore szükséges.'
      );
    }

    this.repository = repository;
    this.tokenStore = tokenStore;
    this.eventBus = eventBus;
    this.auditLog = auditLog;
    this.logger = logger;
    this.tokenBytes = Math.max(
      24,
      Math.min(
        64,
        Number(tokenBytes) || 32
      )
    );

    this.records = [];
  }

  initialize() {
    this.records = [
      ...this.repository.readSync()
    ];

    this.tokenStore.replaceManagedEntries(
      this.records
    );

    return this.list();
  }

  list() {
    return this.records.map(
      publicManagedToken
    );
  }

  findRequired(id) {
    const record = this.records.find(
      (candidate) =>
        candidate.id === String(id || '')
    );

    if (!record) {
      throw new SecurityServiceError(
        404,
        'API_TOKEN_NOT_FOUND',
        'A kezelt API-token nem található.',
        { id }
      );
    }

    return record;
  }

  createSecret() {
    return `alc2_${crypto
      .randomBytes(this.tokenBytes)
      .toString('base64url')}`;
  }

  createId() {
    return `tok_${crypto
      .randomUUID()
      .replace(/-/g, '')}`;
  }

  validateRole(value) {
    const raw = String(value || '')
      .trim()
      .toLowerCase();

    const normalized = normalizeRole(
      raw,
      '__invalid__'
    );

    if (normalized === '__invalid__') {
      throw new SecurityServiceError(
        400,
        'API_TOKEN_ROLE_INVALID',
        'A token szerepköre admin, operator vagy viewer lehet.'
      );
    }

    return normalized;
  }

  activeAdminExists(records) {
    if (this.tokenStore.hasActiveStaticAdmin()) {
      return true;
    }

    const now = Date.now();

    return records.some((record) => (
      record.enabled === true &&
      record.role === 'admin' &&
      (
        !record.expiresAt ||
        new Date(record.expiresAt).getTime() > now
      )
    ));
  }

  assertActiveAdmin(records) {
    if (!this.activeAdminExists(records)) {
      throw new SecurityServiceError(
        409,
        'LAST_API_ADMIN_TOKEN',
        'Legalább egy aktív admin API-tokennek meg kell maradnia.'
      );
    }
  }

  async persist(records) {
    const stored = await this.repository
      .writeAtomic(records);

    this.records = [...stored];
    this.tokenStore.replaceManagedEntries(
      this.records
    );

    return this.records;
  }

  async publish(topic, payload) {
    this.eventBus?.publish?.(
      topic,
      payload
    );

    await this.auditLog?.write?.({
      action: topic,
      resource: 'api-token',
      details: payload
    });
  }

  async create(input = {}, metadata = {}) {
    const token = this.createSecret();
    const now = new Date().toISOString();

    const record = {
      id: this.createId(),
      label:
        String(input.label || 'API token')
          .trim()
          .slice(0, 96),
      tokenHash: hashApiToken(token),
      role: this.validateRole(
        input.role || 'viewer'
      ),
      enabled: input.enabled !== false,
      createdAt: now,
      updatedAt: now,
      expiresAt: normalizeExpiration(
        input.expiresAt
      ),
      rotatedFrom: input.rotatedFrom || null
    };

    const records = [
      ...this.records,
      record
    ];

    this.assertActiveAdmin(records);
    await this.persist(records);

    await this.publish(
      EVENT_TOPICS.API_TOKEN_CREATED,
      {
        id: record.id,
        label: record.label,
        role: record.role,
        actor: metadata.actor || null
      }
    );

    return {
      token,
      record: publicManagedToken(record),
      warning:
        'A token most látható utoljára; biztonságosan mentsd el.'
    };
  }

  async update(id, input = {}, metadata = {}) {
    const current = this.findRequired(id);
    const now = new Date().toISOString();

    const updated = {
      ...current,
      label:
        input.label === undefined
          ? current.label
          : String(input.label)
              .trim()
              .slice(0, 96),
      role:
        input.role === undefined
          ? current.role
          : this.validateRole(input.role),
      enabled:
        input.enabled === undefined
          ? current.enabled
          : input.enabled === true,
      expiresAt:
        input.expiresAt === undefined
          ? current.expiresAt
          : normalizeExpiration(input.expiresAt),
      updatedAt: now
    };

    const records = this.records.map(
      (record) =>
        record.id === current.id
          ? updated
          : record
    );

    this.assertActiveAdmin(records);
    await this.persist(records);

    await this.publish(
      EVENT_TOPICS.API_TOKEN_UPDATED,
      {
        id: updated.id,
        role: updated.role,
        enabled: updated.enabled,
        actor: metadata.actor || null
      }
    );

    return publicManagedToken(updated);
  }

  async rotate(id, input = {}, metadata = {}) {
    const current = this.findRequired(id);

    const disabled = this.records.map(
      (record) =>
        record.id === current.id
          ? {
              ...record,
              enabled: false,
              updatedAt:
                new Date().toISOString()
            }
          : record
    );

    const token = this.createSecret();
    const now = new Date().toISOString();

    const replacement = {
      id: this.createId(),
      label:
        String(
          input.label ||
          `${current.label} (rotated)`
        )
          .trim()
          .slice(0, 96),
      tokenHash: hashApiToken(token),
      role:
        input.role === undefined
          ? current.role
          : this.validateRole(input.role),
      enabled: true,
      createdAt: now,
      updatedAt: now,
      expiresAt:
        input.expiresAt === undefined
          ? current.expiresAt
          : normalizeExpiration(input.expiresAt),
      rotatedFrom: current.id
    };

    const records = [
      ...disabled,
      replacement
    ];

    this.assertActiveAdmin(records);
    await this.persist(records);

    await this.publish(
      EVENT_TOPICS.API_TOKEN_ROTATED,
      {
        previousId: current.id,
        id: replacement.id,
        role: replacement.role,
        actor: metadata.actor || null
      }
    );

    return {
      token,
      record: publicManagedToken(replacement),
      previous: publicManagedToken({
        ...current,
        enabled: false,
        updatedAt: now
      }),
      warning:
        'Az új token most látható utoljára; biztonságosan mentsd el.'
    };
  }

  async remove(id, metadata = {}) {
    const current = this.findRequired(id);
    const records = this.records.filter(
      (record) => record.id !== current.id
    );

    this.assertActiveAdmin(records);
    await this.persist(records);

    await this.publish(
      EVENT_TOPICS.API_TOKEN_REMOVED,
      {
        id: current.id,
        role: current.role,
        actor: metadata.actor || null
      }
    );

    return {
      removed: true,
      id: current.id
    };
  }
}

module.exports = {
  ApiTokenService,
  hashApiToken,
  normalizeExpiration,
  publicManagedToken
};
