# 5.0.0-beta.9

## 5.0.0-beta.9

- Canonical shared React desktop/LXC release documentation.
- Beta.9-only GitHub prerelease documentation assets.
- Rust LXC canonical runtime and transactional updater documentation.
- Current Beta release contracts separated from historical Beta snapshot tests.
- Historical release tests remain available via `npm run test:release-history`.


- Shared React frontend for desktop, mobile and LXC.
- Full LXC firmware release selection and OTA cancel.
- Browser schedule import/export.
- Application 5.0.0-beta.9; firmware remains 5.0.0-beta.6.
- README and architecture documentation updated.

## [5.0.0-beta.7] - 2026-08-06

### Alkalmazás

- Beta.7 UI-overhaul, Theme Engine és egységes Design System.
- Tauri auditkonzol és csatornahelyes firmware-katalógus.
- Schedule backup, restore és teljes törlés.
- macOS UNO R4 helyi `arduinoOTA` Terminal útvonal.

### Firmware 5.0.0-beta.3

- Direct API `1.0.0`-only router.
- Legacy firmware endpointok és JSON-ágak eltávolítása.
- OTA maintenance mód.
- BIN méret: `118516` bájt.

### Validáció

- Repository-validáció, teljes Node-regresszió és UNO R4 fordítás sikeres.

## 5.0.0-beta.6 — Firmware-katalógus és workflow szétválasztás

## [Unreleased] – Beta.7 UI Freeze

- központi Theme Engine System / Light / Dark móddal;
- Arctic és Midnight téma, kiemelőszínek, sűrűség és lekerekítés;
- perzisztált megjelenési beállítások;
- helyi Tauri műveleti audit legfeljebb 500 bejegyzéssel;
- Event Bus helyett Tauri auditkonzol a Direct Arduino felületen;
- LED-, schedule-, időszinkron-, firmware- és OTA-műveletek auditálása;
- világos OTA-konzol és firmware rollback kontraszt;
- auditált Dashboard időszinkron;
- Beta.7 UI Freeze és dokumentációs contractok;
- a `LedStrip` azonosítója `id`, nem `index`.

A Beta.7 még fejlesztés alatt áll, és nem nyilvános kiadás.

- Azonos firmware-verziók deduplikálása a Tauri katalógusban.
- Egyértelmű Firmware előtag, telepített/legújabb/korábbi jelölések.
- Szemantikus verzió-összehasonlítás rollback döntéshez.
- Teljes alkalmazásrelease manuális indítása.
- Külön firmware-only hotfix workflow meglévő prerelease frissítésére.

# Változásnapló

## Firmware 4.3.0-beta.4 — scheduler/NTP hotfix — 2026-08-04

- Megbízható NTP újrapróbálás és Wi-Fi visszatérés utáni azonnali szinkron.
- NTP kísérlet-, hiba- és siker-számlálók a státuszban.
- Aktuális epoch, helyi nap/óra/perc és scheduler futási diagnosztika.
- A kézi LED-felülbírálás időszinkron nélkül sem maradhat végtelenül aktív.
- Sikeres első NTP-szinkron és schedule-mentés után azonnali reconcile.
- LED-enként elérhető a kiválasztott schedule index és blokkolási ok.

## 5.0.0-beta.6 / firmware 4.3.0-beta.4 — 2026-08-03

### Többnyelvű stabilizáció

- Teljes magyar, angol és német desktop- és mobilfelület.
- Központi i18n réteg perzisztált nyelvválasztással és rendszer-nyelv felismeréssel.
- A kapcsolat-, LED-, schedule-, firmware-, OTA-, siker-, hiba- és státuszüzenetek központi fordítási kulcsokat használnak.
- Új forrásintegritási, kulcsparitási, hardcoded UI és final hook i18n auditok.
- A mobilos profilmentés és OTA-letiltás contractjai i18n-alapúak.

### Kiadás és dokumentáció

- Alkalmazásverzió: `5.0.0-beta.6`.
- Firmware változatlan: `4.3.0-beta.4`.
- Direct API változatlan: `1.0.0`.
- Frissített README, CONTRIBUTING és SECURITY dokumentáció.
- Új Beta.5 telepítési útmutató, release notes és checklist.
- Frissített workflow-, artifact-, staging- és verziócontractok.

## 5.0.0-beta.4 / firmware 4.3.0-beta.4 — 2026-08-01

### Direct schedule-szinkron

