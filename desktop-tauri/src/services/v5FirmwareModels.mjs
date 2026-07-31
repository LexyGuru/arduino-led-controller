import { unwrapApiPayload } from '../api/ui/api-payload.mjs';

const progressByState = {
  idle: 0,
  checking: 10,
  downloading: 30,
  uploading: 62,
  restarting: 86,
  'rollback-loading': 18,
  'rollback-uploading': 60,
  'rollback-restarting': 86,
  success: 100,
  cancelled: 0,
  error: 0
};

export function normalizeFirmwareBackup(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    id: String(source.id || ''),
    fileName: String(source.fileName || ''),
    size: Number(source.size || 0),
    sha256: String(source.sha256 || ''),
    createdAt: source.createdAt || null,
    installedAt: source.installedAt || null,
    installedVersion: source.installedVersion || null,
    lastKnownGood: source.lastKnownGood === true,
    source: source.source || null,
    artifact: source.artifact || null
  };
}

export function normalizeFirmwareBackups(value) {
  const payload = unwrapApiPayload(value);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.backups)
      ? payload.backups
      : [];

  return list
    .map(normalizeFirmwareBackup)
    .filter((backup) => backup.id);
}

export function normalizeFirmwareStatus(value, fallback = null) {
  const payload = unwrapApiPayload(value) || {};
  const source = {
    ...(fallback && typeof fallback === 'object' ? fallback : {}),
    ...payload
  };
  const state = String(source.state || 'idle');
  const progress = Number.isFinite(Number(source.progress))
    ? Math.min(100, Math.max(0, Number(source.progress)))
    : progressByState[state] ?? 0;

  return {
    ...source,
    state,
    message: String(
      source.message || 'Nincs folyamatban firmware-művelet.'
    ),
    progress,
    phase: source.phase || state,
    installedVersion: source.installedVersion || null,
    arduinoOnline: source.arduinoOnline === true,
    networkConfigStored: source.networkConfigStored === true,
    otaConfigured: source.otaConfigured === true,
    otaToolInstalled: source.otaToolInstalled === true,
    otaPasswordConfigured: source.otaPasswordConfigured === true,
    backupStoreConfigured: source.backupStoreConfigured === true,
    availableFirmware: source.availableFirmware || null,
    firmwareLookupError: source.firmwareLookupError || null,
    operation: source.operation || null,
    startedAt: source.startedAt || null,
    finishedAt: source.finishedAt || null,
    backups: normalizeFirmwareBackups(source.backups || [])
  };
}

export function firmwareEventToProgress(event) {
  const payload =
    event?.payload && typeof event.payload === 'object'
      ? event.payload
      : event?.data && typeof event.data === 'object'
        ? event.data
        : {};
  const state = String(payload.state || 'updating');

  return {
    timestamp: Date.parse(event?.timestamp || '') || Date.now(),
    stage: state,
    level:
      state === 'error'
        ? 'error'
        : state === 'success'
          ? 'success'
          : state === 'cancelled'
            ? 'warn'
            : 'info',
    message: String(
      payload.message || event?.topic || 'Firmware állapotváltozás'
    ),
    progress: progressByState[state] ?? undefined
  };
}

export function isFirmwareBusy(status) {
  return [
    'checking',
    'downloading',
    'uploading',
    'restarting',
    'cancelling',
    'rollback-loading',
    'rollback-uploading',
    'rollback-restarting'
  ].includes(String(status?.state || ''));
}

export function isFirmwareEvent(event) {
  return String(event?.topic || '').startsWith('firmware.');
}
