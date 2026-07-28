# Arduino LED Controller – Tauri kliens

Tauri 2 + Rust + React alapú többplatformos kliens az Arduino UNO R4 WiFi LED Controllerhez.

## Platformok

- Windows
- macOS
- Linux
- Android
- iPhone / iPad

## Mobilkorlátozás

Androidon és iOS/iPadOS rendszeren a firmware OTA-frissítés szándékosan le van tiltva. A mobilalkalmazás LED-vezérlésre, időzítésekre, státuszra és naplókra használható.

## Fejlesztés

```bash
npm install
npm run tauri:dev
```

## Ellenőrzés

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

## Mobil build

```bash
npm run tauri:android:init
npm run tauri:android:dev
npm run tauri:android:build

npm run tauri:ios:init
npm run tauri:ios:dev
npm run tauri:ios:build
```

A telepítési útmutató a repository gyökerében található:

```text
docs/MOBILE_INSTALL.md
```
