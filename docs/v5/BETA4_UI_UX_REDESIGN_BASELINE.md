# Beta.4 UI/UX Redesign Baseline

Base commit: `f9aeac3a2436823bb834f95ae6fe6a89089facf2`

## Purpose

Beta.4 is the dedicated full UI/UX redesign phase. Beta.3 functionality is the protected baseline:
OTA2, Update Center, Direct API, schedules, audit/logging, i18n runtime split, theme engine and
all release/version behavior remain functionally unchanged unless a later Beta.4 UI task explicitly
requires a compatible presentation-layer adaptation.

## Current shell audit

- `App.tsx` owns page routing and wires the controller domain into page surfaces.
- `Sidebar.tsx` owns six primary destinations: Dashboard, LEDs, Schedules, Firmware, Logs, Settings.
- `Topbar.tsx` owns global connection state and refresh.
- `DashboardPage.tsx` already has a `v55-*` composition with hero, primary metrics, health,
  statistics, schedules and LED snapshot surfaces.
- `main.tsx` imports multiple historical style layers (`core-ui-v1.5`, v55 management,
  Beta.2 reliability, Beta.3 update/redesign foundation). Beta.4 therefore gets its own neutral
  token layer instead of rewriting old CSS blindly.

## Beta.4 redesign sequence

1. Dashboard + Sidebar + Topbar + navigation.
2. LED control page.
3. Schedules page and editor.
4. Firmware + OTA2 + Update Center.
5. Logs + local/Tauri audit surfaces.
6. Settings hub/general/Arduino surfaces.
7. Responsive, accessibility, keyboard/focus, overflow, loading/error/empty-state sweep.
8. Full release-readiness regression.

## Protected contracts

- No firmware source modification.
- No version bump in this baseline package.
- No commit/push until user tests and explicitly approves.
- HU/EN/DE i18n remains canonical.
- `i18n/index.tsx` remains React-only; dictionaries/runtime stay in `i18n/runtime.ts`.
- OTA2 logic and Update Center behavior remain unchanged.
- Theme engine light/dark and named themes remain functional.
- Candidate-first application and full regression are mandatory.

## New baseline contract

The app shell gets the neutral class `beta4-ui-baseline`.
`v551-beta4-ui-baseline.css` defines only Beta.4 design tokens and responsive token adjustments.
No page layout is intentionally redesigned in this package.
