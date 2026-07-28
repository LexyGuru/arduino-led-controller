# V5 szervermodulok térképe

## Indítási folyamat

```text
server2_final.js
  ├─ core konfiguráció és runtime context
  ├─ ArduinoClient
  ├─ LedService
  ├─ ScheduleService
  ├─ ExpressBootstrapRegistry
  │    ├─ health route installer
  │    └─ API v2 route installer
  └─ server2_legacy.js
```

A `server2_legacy.js` továbbra is kiszolgálja a régi webes és `/api/...`
végpontokat. Az új API v2 réteg párhuzamosan működik.

## Core modulok

| Modul | Feladat |
|---|---|
| `server/core/runtime-paths.js` | Fájlrendszer-útvonalak |
| `server/core/config.js` | Környezeti és runtime konfiguráció |
| `server/core/logger.js` | Winston logger factory |
| `server/core/runtime-context.js` | Megosztott futásidejű szolgáltatások |

## Arduino, LED és schedule modulok

| Modul | Feladat |
|---|---|
| `server/arduino/arduino-client.js` | Sorba állított Arduino HTTP-kliens |
| `server/arduino/arduino-error.js` | Egységes Arduino klienshibák |
| `server/led/led-validation.js` | LED-parancsvalidáció |
| `server/led/led-service.js` | LED állapot és vezérlés |
| `server/schedule/schedule-validation.js` | Nap-, idő-, fájl- és LED-validáció |
| `server/schedule/schedule-codec.js` | 27 bájtos EEPROM schedule-kódolás |
| `server/schedule/schedule-service.js` | Arduino schedule lekérdezések és műveletek |
| `server/schedule/schedule-error.js` | Schedule validációs és szolgáltatáshibák |

## Express és API v2

| Modul | Feladat |
|---|---|
| `server/express/express-bootstrap-registry.js` | Express route installerek |
| `server/health-bootstrap.js` | Health route-ok |
| `server/api/v2/auth.js` | Bearer token és principal |
| `server/api/v2/authorize.js` | Jogosultsági middleware |
| `server/api/v2/routes.js` | Rendszer- és Arduino-route-ok |
| `server/api/v2/led-routes.js` | LED API v2 |
| `server/api/v2/schedule-routes.js` | Arduino schedule API v2 |
| `server/api/v2/error-handler.js` | Központi hibakezelés |
| `server/api/v2/http-response.js` | Egységes válaszformátum |

## Következő kiemelendő területek

1. Helyi schedule repository és legacy schedule memória egységesítése.
2. Legacy felhasználói hitelesítés külön szolgáltatásba emelése.
3. Firmware/OTA szolgáltatás és API v2 végpontok.
4. Socket.IO és konzolstream.
5. Legacy LED-route-ok átállítása a közös LED szolgáltatásra.
