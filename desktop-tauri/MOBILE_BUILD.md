# Mobil build

A részletes telepítési és használati útmutató:

```text
../docs/MOBILE_INSTALL.md
```

## Android

```bash
npm run tauri:android:init
npm run tauri:android:dev
npm run tauri:android:build
```

## iOS / iPadOS

```bash
npm run tauri:ios:init
npm run tauri:ios:dev
npm run tauri:ios:build
```

Az iOS CI unsigned IPA-t készít. Telepítés előtt külön aláírás szükséges. Mobilplatformokon az Arduino firmware OTA-frissítése nem érhető el.
