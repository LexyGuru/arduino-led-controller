'use strict';

const ROLES = Object.freeze({
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
});

const PERMISSIONS = Object.freeze({
  SYSTEM_READ: 'system:read',
  ARDUINO_READ: 'arduino:read',
  LED_READ: 'led:read',
  LED_WRITE: 'led:write',
  LED_ADMIN: 'led:admin'
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: Object.freeze([
    PERMISSIONS.SYSTEM_READ,
    PERMISSIONS.ARDUINO_READ,
    PERMISSIONS.LED_READ,
    PERMISSIONS.LED_WRITE,
    PERMISSIONS.LED_ADMIN
  ]),
  [ROLES.OPERATOR]: Object.freeze([
    PERMISSIONS.SYSTEM_READ,
    PERMISSIONS.ARDUINO_READ,
    PERMISSIONS.LED_READ,
    PERMISSIONS.LED_WRITE
  ]),
  [ROLES.VIEWER]: Object.freeze([
    PERMISSIONS.SYSTEM_READ,
    PERMISSIONS.ARDUINO_READ,
    PERMISSIONS.LED_READ
  ])
});

function normalizeRole(
  value,
  fallback = ROLES.ADMIN
) {
  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();

  return Object.values(ROLES)
    .includes(normalized)
      ? normalized
      : fallback;
}

function permissionsForRole(role) {
  const normalizedRole =
    normalizeRole(role);

  return ROLE_PERMISSIONS[
    normalizedRole
  ] || ROLE_PERMISSIONS[ROLES.VIEWER];
}

function hasPermission(
  role,
  permission
) {
  return permissionsForRole(role)
    .includes(permission);
}

function createPrincipal({
  subject = 'api-v2-token',
  role = ROLES.ADMIN,
  type = 'service-token'
} = {}) {
  const normalizedRole =
    normalizeRole(role);

  return Object.freeze({
    subject:
      String(subject || 'api-v2-token'),
    type:
      String(type || 'service-token'),
    role:
      normalizedRole,
    permissions:
      permissionsForRole(
        normalizedRole
      )
  });
}

module.exports = {
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  createPrincipal,
  hasPermission,
  normalizeRole,
  permissionsForRole
};
