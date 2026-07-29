# V5 szervermodulok térképe

## Indítási folyamat

```text
server2_final.js
  ├─ core config / runtime paths / logger / runtime context
  ├─ ApiTokenStore
  ├─ UserRepository + SessionService
  ├─ EventBus
  ├─ ArduinoClient
  ├─ LedService
  ├─ ScheduleService
  ├─ LocalScheduleRepository + Runner + Service
  ├─ FirmwareReleaseClient + OtaRunner + FirmwareService
  ├─ SocketGateway
  ├─ ExpressBootstrapRegistry
  ├─ SocketBootstrapRegistry
  └─ server2_legacy.js
```

## Biztonsági modulok

| Modul | Feladat |
|---|---|
| `server/security/api-token-store.js` | Több Bearer token és szerepkör |
| `server/security/user-repository.js` | Legacy `users.json` és scrypt ellenőrzés |
| `server/security/session-service.js` | `led_session` cookie aláírás és ellenőrzés |
| `server/api/v2/auth.js` | Bearer vagy session principal feloldása |
| `server/api/v2/session-routes.js` | Login, logout és session status |

## Esemény- és Socket.IO modulok

| Modul | Feladat |
|---|---|
| `server/events/topics.js` | Közös eseménytémák |
| `server/events/event-bus.js` | Memóriabeli eseménybusz és korlátozott történet |
| `server/socket/socket-bootstrap-registry.js` | Socket.IO factory egyszeri bővítése |
| `server/socket/socket-gateway.js` | V5 realtime eseményközvetítés |
| `server/api/v2/event-routes.js` | Eseményállapot és eseménytörténet HTTP-n |

## Eseményforrások

- LED módosítás, összes LED és reset
- Arduino schedule reload, generate, clear, test és sync
- helyi schedule create, remove, import és runner végrehajtás
- firmware OTA állapotváltozás
- login, logout és Socket.IO kapcsolatok

## LXC rollback

| Fájl | Feladat |
|---|---|
| `deploy/update-rollback-lib.sh` | Last-known-good commit és Git-visszaállítás |
| `deploy/update.sh` | Sikertelen frissítés automatikus rollbackje |
| `scripts/test-update-rollback.sh` | Izolált Git rollback smoke teszt |

## Még hátralévő nagy területek

1. Legacy LED, schedule, auth és firmware route-ok átállítása.
2. Legacy Socket.IO események bekötése a közös eseménybuszba.
3. Statikus webes felület külön modulba emelése.
4. OpenAPI gépi séma és közös TypeScript kliens.
5. `server2_legacy.js` fokozatos megszüntetése.
