'use strict';

const ROLES = Object.freeze({
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
});

const PERMISSIONS = Object.freeze({
  SYSTEM_READ: 'system:read',
  DIAGNOSTICS_READ: 'diagnostics:read',
  AUDIT_READ: 'audit:read',
  METRICS_READ: 'metrics:read',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  USER_READ: 'user:read',
  USER_ADMIN: 'user:admin',
  ARDUINO_READ: 'arduino:read',
  LED_READ: 'led:read',
  LED_WRITE: 'led:write',
  LED_ADMIN: 'led:admin',
  SCHEDULE_READ: 'schedule:read',
  SCHEDULE_WRITE: 'schedule:write',
  SCHEDULE_ADMIN: 'schedule:admin',
  FIRMWARE_READ: 'firmware:read',
  FIRMWARE_UPDATE: 'firmware:update'
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: Object.freeze([
    ...Object.values(
      PERMISSIONS
    )
  ]),
  [ROLES.OPERATOR]: Object.freeze([
    PERMISSIONS.SYSTEM_READ,
    PERMISSIONS.DIAGNOSTICS_READ,
    PERMISSIONS.METRICS_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.ARDUINO_READ,
    PERMISSIONS.LED_READ,
    PERMISSIONS.LED_WRITE,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.SCHEDULE_WRITE,
    PERMISSIONS.FIRMWARE_READ
  ]),
  [ROLES.VIEWER]: Object.freeze([
    PERMISSIONS.SYSTEM_READ,
    PERMISSIONS.ARDUINO_READ,
    PERMISSIONS.LED_READ,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.FIRMWARE_READ
  ])
});

function normalizeRole(
  value,
  fallback =
    ROLES.ADMIN
) {
  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();

  return Object.values(
    ROLES
  ).includes(normalized)
    ? normalized
    : fallback;
}

function permissionsForRole(
  role
) {
  const normalizedRole =
    normalizeRole(role);

  return (
    ROLE_PERMISSIONS[
      normalizedRole
    ] ||
    ROLE_PERMISSIONS[
      ROLES.VIEWER
    ]
  );
}

function hasPermission(
  role,
  permission
) {
  return permissionsForRole(
    role
  ).includes(
    permission
  );
}

function createPrincipal({
  subject =
    'api-v2-token',
  role =
    ROLES.ADMIN,
  type =
    'service-token'
} = {}) {
  const normalizedRole =
    normalizeRole(role);

  return Object.freeze({
    subject:
      String(
        subject ||
        'api-v2-token'
      ),
    type:
      String(
        type ||
        'service-token'
      ),
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
