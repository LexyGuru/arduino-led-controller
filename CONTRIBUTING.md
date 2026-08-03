# Közreműködés

## Ágmodell

- `main`: stabil, produkciós alap. Közvetlen beta fejlesztés, reset vagy force push tilos.
- `next/v5-rearchitecture`: beta és integrációs fejlesztési ág.
- Minden változtatás a célzott fejlesztési ágból induljon, és normál pull request vagy ellenőrzött commit/push folyamaton menjen át.

## Fejlesztési környezet

Ajánlott eszközök:

- Node.js 20 vagy újabb támogatott verzió;
- npm;
- Rust stable toolchain;
- Tauri v2 függőségek;
- Arduino CLI az UNO R4 WiFi firmware-munkához.

## Lokalizáció

Új felhasználói felületi, runtime-, státusz-, hiba- vagy sikerüzenet nem kerülhet közvetlen literal szövegként a komponensekbe vagy hookokba.

- React komponensben: `useI18n()`.
- Reacten kívül és hook műveleti üzenetekhez: `translate()`.
- Központi szótár: `desktop-tauri/src/i18n/index.tsx`.
- Minden új kulcshoz kötelező magyar, angol és német fordítás.
- A HU/EN/DE kulcskészletnek azonosnak kell lennie.
- A contractok a kulcshasználatot és külön a szótárértékeket ellenőrizzék.
- A regexek legyenek idézőjel- és whitespace-függetlenek.

## Kötelező ellenőrzések

```bash
npm ci
npm test
npm run validate

cd desktop-tauri
npm ci
npm run build
cd ..

cargo fmt --manifest-path desktop-tauri/src-tauri/Cargo.toml -- --check
cargo check --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
cargo test --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
```

Firmware-változásnál ezen felül:

- publikus és privát UNO R4 WiFi fordítás;
- firmware-verzió és `firmware-release.json` egyezés;
- valós hardverteszt;
- OTA, reboot és schedule persistence ellenőrzés.

## Bash kompatibilitás

A projekt release- és telepítőscriptjeinek macOS Bash 3.2 alatt is működniük kell.

Tilos:

- `readarray`;
- `mapfile`;
- destruktív `git reset --hard`;
- ellenőrizetlen `git clean -fd`;
- force push;
- globális `git add .` release-csomagban.

## Fájlkezelés

Ne commitolj:

- `.env`, `.env.*`;
- `secrets.h`;
- credential- vagy private-key fájlokat;
- `.pem`, `.p12`, `.mobileprovision`;
- `node_modules`, `target`, `dist`;
- `.ipa`, `.apk`, `.aab`, `.dmg`, `.msi`, `.AppImage`;
- `.deb`, `.rpm`, `.bin`, `.elf`, `.hex`, `.map`;
- valódi API-kulcsot, OTA-jelszót vagy Wi-Fi-jelszót.

## Verziók

Az alkalmazásverzió aktív forrásai közé tartozik:

- `VERSION`;
- `release-versions.json`;
- gyökér `package.json` és lock fájl;
- `desktop-tauri/package.json` és lock fájl;
- `desktop-tauri/src-tauri/Cargo.toml` és `Cargo.lock`;
- `desktop-tauri/src-tauri/tauri.conf.json`;
- beta release workflow és aktív release-contractok.

A firmware-verziót csak firmware-kód változásakor emeld.

## Commitok

Használj rövid, célzott Conventional Commit üzenetet:

```text
feat(i18n): add translated runtime messages
chore(release): prepare 5.0.0-beta.5
docs: update documentation for 5.0.0-beta.5
```

A funkció-, release- és dokumentációs változásokat lehetőleg külön commitold.
