import type { AppLanguage } from '../i18n';

const stageTranslations: Record<AppLanguage, Record<string, string>> = {
  hu: {},
  en: {
    'KÜLSŐ FIRMWARE': 'EXTERNAL FIRMWARE',
    'ARDUINO': 'ARDUINO',
    'ELLENŐRZÉS': 'VERIFICATION',
    'FELTÖLTÉS': 'UPLOAD',
    'KAPCSOLAT': 'CONNECTION',
    'API ELLENŐRZÉS': 'API VERIFICATION',
    'PERSISTENCE': 'PERSISTENCE'
  },
  de: {
    'KÜLSŐ FIRMWARE': 'EXTERNE FIRMWARE',
    'ARDUINO': 'ARDUINO',
    'ELLENŐRZÉS': 'PRÜFUNG',
    'FELTÖLTÉS': 'UPLOAD',
    'KAPCSOLAT': 'VERBINDUNG',
    'API ELLENŐRZÉS': 'API-PRÜFUNG',
    'PERSISTENCE': 'PERSISTENZ'
  }
};

export function localizeOtaStage(stage: string, language: AppLanguage) {
  return stageTranslations[language]?.[stage] ?? stage;
}

export function localizeOtaMessage(message: string, language: AppLanguage) {
  if (language === 'hu') return message;

  const replacements: Array<[RegExp, string]> = language === 'de'
    ? [
        [/^Külső firmware előkészítése:/, 'Externe Firmware wird vorbereitet:'],
        [/^Arduino elérhető\./, 'Arduino erreichbar.'],
        [/^Külső BIN SHA-256 és cache\/readback rendben:/, 'Externe BIN SHA-256 und Cache/Readback geprüft:'],
        [/^OTA-listener előkészítve\.$/, 'OTA-Listener vorbereitet.'],
        [/^Külső firmware OTA feltöltése:/, 'Externe Firmware per OTA:'],
        [/^Beépített OTA TCP-kapcsolat nyitása:/, 'Integrierte OTA-TCP-Verbindung wird geöffnet:'],
        [/^Beépített Rust OTA timeout:/, 'Integriertes Rust-OTA-Zeitlimit:'],
        [/^Közvetlen kapcsolat létrejött:/, 'Direkte Verbindung hergestellt:'],
        [/^Firmware küldése az Arduino felé:/, 'Firmware wird an Arduino gesendet:'],
        [/^A teljes BIN transport-szinten elküldve és flush-olva\..*$/, 'Die vollständige BIN wurde auf Transportebene gesendet und geflusht. Ab jetzt entscheidet ausschließlich der Direct-API-Status über das Ergebnis.'],
        [/^TRANSFER -> API_CONFIRMATION\..*$/, 'TRANSFER -> API_CONFIRMATION. Der OTA-Port ist nicht mehr maßgeblich; Direct API, Neustart und Firmwarestatus entscheiden.'],
        [/^OTA transport lezárva\..*$/, 'OTA-Transport beendet. Bis zu 3 Minuten wird ausschließlich der aktuelle Direct-API-Status geprüft.'],
        [/^Direct API életjel:/, 'Direct-API-Lebenszeichen:'],
        [/^Külső firmware: reboot, Boot ID és schedule persistence ellenőrzés sikeres\.$/, 'Externe Firmware: Neustart, Boot-ID und Zeitplan-Persistenz erfolgreich geprüft.']
      ]
    : [
        [/^Külső firmware előkészítése:/, 'Preparing external firmware:'],
        [/^Arduino elérhető\./, 'Arduino reachable.'],
        [/^Külső BIN SHA-256 és cache\/readback rendben:/, 'External BIN SHA-256 and cache/readback verified:'],
        [/^OTA-listener előkészítve\.$/, 'OTA listener prepared.'],
        [/^Külső firmware OTA feltöltése:/, 'Uploading external firmware via OTA:'],
        [/^Beépített OTA TCP-kapcsolat nyitása:/, 'Opening built-in OTA TCP connection:'],
        [/^Beépített Rust OTA timeout:/, 'Built-in Rust OTA timeout:'],
        [/^Közvetlen kapcsolat létrejött:/, 'Direct connection established:'],
        [/^Firmware küldése az Arduino felé:/, 'Sending firmware to Arduino:'],
        [/^A teljes BIN transport-szinten elküldve és flush-olva\..*$/, 'The full BIN was sent and flushed at transport level. From now on only Direct API status determines the result.'],
        [/^TRANSFER -> API_CONFIRMATION\..*$/, 'TRANSFER -> API_CONFIRMATION. The OTA port is no longer authoritative; Direct API, reboot and firmware status decide.'],
        [/^OTA transport lezárva\..*$/, 'OTA transport closed. Fresh Direct API status will be checked for up to 3 minutes.'],
        [/^Direct API életjel:/, 'Direct API heartbeat:'],
        [/^Külső firmware: reboot, Boot ID és schedule persistence ellenőrzés sikeres\.$/, 'External firmware: reboot, Boot ID and schedule persistence verified successfully.']
      ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(message)) return message.replace(pattern, replacement);
  }
  return message;
}
