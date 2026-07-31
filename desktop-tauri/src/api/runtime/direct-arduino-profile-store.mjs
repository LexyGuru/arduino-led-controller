const DEFAULTS = Object.freeze({
  id: 'default', name: 'Arduino vezérlő', protocol: 'http', localHost: '', localPort: 80,
  remoteHost: '', remotePort: 25666, preferLocal: true, privateApiPath: '',
  otaUseApiHost: true, otaHost: '', otaPort: 65280, otaToolMode: 'auto', otaToolPath: '',
  otaTimeoutSeconds: 120, updateChannel: 'beta', autoCheckUpdates: true,
  autoDownloadUpdates: false, firmwareUpdateChecks: true,
  expectedFirmwareVersion: '4.3.0-beta.1', expectedDirectApiVersion: '1.0.0'
});
const text = (value) => String(value ?? '').trim();
const port = (value, fallback) => { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : fallback; };
const seconds = (value, fallback) => { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 30 && parsed <= 600 ? parsed : fallback; };
const slug = (value) => text(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'default';
export function normalizeDirectArduinoProfile(input = {}) {
  const protocol = text(input.protocol).toLowerCase() === 'https' ? 'https' : 'http';
  const path = text(input.privateApiPath || input.arduinoApiPath).replace(/\/+$/, '');
  const name = text(input.name || input.profileName) || DEFAULTS.name;
  const requestedMode = text(input.otaToolMode || input.otaUploadMode).toLowerCase();
  return { ...DEFAULTS, id: slug(input.id || name), name, protocol,
    localHost: text(input.localHost || input.localArduinoIp), localPort: port(input.localPort ?? input.localArduinoPort, 80),
    remoteHost: text(input.remoteHost || input.arduinoIp), remotePort: port(input.remotePort ?? input.arduinoPort, 25666),
    preferLocal: input.preferLocal !== false, privateApiPath: path, otaUseApiHost: input.otaUseApiHost !== false,
    otaHost: text(input.otaHost || input.otaAddress), otaPort: port(input.otaPort, 65280),
    otaToolMode: ['auto','system','bundled','custom'].includes(requestedMode) ? requestedMode : 'auto',
    otaToolPath: text(input.otaToolPath), otaTimeoutSeconds: seconds(input.otaTimeoutSeconds, 120),
    updateChannel: text(input.updateChannel).toLowerCase() === 'stable' ? 'stable' : 'beta',
    autoCheckUpdates: input.autoCheckUpdates !== false, autoDownloadUpdates: input.autoDownloadUpdates === true,
    firmwareUpdateChecks: input.firmwareUpdateChecks !== false,
    expectedFirmwareVersion: text(input.expectedFirmwareVersion) || DEFAULTS.expectedFirmwareVersion,
    expectedDirectApiVersion: text(input.expectedDirectApiVersion) || DEFAULTS.expectedDirectApiVersion };
}
export function validDirectHost(value) { const host = text(value); return host.length > 0 && host.length <= 253 && !host.includes('://') && !host.includes('/') && !/\s/.test(host); }
export function validateDirectArduinoProfile(input) { const profile = normalizeDirectArduinoProfile(input); const errors = [];
  if (!validDirectHost(profile.localHost) && !validDirectHost(profile.remoteHost)) errors.push('Legalább egy helyi vagy távoli Arduino host kötelező.');
  if (!profile.privateApiPath.startsWith('/') || profile.privateApiPath.length < 2 || /\s/.test(profile.privateApiPath)) errors.push('Érvénytelen privát API-útvonal.');
  if (!profile.otaUseApiHost && !validDirectHost(profile.otaHost)) errors.push('Külön OTA-cím használatakor érvényes host kötelező.');
  if (profile.otaToolMode === 'custom' && !profile.otaToolPath) errors.push('Egyedi uploader módban útvonal kötelező.');
  return { valid: errors.length === 0, errors, profile }; }
export function directArduinoTargets(input) { const profile = normalizeDirectArduinoProfile(input); const targets=[]; const push=(host,port,kind)=>{if(!host)return; const key=`${host.toLowerCase()}:${port}`; if(!targets.some(i=>i.key===key))targets.push({key,kind,host,port,protocol:profile.protocol});}; const local=()=>push(profile.localHost,profile.localPort,'local'); const remote=()=>push(profile.remoteHost,profile.remotePort,'remote'); profile.preferLocal?(local(),remote()):(remote(),local()); return targets; }
export function directArduinoUrl(input,target,endpoint) { const profile=normalizeDirectArduinoProfile(input); const suffix=String(endpoint||'').startsWith('/')?String(endpoint):`/${String(endpoint||'')}`; return `${target.protocol}://${target.host}:${target.port}${profile.privateApiPath}${suffix}`; }
export function directOtaTarget(input, activeApiTarget=null) { const p=normalizeDirectArduinoProfile(input); return { host: p.otaUseApiHost ? text(activeApiTarget?.host || p.localHost || p.remoteHost) : p.otaHost, port:p.otaPort }; }
export const DIRECT_ARDUINO_PROFILE_DEFAULTS = DEFAULTS;
