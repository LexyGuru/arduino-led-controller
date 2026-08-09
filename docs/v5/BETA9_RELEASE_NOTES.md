# Arduino LED Controller 5.0.0-beta.9 – Release Notes


## Neon Panel UI Stabilization

A Beta.9 a V5 desktop felület, branding, reszponzív megjelenítés és macOS credential-kezelés stabilizációs kiadása.

### Fő változások

- teljes V5 theme-token migráció a legacy hardcoded UI színek helyett;
- Light/Dark és további theme variánsok konzisztens alkalmazása;
- Dashboard időszinkron műveletsor spacing javítása;
- új V5 Neon Panel ikon- és branding készlet;
- új V5 README prezentáció;
- `Arduino LED Controller V5` terméknév és `Direct Arduino Control & Automation` alcím;
- legacy `2026_MAX_LED VEZÉRLŐRENDSZER` feliratok eltávolítása a felhasználói felületről;
- Helyi audit lista reszponzív grid javítása desktop, tablet és mobil szélességeken;
- Topbar V5 header egyszerűsítés és duplikált cím eltávolítás;
- Direct Mode alatt a felesleges legacy API v2 bearer Keychain bootstrap letiltása;
- Firmware `Ellenőrzés` művelet nem olvassa ki feleslegesen az OTA-jelszót a macOS Keychainből;
- a tényleges OTA telepítés biztonságos Keychain secret-olvasása és session cache viselkedése megmarad.

### Kompatibilitás

- Desktop app: `5.0.0-beta.9`
- Firmware: `5.0.0-beta.6`
- Direct API: `1.0.0`
- Board: Arduino UNO R4 WiFi
- Channel: Beta

### Nem változott

- Arduino firmware forrás;
- OTA Exclusive Mode firmware mechanizmus;
- Direct API v1 contract;
- generated API v2 contract;
- stabil `main` branch.

### Kiadás neve

**5.0.0-beta.9 — Neon Panel UI Stabilization**

### Release és supply-chain

- GitHub **prerelease**: `v5.0.0-beta.9`.
- A stabil `main` branch nem módosul.
- Az alkalmazásrelease nem tartalmaz firmware BIN-t.
- Az LXC staging alapból nem használja a produkciós `10.0.0.123` Arduino-célt.
- A release `SHA256SUMS`, `RELEASE-MANIFEST.json`, `SBOM.cdx.json`, `PROVENANCE.json` és `SECRET-SCAN.json` bizonyítékokat tartalmaz.

A Beta.9 GitHub prerelease a `next/v5-rearchitecture` ágról készül.

A `main` ág nem módosul.

A firmware forrás nem módosul automatikusan; a párosított firmware verzió `5.0.0-beta.6`.

A GitHub kiadás `prerelease: true` és `make_latest: false`.

## Beta.9 canonical architektúra

- A desktop és az LXC ugyanazt a **shared React** felületet használja.
- A canonical ikon asset: `desktop-tauri/public/v5-icon.png`, runtime útvonala `/v5-icon.png`.
- A canonical LXC backend Rust + Axum.
- A canonical LXC service: `arduino-led-controller-rust.service`.
- Az LXC updater **tranzakciós** frissítési és rollback folyamatot használ.
- Az update control-plane: `arduino-led-controller-update.service` és `arduino-led-controller-update.timer`.
- Alkalmazás: `5.0.0-beta.9`.
- Párosított firmware: `5.0.0-beta.6`.
- Direct API: `1.0.0`.
