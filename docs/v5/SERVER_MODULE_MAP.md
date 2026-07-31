# V5 szervermodulok térképe

## Indítási folyamat

```text
server2_final.js
  ├─ LifecycleManager + ShutdownCoordinator
  ├─ HttpServerRegistry
  ├─ core config / paths / runtime settings
  ├─ EventBus / EventStore / AuditLog / Metrics
  ├─ security / session / users
  ├─ ArduinoClient / LedService / ScheduleService
  ├─ LocalScheduleService
  ├─ FirmwareService / OtaRunner
  ├─ SocketGateway + LegacyEventBridge
  ├─ Express installers
  │    ├─ health
  │    ├─ API v2
  │    └─ legacy service adapters
  ├─ Socket.IO installers
  └─ guarded require(server2_legacy.js)
```

## Új legacy kompatibilitási réteg

| Modul | Feladat |
|---|---|
| `server/legacy/legacy-api-bootstrap.js` | Adapterek sorrendje, body parser és sessionvédelem |
| `legacy-auth-routes.js` | Régi auth status/login/logout |
| `legacy-auth-middleware.js` | Régi `/api` session-ellenőrzés |
| `legacy-arduino-routes.js` | Régi Arduino, LED és Arduino schedule útvonalak |
| `legacy-settings-routes.js` | Régi Arduino célgép-beállítás |
| `legacy-firmware-routes.js` | Régi firmware status/update |
| `legacy-local-schedule-routes.js` | Opcionális régi helyi schedule adapter |
| `legacy-event-bridge.js` | V5 témákból régi Socket.IO eseménynevek |
| `legacy-signal-guard.js` | A monolit saját SIGTERM/SIGINT kezelőinek elnyomása |

## Leállítási infrastruktúra

| Modul | Feladat |
|---|---|
| `server/http/http-server-registry.js` | HTTP/HTTPS szerverpéldányok követése és lezárása |
| `server/socket/socket-gateway.js` | Socket.IO explicit, időkorlátos lezárása |
| `server/core/shutdown-coordinator.js` | Fordított sorrendű cleanup |

Leállítási sorrend:

1. helyi schedule runner;
2. legacy eseményhíd;
3. Socket.IO gateway;
4. HTTP/HTTPS szerverek;
5. EventStore;
6. auditnapló;
7. logger.

## Megfigyelhetőség

| Modul | Feladat |
|---|---|
| `server/observability/prometheus-exporter.js` | MetricsRegistry snapshot → Prometheus text |
| `server/api/v2/prometheus-routes.js` | Védett szöveges export |

## Következő nagy területek

1. Legacy helyi schedule memória és cron teljes kikapcsolása.
2. Legacy setup/user-admin route-ok teljes átállítása.
3. Legacy monolit Arduino konzolcache és fájlkezelés kiemelése.
4. Izolált LXC release gate és `5.0.0-alpha.2`.


## Cron cutover, konzol és fájlréteg

| Modul | Feladat |
|---|---|
| `server/legacy/legacy-cron-guard.js` | A két kiváltott legacy cron célzott letiltása |
| `server/arduino/arduino-status-monitor.js` | Közös 30 másodperces Arduino státuszfigyelés |
| `server/arduino/arduino-console-service.js` | Lapozott, újraindulásbiztos konzolcache |
| `server/files/schedule-file-service.js` | Validált és atomikus schedule fájlkezelés |
| `server/legacy/legacy-schedule-file-routes.js` | Régi `/api/files` és upload kompatibilitás |
| `server/legacy/legacy-cutover-service.js` | Cutover készenléti összesítés |
| `server/web/static-web-installer.js` | `public/` statikus fájlok külön installerben |


## Alpha.2 candidate modulok

| Modul | Feladat |
|---|---|
| `server/security/api-token-repository.js` | Hash-elt, atomikus managed-token adattár |
| `server/security/api-token-service.js` | Létrehozás, rotáció, tiltás és törlés |
| `server/api/v2/token-routes.js` | Token-admin API v2 |
| `server/firmware/firmware-backup-store.js` | Ellenőrzött bináris backup és last-known-good index |
| `scripts/generate-openapi-typescript.js` | Determinisztikus TypeScript kliensgenerátor |
| `deploy/build-versioned-release.sh` | Git commitból verziózott tar.gz release bundle |
