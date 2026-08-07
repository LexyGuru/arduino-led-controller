# Arduino LED Controller 5.0.0-beta.8

## Neon Panel UI Stabilization

A Beta.8 a V5 desktop felület, branding, reszponzív megjelenítés és macOS credential-kezelés stabilizációs kiadása.

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

- Desktop app: `5.0.0-beta.8`
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

**5.0.0-beta.8 — Neon Panel UI Stabilization**
