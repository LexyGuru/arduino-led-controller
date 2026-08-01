# Beta.3 release checklist

## Verziók és párosítás

- [x] Alkalmazás `5.0.0-beta.3`.
- [x] Firmware `4.3.0-beta.1`.
- [x] Direct API `1.0.0`.
- [x] Board: Arduino UNO R4 WiFi.
- [x] `VERSION`, npm lockfile-ok, Cargo, Tauri config, OpenAPI és generált API-kommentek egyeznek.

## Direct schedule-szinkron

- [x] Az Arduino Direct API az elsődleges schedule-forrás.
- [x] Az összes lap letöltése `offset`/`limit` használatával.
- [x] Teljes `count` ellenőrzés.
- [x] Változatlan revision követelmény az összes letöltött oldalon.
- [x] Helyi cache frissítése csak sikeres readback után.
- [x] Mentés és Törlés tiltása ellenőrzött snapshot nélkül.
- [x] Valóban üres LED-műveletű rekordok megőrzése.
- [x] Hiányzó `apply` jelző helyreállítása a megőrzött LED-adatokból.
- [x] Dashboard Arduino/betöltött rekordszám és szinkronállapot.
- [x] Direct schedule regressziós teszt.

## Kiadási platformok

- [ ] Windows x86_64 NSIS telepítő.
- [ ] macOS Apple Silicon DMG.
- [ ] macOS Intel DMG.
- [ ] Linux x86_64 AppImage.
- [ ] Linux x86_64 DEB.
- [ ] Android APK és AAB.
- [ ] iPhone és iPad unsigned IPA.
- [ ] LXC / Debian szerver kompatibilitási bundle.
- [ ] Arduino UNO R4 WiFi firmware BIN és `.sha256`.

## Frissítés és OTA

- [x] Stable/Beta release channel modell.
- [x] Platform-specifikus alkalmazásartifact felismerés.
- [x] Firmware cache és SHA-256 ellenőrzés.
- [x] OTA utáni Boot ID és schedule persistence ellenőrzés.
- [x] Firmware verzió változatlan: `4.3.0-beta.1`.

## Biztonság

- [x] Device Key és OTA-jelszó nem kerül release-assetbe.
- [x] Privát API-path nem kerül release-assetbe.
- [x] Query auth tiltva.
- [x] Publikus firmware nem tartalmaz valódi titkot.
- [x] A `main` ág nem módosul.

## Release evidence

- [ ] `SHA256SUMS`.
- [ ] `RELEASE-MANIFEST.json` schema v2.
- [ ] `latest-beta.json`.
- [ ] `SBOM.cdx.json`.
- [ ] `PROVENANCE.json`.
- [ ] `SECRET-SCAN.json`.

## Kapuk

- [ ] Teljes Node regresszió.
- [ ] Repository-validáció.
- [ ] Frontend build.
- [ ] Rust formázás, check és tesztek.
- [ ] Minden platform buildje sikeres.
- [ ] Teljes alkalmazási staging.
- [ ] GitHub prerelease publikálás.
- [ ] Publikált assetlista és manifest smoke teszt.
- [ ] `v5.0.0-beta.3` target commit egyezik a release-előkészítő committal.
