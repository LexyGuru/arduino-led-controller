# Arduino LED Controller V5 – Shared Frontend Architecture

Beta.9-től egyetlen kanonikus React UI-forrás szolgálja ki a macOS, Windows,
Linux, iOS, iPadOS, Android és Proxmox/Debian LXC célokat: `desktop-tauri/src/`.

A `web-lxc` csak Vite bootstrap. Külön LXC App/API/CSS UI-klón nincs.

- Desktop OTA: engedélyezett
- LXC OTA: engedélyezett
- iOS/iPadOS/Android OTA írás: tiltott
- Firmware információ és közös UI mobilon is látható
- LXC firmware-katalógus: teljes GitHub stable/beta release lista

Verziók:
- Application: `5.0.0-beta.9`
- Firmware: `5.0.0-beta.6`
- Direct API: `1.0.0`

## Canonical public assets

A shared frontend kanonikus statikus asset-forrása a `desktop-tauri/public/`. A `web-lxc` Vite konfiguráció ezt használja `publicDir`-ként, ezért a `v5-icon.png` desktop és LXC buildben ugyanabból a forrásból származik.
