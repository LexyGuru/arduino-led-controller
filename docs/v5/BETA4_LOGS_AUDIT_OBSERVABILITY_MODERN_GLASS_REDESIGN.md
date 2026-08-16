# Beta.4 Logs / Audit / Observability Modern Glass Redesign

Base remote commit: `f9aeac3a2436823bb834f95ae6fe6a89089facf2`.

## Presentation scope
- Logs page hero
- search / clear toolbar
- level and source filter control deck
- pause / export / diagnostics controls
- five telemetry summary cards
- unified Arduino + Tauri Audit + Network activity stream
- severity and source badges
- Arduino console cache panel
- local Tauri audit panel
- responsive observability layout
- reduced-motion support

## Protected behavior
V527 does not change:
- `useV5Logs`
- API v2 / legacy direct / legacy fallback selection
- 5000 ms refresh cadence
- event stream subscription
- log merge / normalization
- 500-row unified display cap
- pause behavior
- level/source/search filters
- clear-console API behavior
- local audit clear behavior
- `.log` export
- diagnostics ZIP export
- network log localization
- firmware event localization

## Incremental contract
V527 requires successful V526 visual markers but does not reapply
Dashboard, LED, Schedules or Firmware source mutations.
