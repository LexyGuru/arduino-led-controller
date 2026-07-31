const DEFAULTS = Object.freeze({
  protocol: 'http',
  localHost: '',
  localPort: 80,
  remoteHost: '',
  remotePort: 25666,
  preferLocal: true,
  privateApiPath: '',
  otaHost: '',
  otaPort: 65280,
  expectedFirmwareVersion: '4.3.0-beta.1',
  expectedDirectApiVersion: '1.0.0'
});

function text(value) {
  return String(value ?? '').trim();
}

function port(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535
    ? parsed
    : fallback;
}

export function normalizeDirectArduinoProfile(input = {}) {
  const protocol = text(input.protocol).toLowerCase() === 'https' ? 'https' : 'http';
  const path = text(input.privateApiPath || input.arduinoApiPath).replace(/\/+$/, '');

  return {
    ...DEFAULTS,
    protocol,
    localHost: text(input.localHost || input.localArduinoIp),
    localPort: port(input.localPort ?? input.localArduinoPort, DEFAULTS.localPort),
    remoteHost: text(input.remoteHost || input.arduinoIp),
    remotePort: port(input.remotePort ?? input.arduinoPort, DEFAULTS.remotePort),
    preferLocal: input.preferLocal !== false,
    privateApiPath: path,
    otaHost: text(input.otaHost || input.otaAddress),
    otaPort: port(input.otaPort, DEFAULTS.otaPort),
    expectedFirmwareVersion: text(input.expectedFirmwareVersion) || DEFAULTS.expectedFirmwareVersion,
    expectedDirectApiVersion: text(input.expectedDirectApiVersion) || DEFAULTS.expectedDirectApiVersion
  };
}

export function validateDirectArduinoProfile(profileInput) {
  const profile = normalizeDirectArduinoProfile(profileInput);
  const errors = [];
  const validHost = (value) => value.length > 0 && value.length <= 253 && !value.includes('://') && !value.includes('/') && !/\s/.test(value);

  if (!validHost(profile.localHost) && !validHost(profile.remoteHost)) {
    errors.push('Legalább egy helyi vagy távoli Arduino host kötelező.');
  }

  if (!profile.privateApiPath.startsWith('/') || profile.privateApiPath.length < 2 || /\s/.test(profile.privateApiPath)) {
    errors.push('A privát API-útvonalnak / jellel kell kezdődnie és nem tartalmazhat szóközt.');
  }

  return { valid: errors.length === 0, errors, profile };
}

export function directArduinoTargets(profileInput) {
  const profile = normalizeDirectArduinoProfile(profileInput);
  const targets = [];
  const push = (host, port, kind) => {
    if (!host) return;
    const key = `${host.toLowerCase()}:${port}`;
    if (targets.some((item) => item.key === key)) return;
    targets.push({ key, kind, host, port, protocol: profile.protocol });
  };

  const local = () => push(profile.localHost, profile.localPort, 'local');
  const remote = () => push(profile.remoteHost, profile.remotePort, 'remote');

  if (profile.preferLocal) {
    local();
    remote();
  } else {
    remote();
    local();
  }

  return targets;
}

export function directArduinoUrl(profileInput, target, endpoint) {
  const profile = normalizeDirectArduinoProfile(profileInput);
  const suffix = String(endpoint || '').startsWith('/') ? String(endpoint) : `/${String(endpoint || '')}`;
  return `${target.protocol}://${target.host}:${target.port}${profile.privateApiPath}${suffix}`;
}

export const DIRECT_ARDUINO_PROFILE_DEFAULTS = DEFAULTS;
