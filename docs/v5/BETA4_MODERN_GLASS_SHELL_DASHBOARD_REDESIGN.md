# Beta.4 Modern Glass Shell + Dashboard Redesign

Base commit: `f9aeac3a2436823bb834f95ae6fe6a89089facf2`
Prerequisite dirty baseline: V517 Beta.4 UI/UX Redesign Baseline.

## Visual direction

Beta.4 moves the desktop shell toward a modern glass-control-center aesthetic:

- dark translucent shell surfaces
- theme-driven cyan/electric/violet-compatible accents
- floating sidebar and top command deck
- luminous active navigation
- aurora dashboard hero
- stronger system orbit
- glass KPI cards with subtle depth/hover
- improved responsive spacing
- reduced-motion accessibility

All accent colors remain derived from the existing design system. No fixed new
brand color is introduced, so light/dark and named themes remain authoritative.

## Functional preservation

This package is presentation-only. It does not change:

- Direct API behavior
- OTA2 pipeline
- Update Center logic
- schedules
- audit/logging
- i18n runtime behavior
- firmware source
- release/app version

## Beta.4 sequence

After this shell/dashboard pass:
1. LED controls redesign
2. Schedules redesign
3. Firmware / OTA2 / Update Center redesign
4. Logs / audit redesign
5. Settings redesign
6. final responsive/accessibility sweep
