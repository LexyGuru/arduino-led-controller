# Közreműködés

## Aktuális Beta integrációs cél

- Alkalmazás: `6.0.0-beta.8`
- Firmware: `5.1.0-beta.4`
- Direct API: `1.2.0`
- Language Pack Architecture: `2.1`
- Beta/integrációs ág: `next/v5-rearchitecture`
- Stable ág: `main`
- Nyelvi katalógus és packok: `language-packs`

A `main` ág Beta-fejlesztés közben nem módosítható. Új javítás előtt a távoli `next/v5-rearchitecture`, `main` és `language-packs` állapotát frissen ellenőrizni kell.

## Ágmodell

- `next/v5-rearchitecture`: aktuális Beta fejlesztési és integrációs ág.
- `main`: stabil produkciós ág.
- `language-packs`: alkalmazástól független Language Pack Architecture 2.1 katalógus és letölthető csomagok.
- Force push és destruktív reset release-folyamatban tilos.

## Fejlesztési környezet

Ajánlott eszközök:

- Node.js a repository workflow által támogatott verzióban;
- npm;
- Rust stable toolchain;
- Tauri v2 függőségek;
- Arduino CLI az UNO R4 WiFi firmware-munkához.

## Lokalizáció

Az angol a beépített canonical fallback. A további 14 nyelv letölthető packként él a `language-packs` ágon.

- Language Pack Architecture: `2.1`.
- Catalog: `2.1.0`.
- Új UI-kulcsot a canonical angol kulcskészlethez kell hozzáadni.
- A packok schema-, language-code-, app-kompatibilitási, placeholder- és SHA-256 ellenőrzésen mennek át.
- A letölthető dictionary kulcskészlete pontosan egyezzen a canonical angollal.

## Kötelező ellenőrzések

```bash
npm ci
npm test
bash scripts/validate-repository.sh

cd desktop-tauri
npm ci
npx tsc --noEmit
npm run build
cd ..

cargo check --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
cargo test --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
cargo test --locked --manifest-path rust/Cargo.toml
```

Firmware-változásnál ezen felül kötelező az UNO R4 WiFi fordítás és a verzió/Direct API SSOT ellenőrzés. Release előtt valós hardverteszt szükséges.

## SSOT és verziók

A `release-versions.json` a release identity központi forrása. A `scripts/check-versions.py` ellenőrzi az application, firmware, Direct API és staging runtime felületeket.

Aktuális Beta identity:

```text
Application  6.0.0-beta.8
Firmware     5.1.0-beta.4
Direct API   1.2.0
```

Új verzióemelésnél minden derivált metadata és release workflow ugyanebből az SSOT-ból dolgozzon; új hardcoded release-verzió nem vezethető be.

## Bash kompatibilitás

A projekt release- és telepítőscriptjeinek macOS Bash 3.2 alatt is működniük kell.

Tilos többek között: `readarray`, `mapfile`, `git reset --hard`, ellenőrizetlen `git clean -fd`, force push, illetve release-csomagban `git add .`, `git add -A` vagy `git add --all`.

## Titkok és artifactok

Ne commitolj `.env`/credential/private-key fájlokat, `firmware/ArduinoLedController/secrets.h`-t, valódi Device Key/OTA/Wi-Fi titkot, build outputot vagy lokális credential-adatbázist.

## Commitok

Rövid, célzott Conventional Commit üzenet ajánlott. Commit/push előtt a teljes kapcsolódó contract- és regression-láncnak zöldnek kell lennie.
