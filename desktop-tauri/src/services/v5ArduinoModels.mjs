import {
  unwrapApiPayload
} from '../api/ui/api-payload.mjs';

function numberOrUndefined(
  value
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : undefined;
}

function booleanOrUndefined(
  value
) {
  if (
    typeof value ===
      'boolean'
  ) {
    return value;
  }

  if (
    value === 1 ||
    value === '1' ||
    value === 'true'
  ) {
    return true;
  }

  if (
    value === 0 ||
    value === '0' ||
    value === 'false'
  ) {
    return false;
  }

  return undefined;
}

export function normalizeArduinoStatus(
  value,
  fallback = null
) {
  const payload =
    unwrapApiPayload(value) ||
    {};

  const status =
    payload.status &&
    typeof payload.status ===
      'object'
      ? payload.status
      : payload;

  const fallbackValue =
    fallback &&
    typeof fallback ===
      'object'
      ? fallback
      : {};

  return {
    ...fallbackValue,
    connected:
      payload.connected ===
        true ||
      status.connected ===
        true,
    firmwareVersion:
      status.firmwareVersion ??
      status.version ??
      fallbackValue
        .firmwareVersion,
    ipAddress:
      status.ipAddress ??
      status.ip ??
      fallbackValue.ipAddress,
    hostname:
      status.hostname ??
      fallbackValue.hostname,
    localHostname:
      status.localHostname ??
      fallbackValue
        .localHostname,
    otaPort:
      numberOrUndefined(
        status.otaPort
      ) ??
      fallbackValue.otaPort,
    otaEnabled:
      booleanOrUndefined(
        status.otaEnabled
      ) ??
      fallbackValue
        .otaEnabled,
    rssi:
      numberOrUndefined(
        status.rssi
      ) ??
      fallbackValue.rssi,
    uptime:
      numberOrUndefined(
        status.uptime
      ) ??
      fallbackValue.uptime,
    freeMemory:
      numberOrUndefined(
        status.freeMemory ??
        status.memory
      ) ??
      fallbackValue
        .freeMemory,
    currentTime:
      status.currentTime ??
      status.time ??
      fallbackValue
        .currentTime,
    scheduleCount:
      numberOrUndefined(
        status.scheduleCount ??
        status.schedules
      ) ??
      fallbackValue
        .scheduleCount,
    http:
      status.http ??
      fallbackValue.http,
    latencyMs:
      numberOrUndefined(
        payload.latencyMs
      )
  };
}

export function dashboardDataSource({
  authenticated,
  online,
  responseSource,
  error
} = {}) {
  if (
    authenticated &&
    responseSource ===
      'network'
  ) {
    return 'api-v2';
  }

  if (
    authenticated &&
    responseSource ===
      'cache'
  ) {
    return 'api-v2-cache';
  }

  if (
    error &&
    authenticated
  ) {
    return 'legacy-fallback';
  }

  if (
    !online ||
    !authenticated
  ) {
    return 'legacy-direct';
  }

  return 'legacy-direct';
}
