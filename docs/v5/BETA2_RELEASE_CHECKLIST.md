# Beta.2 release checklist

## Verziók és párosítás

- [x] Alkalmazás `5.0.0-beta.2`.
- [x] Firmware `4.3.0-beta.1`.
- [x] Direct API `1.0.0`.
- [x] Board: Arduino UNO R4 WiFi.
- [x] `VERSION`, npm lockfile-ok, Cargo, Tauri config és OpenAPI verzió egyezik.

## Kiadási platformok

- [ ] Windows x86_64 NSIS telepítő.
- [ ] macOS Apple Silicon DMG.
- [ ] macOS Intel DMG.
- [ ] Linux x86_64 AppImage.
- [ ] Linux x86_64 DEB.
- [ ] Android APK és AAB.
- [ ] iPhone és iPad unsigned IPA.
- [ ] LXC / Debian szerver bundle.
- [ ] Arduino UNO R4 WiFi firmware BIN és `.sha256`.

## Frissítés és OTA

- [x] Stable/Beta release channel modell.
- [x] Platform-specifikus alkalmazásartifact felismerés.
- [x] Firmware cache és SHA-256 ellenőrzés.
- [x] Kézzel megadható arduinoOTA útvonal, host, port és timeout.
- [x] OTA megszakítás és élő konzol.
- [x] Boot ID változás ellenőrzése.
- [x] Schedule revision/checksum persistence ellenőrzése.

## Biztonság

- [x] Profilonkénti Device Key natív rendszerkulcstárban.
- [x] Profilonkénti OTA-jelszó natív rendszerkulcstárban.
- [x] Plaintext credential migráció.
- [x] Query auth tiltva.
- [x] Publikus firmware nem tartalmaz valódi titkot.

## Release evidence

- [ ] `SHA256SUMS`.
- [ ] `RELEASE-MANIFEST.json` schema v2.
- [ ] `latest-beta.json`.
- [ ] `SBOM.cdx.json`.
- [ ] `PROVENANCE.json`.
- [ ] `SECRET-SCAN.json`.

## Kapuk

- [ ] Teljes Node regresszió.
- [ ] Frontend build.
- [ ] Rust check és tesztek.
- [ ] Repository-validáció.
- [ ] Teljes alkalmazási staging.
- [ ] GitHub prerelease publikálás.
- [ ] Publikált assetlista és manifest smoke teszt.
