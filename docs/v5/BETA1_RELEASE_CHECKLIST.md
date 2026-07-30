# Arduino LED Controller 5.0.0-beta.1 kiadási és telepítési ellenőrzőlista

Ez az ellenőrzőlista a `v5.0.0-beta.1` GitHub prerelease kiadás utáni kézi smoke tesztekhez készült. A kiadás nem módosítja automatikusan a `main` ágat, a produkciós LXC-szolgáltatást vagy a produkciós Arduino firmware-jét.

## Kiadási integritás

- [ ] A release `Prerelease` jelölésű, és nem `Latest`.
- [ ] A release target commitja a `next/v5-rearchitecture` Beta.1 commit.
- [ ] A `SHA256SUMS` minden feltöltött fájlt tartalmaz.
- [ ] A `RELEASE-MANIFEST.json` verziója `5.0.0-beta.1`.
- [ ] A `SBOM.cdx.json`, `PROVENANCE.json` és `SECRET-SCAN.json` elérhető.
- [ ] A titokvizsgálati jelentés `passed: true` állapotú.
- [ ] A `main` ág és a `firmware-latest` release változatlan.

## Windows x86_64

- [ ] Az NSIS `.exe` SHA-256 értéke egyezik.
- [ ] A telepítő végigfut.
- [ ] Az alkalmazás elindul.
- [ ] Az alkalmazás verziója `5.0.0-beta.1`.
- [ ] Kapcsolati profil létrehozható.
- [ ] A bezárás és újraindítás sikeres.
- [ ] Az eltávolító működik.

## macOS Apple Silicon

- [ ] Az Apple Silicon DMG SHA-256 értéke egyezik.
- [ ] Az alkalmazás az Applications mappába másolható.
- [ ] A nem notarizált csomag ismert korlátozása dokumentált.
- [ ] Az alkalmazás elindul és `5.0.0-beta.1` verziót mutat.
- [ ] Kapcsolati profil és natív credential vault működik.

## macOS Intel

- [ ] Az Intel DMG SHA-256 értéke egyezik.
- [ ] Valódi Intel Macen vagy Intel tesztkörnyezetben elindul.
- [ ] Az alkalmazás nem Apple Silicon-only bináris.
- [ ] A verzió `5.0.0-beta.1`.

## Linux x86_64

- [ ] Az AppImage SHA-256 értéke egyezik és futtatható.
- [ ] A DEB SHA-256 értéke egyezik és telepíthető.
- [ ] A desktop alkalmazás mindkét csomagból elindul.
- [ ] A WebKitGTK és rendszerintegráció rendben működik.
- [ ] A verzió `5.0.0-beta.1`.

## Android

- [ ] Az APK SHA-256 értéke egyezik.
- [ ] A fájlnév egyértelműen jelzi, ha debug build.
- [ ] Az APK telepíthető egy támogatott Android eszközre.
- [ ] Az alkalmazás elindul és a hálózati kapcsolat beállítható.
- [ ] Az AAB jelen van Play Console/bundletool teszthez.

## iPhone és iPad

- [ ] Az IPA SHA-256 értéke egyezik.
- [ ] A fájlnév jelzi, hogy aláíratlan.
- [ ] Saját Apple-aláírás után teszteszközre telepíthető.
- [ ] Az alkalmazás elindul, és az alap navigáció működik.

## LXC / Debian szerver

- [ ] A `.tar.gz` SHA-256 értéke egyezik.
- [ ] Az alapértelmezett, Arduino nélküli staging telepítés sikeres.
- [ ] A `arduino-led-controller-staging` szolgáltatás aktív.
- [ ] A `/health/live` HTTP 200.
- [ ] A `/health/ready` HTTP 200.
- [ ] A szolgáltatás újraindítás után is ready.
- [ ] A tartalék Arduino-val a `/health/arduino` HTTP 200.
- [ ] Hibás kulccsal az Arduino-hiba kontrolláltan jelenik meg.
- [ ] A rollback az előző staging release-re sikeres.
- [ ] A produkciós `10.0.0.123` cél engedély nélkül elutasításra kerül.

## Arduino UNO R4 WiFi firmware

- [ ] A firmware `.bin` SHA-256 értéke egyezik.
- [ ] A publikus firmware nem tartalmaz valós Wi-Fi-, API- vagy OTA-titkot.
- [ ] Első telepítéshez saját `secrets.h` konfigurációval külön build készül.
- [ ] Tartalék Arduino-n a firmware-verzió `4.1.21`.
- [ ] Az `X-Device-Key` hitelesítés működik.
- [ ] A produkciós Arduino nem módosult a béta kiadás során.

## Teljes alkalmazási staging

- [ ] LED-státusz lekérhető.
- [ ] Egy teszt LED állapota módosítható, majd visszaállítható.
- [ ] Schedule lista lekérhető.
- [ ] Schedule mentés–visszaállítás próba sikeres.
- [ ] Arduino offline állapot felismerhető.
- [ ] Arduino visszatérése után az újracsatlakozás sikeres.
- [ ] A 30 másodperces Arduino válaszablak működik.
- [ ] Titkos API-kulcs nem kerül URL-be, logba vagy bizonyítékfájlba.

## Beta.1 lezárási döntés

- [ ] Nincs kritikus vagy magas prioritású nyitott hiba.
- [ ] Minden kötelező platform legalább egy valós telepítési smoke teszten átment.
- [ ] Az LXC rollback bizonyított.
- [ ] A firmware és az alkalmazás kompatibilitása bizonyított.
- [ ] Döntés rögzítve: javító `beta.2`, release candidate vagy további stabilizáció.
