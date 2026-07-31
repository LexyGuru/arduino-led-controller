# V5 integrációs runbook

## Aktuális állapot

A `next/v5-rearchitecture` ág firmware-oldala lezárt és hardveren elfogadott.

- alkalmazás: `5.0.0-beta.1`;
- firmware: `4.3.0-beta.1`;
- Direct API: `1.0.0`;
- query fallback: forrásból tiltva;
- firmware hardverkapu: sikeres;
- következő aktív munkaterület: Tauri redesign.

## Branch-szabályok

- `main` változatlan produkciós ág;
- fejlesztés külön feature ágon történjen;
- a feature ág Pull Requesten keresztül kerüljön a `next/v5-rearchitecture` ágba;
- közvetlen feature → `main` merge tilos;
- produkciós LXC vagy Arduino nem használható fejlesztési gate céljára.

## Kötelező integrációs ellenőrzések

```bash
npm ci
npm test
bash scripts/validate-repository.sh

cd desktop-tauri
npm ci
npm run build
cd ..

cargo check --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
cargo test --locked --manifest-path desktop-tauri/src-tauri/Cargo.toml
```

Firmware-módosítás esetén ezenfelül:

```bash
node scripts/test-f14-complete-api.js
node scripts/test-f14-complete-firmware.js
node scripts/test-f14-complete-storage-layout.js
node scripts/test-f14-complete-query-fallback-lock.js
node scripts/test-f14-final-reboot-api.js
node scripts/test-f14-1-http-response-transport.js
node scripts/test-f14-1-memory-budget.js
node scripts/test-alpha3-device-key-header.js
```

## Tauri redesign kapu

A redesign során külön kell kezelni:

1. közvetlen Arduino-kapcsolat;
2. credential és device-key kezelés;
3. OTA uploader és fix `65280` port;
4. schedule tranzakciók és lapozás;
5. LED vezérlés és debounce;
6. konzol és diagnosztika;
7. opcionális LXC/szerver mód.

A szerver- és LXC-réteg csak akkor törölhető, ha a Tauri importok, modellek, panelek és tesztek már nem hivatkoznak rájuk.
