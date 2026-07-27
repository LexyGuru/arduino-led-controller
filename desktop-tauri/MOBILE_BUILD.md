# Mobil build – Tauri 2

A Rust belépési pont mobil-kompatibilis:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
```

## Android

```bash
npm install
npm run tauri:android:init
npm run tauri:android:dev
npm run tauri:android:build
```

Az első `android init` után ellenőrizd a generált `src-tauri/gen/android/app/src/main/AndroidManifest.xml` fájlt. A helyi, titkosítatlan Arduino HTTP-kapcsolathoz szükség lehet az alábbi application beállításra:

```xml
android:usesCleartextTraffic="true"
```

## iOS

```bash
npm install
npm run tauri:ios:init
npm run tauri:ios:dev
npm run tauri:ios:build
```

Az `Info.ios.plist` tartalmazza a helyi hálózat használatának indoklását és az Arduino HTTP-kapcsolatához szükséges hálózati engedélyt. Fizikai iOS-eszközre telepítéshez Apple code signing és provisioning profile szükséges.

## OTA mobilon

A macOS Terminal mód csak macOS-en érhető el. Androidon és iOS-en az `auto` OTA mód automatikusan a beépített Tauri/Rust feltöltőt használja. A telefon és az Arduino legyen ugyanazon a helyi hálózaton, és az alkalmazásban az Arduino API-ja legyen elérhető.
