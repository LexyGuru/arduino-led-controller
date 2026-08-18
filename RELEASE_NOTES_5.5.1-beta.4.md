# Arduino LED Controller 5.5.1-beta.4 — Beta.4 Release Notes

## Release identity

- Application: `5.5.1-beta.4`
- Firmware: `5.0.0-beta.9`
- Direct API: `1.0.0`
- Channel: Beta / `next/v5-rearchitecture`
- Stable `main`: not modified

## Beta.4 UI/UX redesign

Beta.4 consolidates the complete modern glass redesign across the desktop
application while preserving the Beta.3 functional foundation.

### Shell and Dashboard
- fixed responsive sidebar
- modern glass sidebar and topbar
- aurora dashboard hero
- glass KPI cards and orbit status visualization

### LED controls and schedules
- modern responsive LED cards and controls
- 4000 ms delayed brightness/speed send preserved
- schedule cards, backup, restore, conflict and import/export behavior preserved

### Firmware / OTA2 / Update Center
- modern firmware command center
- Update System 2.0 presentation
- OTA2 timeline, blocker and history presentation
- firmware restore / reinstall / rollback catalog
- checksum, backup, recovery and safe-cancel behavior preserved

### Logs / Audit / Observability
- unified Arduino / Audit / Network stream
- modern filter and telemetry presentation
- diagnostics export preserved

### Settings / Theme Engine
- Settings Hub redesign
- Theme Engine 2.5 visual integration
- app and firmware channel controls
- OTA configuration and timezone behavior preserved

### Accessibility and consistency
- focus-visible contract
- reduced-motion handling
- high-contrast fallback
- touch-target and overflow protection

## LXC

The LXC/web application version metadata is aligned to `5.5.1-beta.4`. The existing
LXC runtime and server behavior are preserved.

## Firmware

Firmware source is not modified by this release-readiness closure. Firmware
remains `5.0.0-beta.9`.

## Stable branch

`main` is not modified by the Beta.4 preparation workflow.
