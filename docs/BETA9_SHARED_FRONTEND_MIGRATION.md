# Beta.9 – Shared Frontend / Full Platform Unification

- Tauri React UI = kanonikus frontend
- LXC ugyanazt a React forrást építi
- közös Tauri/LXC transport adapter
- böngésző-native Schedule import/export
- teljes LXC GitHub firmware release-katalógus
- firmware verzióválasztás
- LXC OTA cancel
- mobil OTA írás tiltott
- README és dokumentáció frissítve

## Shared public asset contract

A Beta.9 LXC web build a kanonikus `desktop-tauri/public/` könyvtárat használja Vite `publicDir` forrásként. Így a desktop és az LXC ugyanazt a `v5-icon.png` assetet kapja külön kézi LXC-másolat nélkül.

Az installer és az updater build/release gate ellenőrzi az assetet. Aktiválás után az updater a `/v5-icon.png` HTTP 200 választ is runtime gate-ként megköveteli; hiba esetén rollback történik.
