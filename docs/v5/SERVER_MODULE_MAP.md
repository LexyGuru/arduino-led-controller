# V5 szervermodulok térképe

## Indítási folyamat

```text
server2_final.js
  ├─ RuntimePaths + Config + Logger
  ├─ LifecycleManager + ShutdownCoordinator
  ├─ MetricsRegistry + AuditLog + DiagnosticsService
  ├─ EventStore + EventBus
  ├─ ApiTokenStore + UserRepository + SessionService
  ├─ ArduinoClient
  ├─ LedService
  ├─ ScheduleService + LocalScheduleRepository + LocalScheduleRunner
  ├─ FirmwareReleaseClient + OtaRunner + FirmwareService
  ├─ OpenApiService
  ├─ ExpressBootstrapRegistry
  ├─ SocketBootstrapRegistry + SocketGateway
  └─ server2_legacy.js
```

## Core és életciklus

| Modul | Feladat |
|---|---|
| `server/core/runtime-paths.js` | Minden futásidejű fájl és könyvtár |
| `server/core/config.js` | Környezeti és mentett konfiguráció |
| `server/core/runtime-context.js` | Közös szolgáltatások |
| `server/core/lifecycle-manager.js` | Starting, ready, draining és stopped állapot |
| `server/core/shutdown-coordinator.js` | Fordított sorrendű cleanup és jelkezelés |

## Megfigyelhetőség

| Modul | Feladat |
|---|---|
| `server/events/event-store.js` | Rotálható tartós JSONL eseménytár |
| `server/events/event-bus.js` | Memória + tartós eseményközvetítés |
| `server/observability/metrics-registry.js` | HTTP, esemény és szolgáltatás metrikák |
| `server/observability/audit-log.js` | Redaktált, rotálható auditnapló |
| `server/observability/diagnostics-service.js` | Processz- és szolgáltatásdiagnosztika |
| `server/api/v2/observability-routes.js` | Metrics, diagnostics és audit API |

## Biztonság

| Modul | Feladat |
|---|---|
| `server/security/user-repository.js` | Atomikus felhasználó CRUD, scrypt és last-admin védelem |
| `server/security/session-service.js` | Legacy session és stateless CSRF |
| `server/api/v2/user-routes.js` | Felhasználó-adminisztráció |
| `server/api/v2/auth.js` | Bearer/session auth és session CSRF kikényszerítés |

## API dokumentáció

| Modul | Feladat |
|---|---|
| `server/api/v2/openapi-service.js` | OpenAPI fájl betöltése és gyorsítótárazása |
| `server/api/v2/openapi-routes.js` | JSON és HTML dokumentáció |
| `docs/api/openapi-v2.json` | OpenAPI 3.1 gépi séma |

## Hátralévő fő migrációk

1. Legacy LED, schedule, auth és firmware route-ok átállítása.
2. Legacy Socket.IO események teljes bekötése az EventBus rendszerbe.
3. Statikus webes felület kiemelése.
4. Izolált LXC és rollback release gate.
5. `5.0.0-alpha.2` verziólépés.
