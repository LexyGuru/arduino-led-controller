import {
  unwrapApiPayload
} from '../api/ui/api-payload.mjs';

export function normalizeRelease(value) {
  const payload =
    unwrapApiPayload(value) ||
    {};

  return {
    service:
      payload.service ||
      'arduino-led-controller',
    version:
      payload.version ||
      'ismeretlen',
    environment:
      payload.environment ||
      'ismeretlen',
    lifecycle:
      payload.lifecycle?.state ||
      payload.lifecycle ||
      'ismeretlen',
    maintenance:
      payload.maintenance
        ?.enabled === true,
    migrationPending:
      Number(
        payload.migrations
          ?.pending ||
        0
      ),
    channel:
      payload.release
        ?.channel ||
      'alpha',
    candidate:
      payload.release
        ?.candidate ||
      '',
    commit:
      payload.release
        ?.commit ||
      '',
    builtAt:
      payload.release
        ?.builtAt ||
      '',
    openApiSha256:
      payload.openApi
        ?.sha256 ||
      ''
  };
}

export function normalizePreflight(value) {
  const payload =
    unwrapApiPayload(value) ||
    {};

  const checks =
    Array.isArray(
      payload.checks
    )
      ? payload.checks
      : [];

  return {
    ready:
      payload.ready === true,
    checks,
    summary: {
      total:
        Number(
          payload.summary
            ?.total ||
          checks.length
        ),
      passed:
        Number(
          payload.summary
            ?.passed ||
          checks.filter(
            (item) =>
              item.ok === true
          ).length
        ),
      blocking:
        Number(
          payload.summary
            ?.blocking ||
          checks.filter(
            (item) =>
              item.ok !== true &&
              item.severity !==
                'warning'
          ).length
        ),
      warnings:
        Number(
          payload.summary
            ?.warnings ||
          checks.filter(
            (item) =>
              item.ok !== true &&
              item.severity ===
                'warning'
          ).length
        )
    }
  };
}

export function normalizeMaintenance(value) {
  const payload =
    unwrapApiPayload(value) ||
    {};

  return {
    enabled:
      payload.enabled === true,
    reason:
      payload.reason ||
      null,
    enabledAt:
      payload.enabledAt ||
      null,
    enabledBy:
      payload.enabledBy ||
      null
  };
}

export function normalizeSnapshots(value) {
  const payload =
    unwrapApiPayload(value);

  const list =
    Array.isArray(payload)
      ? payload
      : (
          Array.isArray(
            payload?.snapshots
          )
            ? payload.snapshots
            : []
        );

  return list.map(
    (snapshot) => ({
      id:
        String(
          snapshot.id ||
          ''
        ),
      label:
        String(
          snapshot.label ||
          ''
        ),
      createdAt:
        snapshot.createdAt ||
        null,
      createdBy:
        snapshot.createdBy ||
        null,
      files:
        Number(
          snapshot.files ||
          0
        )
    })
  );
}

export function normalizeMigrations(value) {
  const payload =
    unwrapApiPayload(value) ||
    {};

  const migrations =
    Array.isArray(
      payload.migrations
    )
      ? payload.migrations
      : [];

  return {
    pending:
      Number(
        payload.pending ||
        migrations.filter(
          (item) =>
            item.required ===
              true
        ).length
      ),
    migrations
  };
}

export function formatDateTime(value) {
  if (!value) {
    return '–';
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return String(value);
  }

  return parsed
    .toLocaleString(
      'hu-HU',
      {
        dateStyle:
          'short',
        timeStyle:
          'medium'
      }
    );
}
