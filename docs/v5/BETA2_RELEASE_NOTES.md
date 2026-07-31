# Arduino LED Controller 5.0.0-beta.2

A Beta.2 a `4.3.0-beta.1` firmware és a Direct API `1.0.0` stabil alapjára épül. A kiadás a közvetlen kapcsolat konfigurációját, a natív credential-kezelést és a teljes OTA/frissítési ellenőrzési folyamatot teszi elérhetővé.

## Fő újdonságok

- Külön szerkeszthető helyi IP/hostname és távoli DDNS célpont.
- Külön API- és OTA-host/port, kézzel megadható `arduinoOTA` bináris és timeout.
- Stable/Beta release channel választás.
- Profilonkénti Device Key és OTA-jelszó natív rendszerkulcstárban.
- Régi plaintext credentialök automatikus migrációja.
- Firmware BIN letöltés, cache és SHA-256 ellenőrzés.
- Megszakítható helyi OTA élő konzollal.
- OTA utáni Boot ID, schedule revision és checksum ellenőrzés.
- Platform-specifikus alkalmazásartifact felismerés Windows, Linux és macOS rendszeren.

## Verziópárosítás

- Alkalmazás: `5.0.0-beta.2`
- Firmware: `4.3.0-beta.1`
- Direct API: `1.0.0`
- Board: Arduino UNO R4 WiFi

A firmware verziója szándékosan nem változik: a Beta.2 alkalmazás a már hardveresen elfogadott `4.3.0-beta.1` firmware-rel kompatibilis.

## Kiadási jelleg

Ez GitHub prerelease. A `main` ág és a stabil csatorna nem módosul. A csomag nem tartalmaz produkciós telepítést vagy valódi Wi-Fi/API/OTA titkot.
A staging telepítés alapértelmezetten nem használja a produkciós `10.0.0.123` Arduino címet; annak engedélyezése külön, explicit kapcsolóhoz kötött.

## Biztonság és integritás

A release tartalmaz `SHA256SUMS`, `RELEASE-MANIFEST.json`, `latest-beta.json`, `SBOM.cdx.json`, `PROVENANCE.json` és `SECRET-SCAN.json` fájlokat. Az automatikus Tauri alkalmazástelepítés csak későbbi, aláírt updater artifactokkal engedélyezhető; a Beta.2 platformcsomagot felismeri és letöltésre felkínálja.
