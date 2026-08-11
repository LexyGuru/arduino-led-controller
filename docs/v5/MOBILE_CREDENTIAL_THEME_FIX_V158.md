# Mobile credential + Theme fix V158

## Credential root cause

A V153 audit igazolta, hogy a natív credential bridge csak macOS/Windows/Linux platformokra volt bekötve. Mobilon ezért a memóriás fallback újraindításkor elveszett.

V158:
- iOS: keyring-core + Apple Protected Data store;
- Android: keyring-core + Android native store (Keystore + encrypted SharedPreferences);
- a meglévő profilonkénti device-key / OTA-password scope megmarad;
- startup restore: migrate_native_credentials + load_config.

## Theme

A teljes Theme motor már shared frontend. V158 nem duplikálja, hanem explicit mobil-parity contracttal védi a teljes mode/theme/accent/density/radius/animations/glass felületet és a localStorage persistence-t.

## Firmware

A V150 scheduler/local-time firmware patch változatlanul staged marad. Commit/push nincs.
