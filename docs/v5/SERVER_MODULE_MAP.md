# V5 szervermodulok térképe

## Indítás

```text
server2_final.js
  ├─ core config / runtime paths / logger
  ├─ ApiTokenStore
  ├─ ArduinoClient
  ├─ LedService
  ├─ ScheduleService
  ├─ LocalScheduleRepository
  ├─ LocalScheduleRunner
  ├─ LocalScheduleService
  ├─ FirmwareReleaseClient
  ├─ OtaRunner
  ├─ FirmwareService
  ├─ ExpressBootstrapRegistry
  │    ├─ health
  │    └─ API v2
  └─ server2_legacy.js
```

A `server2_legacy.js` továbbra is kiszolgálja a régi webes és `/api/...`
végpontokat. Az új szolgáltatások az API v2 mellett, párhuzamosan működnek.

## Biztonsági modulok

| Modul | Feladat |
|---|---|
| `server/security/roles.js` | Szerepkörök és jogosultságok |
| `server/security/api-token-store.js` | Több Bearer token, szerepkör és konstans idejű összehasonlítás |
| `server/api/v2/auth.js` | Tokenfeldolgozás és principal létrehozása |
| `server/api/v2/authorize.js` | Jogosultsági middleware |

## Helyi schedule modulok

| Modul | Feladat |
|---|---|
| `local-schedule-repository.js` | Atomikus JSON adattár és automatikus backup |
| `local-schedule-runner.js` | Időzónahelyes, duplikációvédett futtató |
| `local-schedule-service.js` | Repository, runner és Arduino sync összekapcsolása |
| `local-schedule-routes.js` | API v2 CRUD, export/import, sync és manuális tick |

## Firmware modulok

| Modul | Feladat |
|---|---|
| `firmware-release-client.js` | GitHub release és ellenőrzött bináris letöltés |
| `ota-runner.js` | Shell nélküli `arduinoOTA` folyamatindítás |
| `firmware-service.js` | OTA állapotgép és Arduino-visszajelentkezés |
| `firmware-routes.js` | API v2 status, check és update |

## Már modularizált területek

- Core konfiguráció és runtime context
- Arduino HTTP-kliens
- Health
- API v2 platform
- LED szolgáltatás
- Arduino schedule szolgáltatás
- Helyi schedule repository és runner
- Többtokenes API-hitelesítés
- Firmware release és OTA szolgáltatás

## Következő nagy területek

1. Legacy LED, schedule, auth és firmware route-ok átállítása a közös szolgáltatásokra.
2. Socket.IO és konzolstream külön modulba emelése.
3. Statikus webes felület külön modulba emelése.
4. Automatikus LXC rollback.
5. OpenAPI séma és Tauri kliensmigráció.
