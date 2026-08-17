# Arduino LED Controller 5.6.0-beta.1 — Beta.1 Release Notes

## Release identity
- Application: `5.6.0-beta.1`
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Channel: Beta / `next/v5-rearchitecture`
- Stable `main`: not modified

## Theme Engine 2.0
- 12 factory themes plus one custom theme slot
- Graphite Pro, Aurora Drive, Cyber Violet, Crimson Noir and Mint Lab
- expanded 11-color accent palette
- solid / translucent / glass material modes
- off / subtle / vivid gradient modes
- standard / high contrast mode
- six chart/data palette tokens
- versioned JSON theme profile import/export
- clone-current-theme workflow
- token sanitization and text/background contrast validation
- v1/v2 appearance storage migration into v3
- Theme Engine 2.x compatibility remains regression-covered

## Shared frontend
Theme Engine 2.0 is shared by desktop, mobile and web/LXC rendering.
Platform-specific adapters remain isolated.

## macOS OTA
The released Beta.7 macOS OTA implementation and immutable baseline are not modified.

## Firmware
Firmware source is not modified. Paired firmware remains `5.0.0-beta.10`.

## Update System 2.0
Update System 2.0 remains supported and unchanged.

## Stable branch
`main` is not modified.

## Startup Experience & Navigation Motion
- animated application startup integrity screen before the main control surface
- eight startup checks: shell, Theme Engine, app version, runtime, configuration, schedules/cache, storage and Arduino/API reachability
- Arduino/network reachability is advisory and never traps the user in an endless loading screen
- shared page-transition motion for Dashboard, LEDs, Schedules, Firmware, Logs and Settings
- Theme Engine motion profile and OS reduced-motion preference are respected
- shared frontend behavior for desktop, mobile and web/LXC

## Custom Theme Editor & Visual FX
- native Tauri profile export no longer uses the macOS WebView Blob-download path
- native profile export copies validated JSON to the clipboard; Web/LXC keeps file download
- custom theme name and eleven key palette colors are editable with live preview
- six Visual FX modes: None, Ambient Glow, Scanlines, Tech Grid, Aurora Flow, Soft Pulse
- Visual FX combines with Glass, Glow, Gradient and Motion
- reduced-motion preference disables animated FX motion

## Theme Engine 2.0 Completion
- up to 24 saved custom profiles with apply/duplicate/delete
- typography presets and global UI scale
- glass blur, panel opacity and glow intensity controls
- custom 3-color gradient editor
- seed-color palette generator
- live WCAG contrast score and automatic contrast fix
- deuteranopia/protanopia/tritanopia/monochrome chart palettes
- per-section reset controls
