# Direct API v1 Only – Phase 1 audit

A firmware kizárólag a Direct API v1 protokollt szolgálja ki.
A `routeLegacy()` és minden legacy firmware-végpont végleg törölve.
Minden nem `/api/v1/` kérés `DIRECT_API_V1_REQUIRED` választ kap.

Az LXC/Node legacy kliens ebben a fázisban még nem törlődik vakon;
előbb Direct API v1-re kell migrálni.


## V3 folytatás – diagnosztikai legacy maradványok törlése

A V2 sikeresen törölte a `routeLegacy()` függvényt, de a firmware-ben még
három nem működési, hanem diagnosztikai legacy maradvány volt:

- a bootkori teljes legacy status URL;
- a `pollingPath()` régi polling útvonalai;
- az `api url` soros parancs legacy URL-je.

A V3 ezeket végleg törli. A firmware és a diagnosztika is kizárólag
Direct API v1 útvonalakat jelenít meg és osztályoz.
