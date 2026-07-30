# Legacy adapter migráció

## Cél

A régi webfelület és kliensek változtatás nélkül működjenek, miközben a régi
`/api/...` végpontok fokozatosan a közös V5 szolgáltatásokat használják.

## Alapértelmezett kapcsolók

```text
LEGACY_API_ADAPTERS_ENABLED=1
LEGACY_LOCAL_SCHEDULE_ADAPTERS_ENABLED=0
LEGACY_SOCKET_EVENT_BRIDGE_ENABLED=1
LEGACY_SUPPRESS_SIGNAL_HANDLERS=1
```

A helyi schedule adapter csak akkor kapcsolható `1` értékre, amikor a monolit
`localSchedules` memóriája és percenkénti cronja már ki van kapcsolva.

## Válaszkompatibilitás

Az adapterek nem az API v2 `{success,data,meta}` burkolatát használják, hanem a
régi, közvetlen JSON-válaszokat. Emiatt a jelenlegi böngészős felülethez nem kell
azonnali frontend-módosítás.

## Biztonsági sorrend

1. Nyilvános régi auth status/login/logout route-ok.
2. Közös `SessionService` alapú `/api` middleware.
3. Régi kompatibilitási adapterek.
4. Fallbackként a még megmaradt monolit route-ok.

## Visszaállítás

Az adapterréteg azonnal kikapcsolható:

```text
LEGACY_API_ADAPTERS_ENABLED=0
```

Ekkor minden régi útvonalat ismét a `server2_legacy.js` szolgál ki.
