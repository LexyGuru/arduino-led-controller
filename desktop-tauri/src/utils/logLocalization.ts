import type {
  TauriAuditEntry,
  TauriAuditParams
} from '../services/tauriAudit';

type TranslateValues = Record<string, string | number>;

type Translate = (
  key: string,
  params?: TranslateValues
) => string;

function normalizeTranslateParams(
  params: TauriAuditParams | undefined
): TranslateValues | undefined {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === 'boolean' ? String(value) : value
    ])
  );
}

const knownEventCodes = new Set([
  'firmware.catalog.check',
  'schedule.reload',
  'led.test.stop',
  'led.manual.on',
  'led.manual.off',
  'ota.start',
  'ota.cancel',
  'network.get.remote',
  'network.get.local',
  'network.apiKey.invalidHeader',
  'network.arduino.unreachable'
]);

export function localizeStructuredEvent(
  eventCode: string | undefined,
  params: TauriAuditParams | undefined,
  fallback: string,
  t: Translate
) {
  if (!eventCode || !knownEventCodes.has(eventCode)) {
    return fallback;
  }
  return t(
    `logsEvent.${eventCode}`,
    normalizeTranslateParams(params)
  );
}

export function localizeAuditMessage(
  entry: Pick<TauriAuditEntry, 'eventCode' | 'params' | 'message'>,
  t: Translate
) {
  const structured = localizeStructuredEvent(entry.eventCode, entry.params, entry.message, t);
  if (structured !== entry.message) return structured;

  const message = entry.message.trim();
  const exact: Record<string, string> = {
    'Firmware-katalógus ellenőrzése': 'firmware.catalog.check',
    'Ütemezések újratöltése az Arduinóról': 'schedule.reload',
    'LED teszt leállítva': 'led.test.stop',
    'OTA firmware-frissítés elindítva': 'ota.start',
    'OTA firmware-frissítés megszakítása': 'ota.cancel'
  };

  const code = exact[message];
  if (code) return t(`logsEvent.${code}`);

  const led = message.match(/^LED(\d+) manuálisan (bekapcsolva|kikapcsolva)$/);
  if (led) {
    return t(
      `logsEvent.led.manual.${led[2] === 'bekapcsolva' ? 'on' : 'off'}`,
      { strip: Number(led[1]) }
    );
  }

  return entry.message;
}

export function localizeNetworkMessage(
  message: string,
  t: Translate
) {
  const value = message.trim();

  if (value === 'GET sikeres (távoli/DDNS)') {
    return t('logsEvent.network.get.remote');
  }

  if (value === 'GET sikeres (helyi/LAN)' || value === 'GET sikeres (helyi)') {
    return t('logsEvent.network.get.local');
  }

  if (value.includes('Az Arduino API-kulcs nem használható biztonságos HTTP-fejlécértékként.')) {
    const prefix = value.includes('Az Arduino egyik beállított címen sem érhető el.')
      ? `${t('logsEvent.network.arduino.unreachable')} `
      : '';
    return `${prefix}${t('logsEvent.network.apiKey.invalidHeader')}`;
  }

  if (value === 'Az Arduino egyik beállított címen sem érhető el.') {
    return t('logsEvent.network.arduino.unreachable');
  }

  return message;
}
