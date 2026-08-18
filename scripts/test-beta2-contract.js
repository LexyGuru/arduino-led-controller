const fs = require('fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const compact = (text) => text.replace(/\s+/g, ' ');

const files = {
  controller: read('desktop-tauri/src/hooks/useController.ts'),
  dashboard: read('desktop-tauri/src/pages/DashboardPage.tsx'),
  app: read('desktop-tauri/src/App.tsx'),
  ledsHook: read('desktop-tauri/src/hooks/useV5Leds.ts'),
  ledsPage: read('desktop-tauri/src/pages/LedsPage.tsx'),
  schedules: read('desktop-tauri/src/pages/SchedulesPage.tsx'),
  logs: read('desktop-tauri/src/pages/LogsPage.tsx'),
  health: read('desktop-tauri/src/components/v55/DeviceHealthPanel.tsx'),
  types: read('desktop-tauri/src/types/index.ts'),
  main: read('desktop-tauri/src/main.tsx'),
  css: read('desktop-tauri/src/v551-beta2-reliability.css'),
  zip: read('desktop-tauri/src/utils/diagnosticsZip.ts'),
  i18n: read('desktop-tauri/src/i18n/runtime.ts'),
  rust: read('desktop-tauri/src-tauri/src/lib.rs'),
  desktopCapability: read('desktop-tauri/src-tauri/capabilities/default.json'),
  logLocalization: read('desktop-tauri/src/utils/logLocalization.ts'),
  dataSourceBadge: read('desktop-tauri/src/components/v5/V5DataSourceBadge.tsx'),
  logToolbar: read('desktop-tauri/src/components/v5/V5LogToolbar.tsx'),
  tauriAuditService: read('desktop-tauri/src/services/tauriAudit.ts'),
  ledBulkActions: read('desktop-tauri/src/components/v5/V5LedBulkActions.tsx'),
  firmwarePage: read('desktop-tauri/src/pages/FirmwarePage.tsx'),
  firmwareLocalization: read('desktop-tauri/src/utils/firmwareLocalization.ts'),
  schedulesPage: read('desktop-tauri/src/pages/SchedulesPage.tsx')
};

function must(text, token, label = token) {
  if (!text.includes(token)) {
    throw new Error(`BETA2 contract missing: ${label}`);
  }
}

function pattern(text, regex, label) {
  if (!regex.test(text)) {
    throw new Error(`BETA2 contract pattern missing: ${label}`);
  }
}

// ------------------------------------------------------------------
// 1. Reliability semantics.
// ------------------------------------------------------------------
for (const token of [
  'export interface ConnectionHealthState',
  "'healthy'",
  "'recovering'",
  "'offline'",
  "'unconfigured'",
  'consecutiveFailures',
  'pollIntervalMs',
  'lastSuccessAt',
  'lastFailureAt'
]) {
  must(files.types, token, `health model ${token}`);
}

const controllerCompact = compact(files.controller);

pattern(
  controllerCompact,
  /failures\s*>=\s*5\s*\?\s*'offline'\s*:\s*'recovering'/,
  'offline/recovering threshold'
);
pattern(
  controllerCompact,
  /5_000\s*\*\s*2\s*\*\*\s*Math\.min/,
  'exponential reconnect backoff'
);
pattern(
  controllerCompact,
  /document\.visibilityState\s*===\s*'visible'/,
  'visibility-aware recovery'
);
pattern(
  controllerCompact,
  /addEventListener\(\s*'online'/,
  'online recovery trigger'
);

if (/setInterval[\s\S]{0,160}20_000/.test(files.controller)) {
  throw new Error('BETA2 obsolete fixed 20s polling detected');
}

// ------------------------------------------------------------------
// 2. Device Health: behavior + i18n key usage.
// Never assert the exact t(...) call syntax.
// ------------------------------------------------------------------
for (const token of [
  'DeviceHealthPanel',
  'connectionHealth',
  'networkLogs'
]) {
  must(files.dashboard + files.app, token, `health dashboard ${token}`);
}

must(files.health, 'onRetry: () => void', 'Device Health retry prop');
must(files.dashboard, 'dashboard.refresh()', 'Device Health retry behavior');

for (const key of [
  'beta2.health.eyebrow',
  'beta2.health.title',
  'beta2.health.retryNow',
  'beta2.health.lastError',
  'beta2.health.noError'
]) {
  must(files.health, key, `Device Health i18n key ${key}`);
}

// Dynamic health-state translation.
must(files.health, 'beta2.health.state.${health.state}', 'dynamic health state i18n');
must(files.health, 'beta2.health.message.${health.state}', 'dynamic health message i18n');

// ------------------------------------------------------------------
// 3. Scene: actual actions + i18n keys.
// ------------------------------------------------------------------
for (const token of [
  'export type V5SceneId',
  "'relax'",
  "'movie'",
  "'gaming'",
  "'party'",
  "'all-off'",
  'applyScene',
  'updateMany'
]) {
  must(files.ledsHook, token, `scene behavior ${token}`);
}

for (const scene of ['relax', 'movie', 'gaming', 'party', 'all-off']) {
  must(
    files.ledsPage,
    `state.applyScene('${scene}')`,
    `scene button action ${scene}`
  );
}

for (const key of [
  'beta2.scene.eyebrow',
  'beta2.scene.title',
  'beta2.scene.subtitle',
  'beta2.scene.relax',
  'beta2.scene.movie',
  'beta2.scene.gaming',
  'beta2.scene.party',
  'beta2.scene.allOff'
]) {
  must(files.ledsPage, key, `scene i18n key ${key}`);
}

must(files.ledsHook, 'beta2.scene.directResult', 'localized Direct scene result key');
must(files.ledsHook, 'beta2.scene.apiResult', 'localized API scene result key');

// ------------------------------------------------------------------
// 4. Schedule Copy Day: behavior + parameterized i18n keys.
// ------------------------------------------------------------------
for (const token of [
  'copyDaySchedules',
  'copySourceDay',
  'copyTargetDays',
  'crypto.randomUUID()'
]) {
  must(files.schedules, token, `schedule copy behavior ${token}`);
}

// Preview semantics are checked independently from translation call syntax.
must(
  files.schedules,
  'draft.filter((item) => item.day === copySourceDay).length',
  'schedule preview source count'
);
must(
  files.schedules,
  'copyTargetDays.filter((day) => day !== copySourceDay).length',
  'schedule preview target count'
);

for (const key of [
  'beta2.schedule.eyebrow',
  'beta2.schedule.title',
  'beta2.schedule.sourceDay',
  'beta2.schedule.targetDays',
  'beta2.schedule.preview',
  'beta2.schedule.copy',
  'beta2.schedule.empty',
  'beta2.schedule.sameDayOnly',
  'beta2.schedule.copied',
  'beta2.schedule.saveHint'
]) {
  must(files.schedules, key, `schedule i18n key ${key}`);
}

// ------------------------------------------------------------------
// 5. Diagnostics: export behavior + i18n key.
// ------------------------------------------------------------------
for (const token of [
  'createDiagnosticsZip',
  'exportDiagnostics',
  'diagnostics.json',
  'arduino.log',
  'network.log',
  'audit.log',
  'saveNativeExport',
  "invoke<string>('write_export_file'",
  "kind: 'zip' | 'log'"
]) {
  must(files.logs, token, `diagnostics/native export behavior ${token}`);
}

must(
  files.logs,
  'beta2.diagnostics.export',
  'Diagnostics action i18n key'
);

if (files.logs.includes('URL.createObjectURL(')) {
  throw new Error('BETA2 browser Blob/object-URL export path still present in LogsPage');
}
if (files.logs.includes("document.createElement('a')")) {
  throw new Error('BETA2 browser anchor export path still present in LogsPage');
}

for (const token of [
  '0x04034b50',
  '0x02014b50',
  '0x06054b50'
]) {
  must(files.zip, token, `zip byte structure ${token}`);
}

must(files.zip, 'return zipBytes;', 'ZIP builder returns Uint8Array bytes');

if (files.zip.includes('new Blob(')) {
  throw new Error('BETA2 diagnostics ZIP builder still returns a browser Blob');
}

if (files.zip.includes('application/zip')) {
  throw new Error('BETA2 diagnostics ZIP builder still carries obsolete Blob MIME metadata');
}

// ------------------------------------------------------------------
// 6. HU / EN / DE dictionary parity.
// ------------------------------------------------------------------
const beta2Keys = [
  'beta2.health.eyebrow',
  'beta2.health.title',
  'beta2.health.state.healthy',
  'beta2.health.state.recovering',
  'beta2.health.state.unconfigured',
  'beta2.health.state.offline',
  'beta2.health.message.healthy',
  'beta2.health.message.recovering',
  'beta2.health.message.unconfigured',
  'beta2.health.message.offline',
  'beta2.health.consecutiveFailures',
  'beta2.health.nextPolling',
  'beta2.health.lastSuccess',
  'beta2.health.lastFailure',
  'beta2.health.wifi',
  'beta2.health.networkErrors',
  'beta2.health.retryNow',
  'beta2.health.lastError',
  'beta2.health.noError',
  'beta2.scene.eyebrow',
  'beta2.scene.title',
  'beta2.scene.subtitle',
  'beta2.scene.relax',
  'beta2.scene.movie',
  'beta2.scene.gaming',
  'beta2.scene.party',
  'beta2.scene.allOff',
  'beta2.scene.directResult',
  'beta2.scene.apiResult',
  'beta2.schedule.eyebrow',
  'beta2.schedule.title',
  'beta2.schedule.sourceDay',
  'beta2.schedule.targetDays',
  'beta2.schedule.copy',
  'beta2.schedule.empty',
  'beta2.schedule.sameDayOnly',
  'beta2.schedule.preview',
  'beta2.schedule.copied',
  'beta2.schedule.saveHint',
  'beta2.diagnostics.export'
];

for (const key of beta2Keys) {
  const hits = files.i18n.split(`"${key}"`).length - 1;
  if (hits !== 3) {
    throw new Error(
      `BETA2 i18n parity failed for ${key}: expected 3, got ${hits}`
    );
  }
}

// ------------------------------------------------------------------
// 7. Hardcoded visible-text guard.
// ------------------------------------------------------------------
const forbiddenVisible = [
  'DEVICE CONTROL & RELIABILITY',
  'Device Health',
  'CONFIGURATION REQUIRED',
  'Arduino kapcsolat stabil.',
  'Automatikus kapcsolat-helyreállítás folyamatban.',
  'Hibák egymás után',
  'Következő polling',
  'Network hibák',
  'SCENE / PRESET',
  'Gyors jelenetek',
  'Egy kattintással komplett LED állapotot küld mindhárom csatornára.',
  '\n            Relax\n',
  '\n            Movie\n',
  '\n            Gaming\n',
  '\n            Party\n',
  '\n            All Off\n',
  'SCHEDULE 2.0',
  'Nap másolása',
  '\n            Forrásnap\n',
  'Célnapok',
  '\n            Másolás\n',
  'Nincs másolható program vagy nincs célnap kiválasztva.',
  'A forrásnap nem lehet az egyetlen célnap.',
  '\n            Diagnostics ZIP\n'
];

const uiScope = [
  files.health,
  files.ledsPage,
  files.schedules,
  files.logs
].join('\n');

for (const value of forbiddenVisible) {
  if (uiScope.includes(value)) {
    throw new Error(
      `BETA2 hardcoded visible UI text detected: ${JSON.stringify(value)}`
    );
  }
}

// ------------------------------------------------------------------
// 8. Integration / CSS.
// ------------------------------------------------------------------
must(
  files.main,
  './v551-beta2-reliability.css',
  'Beta.2 stylesheet import'
);

for (const token of [
  '.beta2-health-panel',
  '.beta2-health-actions',
  '.beta2-scene-actions',
  '.beta2-schedule-copy',
  '.beta2-copy-preview'
]) {
  must(files.css, token, `Beta.2 CSS ${token}`);
}

// ------------------------------------------------------------------
// 9. Contract self-policy:
// no source assertion may depend on exact t('key') invocation syntax.
// ------------------------------------------------------------------
const self = fs.readFileSync(__filename, 'utf8');
const brittlePatterns = [
  /must\([^,\n]+,\s*["`]t\('/,
  /must\([^,\n]+,\s*["`]translate\('/
];

for (const brittle of brittlePatterns) {
  if (brittle.test(self)) {
    throw new Error(
      `BETA2 contract contains forbidden implementation-specific i18n assertion: ${brittle}`
    );
  }
}

console.log('BETA2_RELIABILITY_SEMANTICS=PASSED');
console.log('BETA2_DEVICE_HEALTH_SEMANTIC_I18N=PASSED');
console.log('BETA2_SCENE_SEMANTIC_I18N=PASSED');
console.log('BETA2_SCHEDULE_COPY_SEMANTIC_I18N_PREVIEW=PASSED');
must(files.rust, 'fn write_export_file(', 'native export Rust command');
must(files.rust, 'validated_export_target', 'native export target validation');
must(files.rust, 'write_export_file,', 'native export command registration');
must(files.desktopCapability, 'dialog:allow-save', 'native save dialog capability');
console.log('BETA2_NATIVE_EXPORT_SANDBOX_RECOVERY=PASSED');
console.log('BETA2_DIAGNOSTICS_SEMANTIC_I18N=PASSED');
console.log('BETA2_I18N_PARITY_HU_EN_DE=PASSED');
console.log('BETA2_HARDCODED_VISIBLE_TEXT_GUARD=PASSED');
console.log('BETA2_NO_EXACT_I18N_CALL_SYNTAX_ASSERTIONS=PASSED');
for (const key of [
  'logs.sourceBadge.directTauri',
  'logs.toolbar.searchPlaceholder',
  'logs.toolbar.clearConfirm',
  'logs.toolbar.clearArduino',
  'logs.summary.network',
  'logs.summary.error',
  'logsEvent.firmware.catalog.check',
  'logsEvent.schedule.reload',
  'logsEvent.led.test.stop',
  'logsEvent.led.manual.on',
  'logsEvent.led.manual.off',
  'logsEvent.ota.start',
  'logsEvent.ota.cancel',
  'logsEvent.network.get.remote',
  'logsEvent.network.get.local',
  'logsEvent.network.apiKey.invalidHeader',
  'logsEvent.network.arduino.unreachable'
]) {
  const hits = files.i18n.split(`"${key}"`).length - 1;
  if (hits !== 3) {
    throw new Error(`Logs HU/EN/DE i18n parity failed for ${key}: ${hits}`);
  }
}

for (const forbidden of [
  'Közvetlen Tauri',
  'Arduino konzol törlése',
  'Szűrés üzenetre, témára, útvonalra…',
  'Biztosan törlöd az Arduino konzolt?'
]) {
  if (files.dataSourceBadge.includes(forbidden) || files.logToolbar.includes(forbidden)) {
    throw new Error(`Logs hardcoded HU UI text detected: ${forbidden}`);
  }
}

for (const token of [
  'eventCode?:string',
  'params?:TauriAuditParams',
  'successEventCode?:string',
  'errorEventCode?:string'
]) {
  must(files.tauriAuditService, token, `structured audit foundation ${token}`);
}

for (const token of [
  'localizeAuditMessage',
  'localizeNetworkMessage',
  'normalizeTranslateParams',
  'TranslateValues = Record<string, string | number>',
  "typeof value === 'boolean' ? String(value) : value",
  'firmware.catalog.check',
  'led.manual.on',
  'network.apiKey.invalidHeader'
]) {
  must(files.logLocalization, token, `log localization adapter ${token}`);
}

if (files.logLocalization.includes(
  'params?: Record<string, string | number | boolean>'
)) {
  throw new Error(
    'Logs localization Translate contract is wider than the i18n t() contract'
  );
}

must(files.logs, 'localizeAuditMessage(item, t)', 'localized audit rendering');
must(files.logs, 'localizeNetworkMessage(item.message, t)', 'localized network rendering');
must(files.logs, '[language, level,', 'language-reactive unified log memo');

console.log('BETA2_LOGS_FULL_UI_I18N_HU_EN_DE=PASSED');
console.log('BETA2_STRUCTURED_AUDIT_EVENT_FOUNDATION=PASSED');
console.log('BETA2_LEGACY_LOG_LOCALIZATION_FALLBACK=PASSED');
console.log('BETA2_NETWORK_EVENT_LOCALIZATION=PASSED');
console.log('BETA2_API_KEY_INVALID_HEADER_DIAGNOSTIC_EVENT=PASSED');
for (const key of [
  'common.on',
  'common.off',
  'leds.bulkAllOn',
  'leds.bulkAllOff',
  'leds.bulkReset',
  'leds.bulkRefresh',
  'firmware.runtimeIdle',
  'firmware.runtimeStateChanged',
  'firmware.otaProgressAria'
]) {
  const hits = files.i18n.split(`"${key}"`).length - 1;
  if (hits !== 3) {
    throw new Error(`Residual HU/EN/DE parity failed for ${key}: ${hits}`);
  }
}

for (const forbidden of ['Mind bekapcsol', 'Mind kikapcsol', 'Frissítés']) {
  if (files.ledBulkActions.includes(forbidden)) {
    throw new Error(`Hardcoded LED bulk UI text detected: ${forbidden}`);
  }
}

for (const token of [
  'useI18n',
  'leds.bulkAllOn',
  'leds.bulkAllOff',
  'leds.bulkReset',
  'leds.bulkRefresh'
]) {
  must(files.ledBulkActions, token, `LED bulk semantic i18n wiring ${token}`);
}

for (const token of [
  'common.on',
  'common.off',
  'schedules.ledSummary'
]) {
  must(files.schedulesPage, token, `schedule semantic translation dependency ${token}`);
}

must(
  files.firmwareLocalization + files.firmwarePage,
  'localizeFirmwareRuntimeMessage',
  'firmware runtime localization adapter wiring'
);

for (const token of [
  'firmware.runtimeIdle',
  'firmware.runtimeStateChanged',
  'common.online',
  'common.offline',
  'firmware.otaProgressAria'
]) {
  must(files.i18n, token, `firmware dictionary key ${token}`);
}

must(files.firmwarePage, 'locale', 'firmware language-aware log time dependency');

for (const forbidden of [
  "'Ismeretlen'",
  "'ismeretlen'",
  "`OTA folyamat ${state.progress}%`"
]) {
  if (files.firmwarePage.includes(forbidden)) {
    throw new Error(`Firmware residual hardcoded text detected: ${forbidden}`);
  }
}

if (!files.i18n.includes('"firmware.catalogHelp": "Only verified, non-draft firmware releases')) {
  throw new Error('English firmware catalogHelp is not English');
}
if (!files.i18n.includes('"firmware.catalogFooter": "The firmware list comes directly from GitHub Releases.')) {
  throw new Error('English firmware catalogFooter is not English');
}

console.log('BETA2_RESIDUAL_I18N_SEMANTIC_ONLY_POLICY=PASSED');
console.log('BETA2_RESIDUAL_LED_BULK_I18N_HU_EN_DE=PASSED');
console.log('BETA2_SCHEDULE_COMMON_ON_OFF_RESOLUTION=PASSED');
console.log('BETA2_FIRMWARE_RUNTIME_MESSAGE_I18N=PASSED');
if (
  /lastLog[\s\S]*\?\?[\s\S]*localizeFirmwareRuntimeMessage[\s\S]*\|\|/.test(
    files.firmwarePage
  ) &&
  !/\?\?[\s\S]*\([\s\S]*localizeFirmwareRuntimeMessage[\s\S]*\|\|[\s\S]*\)/.test(
    files.firmwarePage
  )
) {
  throw new Error(
    'Firmware fallback mixes ?? and || without explicit grouping'
  );
}
console.log('BETA2_FIRMWARE_NULLISH_FALLBACK_PRECEDENCE=PASSED');
console.log('BETA2_FIRMWARE_LANGUAGE_AWARE_TIME=PASSED');
console.log('BETA2_FIRMWARE_EN_DICTIONARY_CLEANUP=PASSED');
console.log('BETA2_SINGLE_CURRENT_CONTRACT=PASSED');
