# Repository takarítási terv

A repository több fejlesztési korszak fájljait tartalmazza. Az aktív rendszer jelenleg Arduino firmware-ből, Tauri kliensből, opcionális Node.js/LXC szerverből és GitHub workflow-kból áll.

## Biztonságosan eltávolítható

### Régi Electron kliens

```text
desktop/
```

A gyökér `package.json` korábban Electronra hivatkozott. A desktop kliens szerepét teljesen átvette a `desktop-tauri/` projekt.

### Verzióspecifikus fejlesztési jegyzetek

```text
desktop-tauri/V3.0.*_FIXES.md
desktop-tauri/OTA_*.md
```

Ezek fejlesztés közbeni átmeneti jegyzetek. A tartós dokumentáció a fő README-ben és a `docs/` mappában legyen.

### Régi, duplikált firmware-másolatok a Tauri mappában

Ha léteznek:

```text
desktop-tauri/firmware/
desktop-tauri/firmware-tools/
```

Az aktív firmware egyetlen hiteles helye:

```text
firmware/ArduinoLedController/ArduinoLedController.ino
```

Az `arduinoOTA` futtatható fájlokat csak akkor tartsd meg a `tools/arduinoOTA/` mappában, ha a kiadási folyamat ténylegesen csomagolja őket.

## Megtartandó

```text
.github/workflows/
deploy/
desktop-tauri/
firmware/ArduinoLedController/
tools/api-kulcs-generator.html
server2_final.js
package.json
README.md
```

## Kódon belüli takarítás

A frissített `server2_final.js` fájlból eltávolításra került:

- a soha nem használt első generációs dashboard-renderelő;
- a fő `/` route `return` utáni, elérhetetlen HTML és hibakezelő kódja.

A `renderControlDashboardV2()` megmarad, mert a jelenlegi konfigurált web UI erre épül.

## Release-ek takarítása

A GitHub Release-eket a helyi szkript nem tudja biztonságosan módosítani. A Releases oldalon kézzel ellenőrizd:

- régi hibás release assetek;
- AppImage belső `.so`, `.png`, `AppRun` fájlok;
- azonos verzióhoz tartozó duplikált telepítők;
- elavult teszt-release-ek.

A jelenlegi workflow csak `.dmg`, `.exe`, `.AppImage`, `.deb`, `.apk`, `.aab` és `.ipa` fájlokat enged a közös Release-be.

## Licenc

A repository nyilvános, de külön `LICENSE` fájl nélkül az újrafelhasználási jogok nem egyértelműek. Válassz licencet a projekt célja szerint, például:

- MIT: egyszerű és megengedő;
- Apache-2.0: megengedő, szabadalmi kikötésekkel;
- GPL-3.0: a származékos nyílt forrás megtartását igényli.

A licenc kiválasztása jogi döntés; a szkript nem hoz létre automatikusan licencfájlt.

## Ajánlott végrehajtás

```bash
bash scripts/cleanup-repository.sh --dry-run
bash scripts/cleanup-repository.sh --apply
node --check server2_final.js
cd desktop-tauri
npm install
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

A törléseket külön commitban érdemes elvégezni, hogy szükség esetén könnyen visszaállíthatók legyenek.