- Az Arduino Direct API lett a heti időzítés hiteles elsődleges adatforrása; V5/Node/LXC szerver nem szükséges.
- Teljes, lapozott, legfeljebb 60 rekordos letöltés `count` és változatlan `revision` ellenőrzéssel.
- A helyi cache csak sikeres tranzakció, commit és teljes readback után frissül.
- Mentés és törlés csak teljes, ellenőrzött Arduino-snapshotból engedélyezett.
- A valóban üres LED-műveletű, de érvényes rekordok megmaradnak és kezelhetők.
- A hiányzó `apply` jelzővel, de megmaradt LED-adatokkal rendelkező örökölt rekordok helyreállnak, majd a következő sikeres mentéskor normalizálódnak.
- A dashboard külön mutatja az Arduino és a betöltött szerkesztési lista rekordszámát, valamint a szinkron állapotát.

### Megbízhatóság és kiadás

- A React réteg megvárja a Direct schedule Promise-okat, ezért a hibák nem maradnak néma háttérműveletek.
- Új Direct schedule regressziós teszt és architektúra-dokumentáció.
- Firmware 4.3.0-beta.4 gyorsítás: kisebb HTTP timeoutok, 512 bájtos válaszchunk és 8 ms settle delay.
- GitHub Stable/Beta firmware-katalógus, csatornahelyes visszaállítás és schedule teljes törlés előtti automatikus backup.
- Az alkalmazás verziója `5.0.0-beta.4`; a firmware változatlanul `4.3.0-beta.4`, Direct API `1.0.0`.
- Beta.3 telepítési útmutató, release notes, checklist és frissített GitHub prerelease workflow.

## 5.0.0-beta.3 / firmware 4.3.0-beta.4 — 2026-07-31

### Direct kapcsolat és biztonság

- Szerkeszthető helyi IP/hostname és távoli DDNS célpont, külön API-portokkal és automatikus fallbackkel.
- Profilonkénti `X-Device-Key` és OTA-jelszó a macOS Keychain, Windows Credential Manager vagy Linux Secret Service tárban.
- Régi plaintext credentialök automatikus migrációja és eltávolítása a konfigurációból.

### Frissítés és OTA

- Stable/Beta GitHub Release kiválasztás és platform-specifikus alkalmazásartifact felismerés.
- Firmware BIN cache és kötelező SHA-256 újraellenőrzés.
- Kézzel megadható `arduinoOTA` útvonal, OTA-host, port és timeout.
- Megszakítható OTA, élő konzol, Boot ID változás és schedule revision/checksum persistence kapu.

### Kiadás

- Az alkalmazás verziója `5.0.0-beta.3`; a párosított firmware továbbra is `4.3.0-beta.4`, Direct API `1.0.0`.
- Új Beta.2 telepítési útmutató, release notes és checklist.
- Gépileg olvasható Beta channel manifest az alkalmazás- és firmware-artifactok kompatibilitási adataival.

## 5.0.0-beta.3 / firmware 4.3.0-beta.4 — 2026-07-31

### Firmware

- Direct API `1.0.0` véglegesítése.
- `X-Device-Key` fejlécalapú hitelesítés; query fallback véglegesen tiltva.
- JSON body alapú módosító API-k.
- Konfiguráció és schedule A/B EEPROM slotok readback ellenőrzéssel.
- Legfeljebb 60 schedule rekord, tranzakciós begin/chunk/commit/cancel folyamat.
- `offset` lapozás és legacy `index` kompatibilitás.
- OTA prepare ablak és `arduinoOTA` feltöltés 120 másodperces flash timeouttal.
- Védett `POST /api/v1/system/reboot`, valódi `HTTP 202 Accepted`, 750 ms késleltetéssel.
- Végleges hardverkapu: 60 rekord megmaradt OTA és reboot után; HTTP timeout és write failure 0.

### Repository

- Elavult Alpha/F14 patch-dokumentumok és package manifestek eltávolítása.
- Fő README, firmware dokumentáció, V5 állapot és release checklist újraírása.
- Történeti bizonyítékok összevonása egy rövid history dokumentumba.
- Beta workflow firmware-elvárás frissítése `4.3.0-beta.4` verzióra.

## 5.0.0-beta.4 / firmware 4.3.0-beta.4

- Külön alkalmazás- és firmware-frissítési csatorna.
- Szigorú Stable/Beta firmware release-kapu stabil fallback nélkül.
- Központi `release-versions.json` és gépi `firmware-release.json`.
- macOS Keychain munkamenet-cache, amely egy futás alatt összevonja a credential-olvasásokat.
- Firmware-katalógus Frissítés / Visszaállítás / Újratelepítés műveletekkel.


## Dedikált firmware release

A `v5.0.0-beta.X` release-ek kizárólag alkalmazás-, mobil- és LXC-csomagokat tartalmaznak. A Beta firmware-ek, SHA-256 fájlok és a rollback katalógus kizárólag az `Arduino_LED_Controller_Firmware_BETA` prerelease-ben találhatók.
