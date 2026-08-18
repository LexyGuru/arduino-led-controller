# Beta.4 Settings + Final UI Consistency / Accessibility Sweep

Base remote commit: `f9aeac3a2436823bb834f95ae6fe6a89089facf2`.

## Settings visual scope
- Settings hub navigation
- General / Arduino tabs
- language panel
- Theme Engine V2 gallery / preview / controls
- Direct API connection profile
- endpoint previews
- timezone / DST controls
- OTA uploader configuration
- App Update Center
- Stable/Beta channel controls
- sticky test/save actions

## Protected Settings behavior
No functional change to:
- host/port/path/API-key validation
- `canSave`
- local/remote endpoint construction
- macOS local API guard
- timezone offset calculation
- next DST transition calculation
- OTA host/port/mode/tool path/password settings
- app/firmware update channel settings
- auto-check / auto-download
- language persistence
- save/test callbacks
- Theme Engine V2 state

## Final Beta.4 consistency / accessibility sweep
Adds:
- consistent `:focus-visible`
- coarse-pointer touch targets
- disabled-state affordance
- long-value wrapping
- operational-scroll overflow protection
- reduced-motion enforcement
- high-contrast fallback
- narrow-screen settings form protection

This is an incremental presentation-only layer on successful V527.
