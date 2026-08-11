# V5 Platform Icon System

The application has four canonical icon masters:

| Build channel | macOS Light | macOS Dark |
| --- | --- | --- |
| Stable | `v5-stable-light-master.png` | `v5-stable-dark-master.png` |
| Beta | `v5-beta-light-master.png` | `v5-beta-dark-master.png` |

## Runtime selection

The application version decides **Beta vs Stable**.

The Mac's local wall-clock time decides **Day/Light vs Night/Dark**.

The frontend selects the daytime icon from 07:00 until 18:59 and the night
icon from 19:00 until 06:59 using the Mac's local time. It synchronizes at
startup, rechecks once per minute, and also uses the Tauri system-theme event
as an additional resynchronization trigger.

On macOS the native backend temporarily updates the Dock application icon
using AppKit. The bundle still contains the normal generated Tauri icon set as
the startup/fallback icon.

## Beta visibility

Beta masters deliberately use a large, high-contrast `BETA` badge so the
channel remains readable at small Dock/Finder icon sizes. All four masters
use transparent outer canvas space; Light variants brighten the V5 artwork
without introducing a white square behind the Dock icon.

## Platform behavior

- macOS: runtime Day/Night icon switching + Beta/Stable version selection.
- Windows/Linux: generated static platform icon set.
- Android/iOS: generated mobile icon assets; runtime macOS Dock switching does
  not apply to mobile platforms.

## Mapping

```text
Stable + Light -> v5-stable-light
Stable + Dark  -> v5-stable-dark
Beta   + Light -> v5-beta-light
Beta   + Dark  -> v5-beta-dark
```

## Light artwork guarantee

The Light masters keep a genuinely bright white/silver rounded icon body while
only the canvas outside that rounded silhouette is transparent. This prevents
the previous regression where removing the white square also made the entire
Light artwork dark.

The runtime mapping remains:

```text
Beta + Light   -> v5-beta-light
Beta + Dark    -> v5-beta-dark
Stable + Light -> v5-stable-light
Stable + Dark  -> v5-stable-dark
```

The Light and Dark masters are validated as distinct assets and all runtime
masters retain alpha transparency for clean macOS Dock rendering.
