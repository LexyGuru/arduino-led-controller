# 5.0.0-beta.7 release checklist

## Verziók

- [x] Alkalmazás `5.0.0-beta.7`.
- [x] Firmware `4.3.0-beta.6`.
- [x] Direct API `1.0.0`.
- [x] Beta csatorna és prerelease beállítás.
- [x] Direct API `1.0.0` változatlan; a firmware autonóm DST-kezeléssel bővült.

## Lokalizáció

- [x] Magyar, angol és német szótár.
- [x] Azonos HU/EN/DE kulcskészlet.
- [x] React komponensek `useI18n()` használata.
- [x] Hook- és runtime-üzenetek `translate()` használata.
- [x] Hardcoded UI audit.
- [x] Mobilos profilmentés és OTA-letiltás i18n contract.

## Dokumentáció

- [x] README.md.
- [x] CONTRIBUTING.md.
- [x] SECURITY.md.
- [x] CHANGELOG.md.
- [x] BETA7_INSTALLATION_GUIDE.md.
- [x] BETA7_RELEASE_NOTES.md.
- [x] V5_IMPLEMENTATION_STATUS.md.

## Release contractok

- [x] `VERSION`.
- [x] `release-versions.json`.
- [x] package és lock fájlok.
- [x] Tauri és Cargo verziók.
- [x] beta workflow.
- [x] staging és LXC alapverziók.
- [x] artifact-elnevezési contract.
- [x] `firmware-release.json` firmware-verziója `4.3.0-beta.6`.

## Platformartifactok és smoke tesztek

- [ ] Windows x86_64.
- [ ] macOS Apple Silicon.
- [ ] macOS Intel.
- [ ] Linux x86_64.
- [ ] Android.
- [ ] iPhone és iPad.
- [ ] LXC / Debian szerver.
- [ ] Arduino UNO R4 WiFi firmware.
- [ ] Teljes alkalmazási staging.

## Kötelező kapuk

- [ ] `npm test`.
- [ ] `npm run validate`.
- [ ] `npm run test:i18n-source-integrity`.
- [ ] `npm run test:i18n-final-hooks`.
- [ ] `npm run test:beta6-release-package`.
- [ ] frontend TypeScript/Vite build.
- [ ] `cargo fmt --check`.
- [ ] `cargo check --locked`.
- [ ] `cargo test --locked`.
- [ ] tiltott fájl- és secret-scan.
- [ ] tiszta working tree a commit után.
- [ ] `v5.0.0-beta.7` tag a jóváhagyott release commiton.


## Dedikált firmware release

A `v5.0.0-beta.X` release-ek kizárólag alkalmazás-, mobil- és LXC-csomagokat tartalmaznak. A Beta firmware-ek, SHA-256 fájlok és a rollback katalógus kizárólag az `Arduino_LED_Controller_Firmware_BETA` prerelease-ben találhatók.


## Időzóna és scheduler kapuk

- [x] Autonóm CET/CEST határesettesztek.
- [x] `time status` soros diagnosztika.
- [x] Kibővített `schedule status`.
- [x] NTP-szinkron utáni scheduler-egyeztetés.
- [x] A/B EEPROM diagnosztika.
