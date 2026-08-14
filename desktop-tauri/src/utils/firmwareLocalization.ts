type Translate = (
  key: string,
  values?: Record<string, string | number>
) => string;

const exactLegacyMessages: Record<string, string> = {
  'Nincs folyamatban firmware-művelet.': 'firmware.runtimeIdle',
  'Firmware állapotváltozás': 'firmware.runtimeStateChanged'
};

export function localizeFirmwareRuntimeMessage(
  message: string | null | undefined,
  t: Translate
) {
  if (!message) return '';
  const key = exactLegacyMessages[message.trim()];
  return key ? t(key) : message;
}
