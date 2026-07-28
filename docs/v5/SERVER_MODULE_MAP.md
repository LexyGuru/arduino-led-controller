# V5 szervermodulok térképe

## Indítási folyamat

```text
server2_final.js
  ├─ runtime-paths
  ├─ config
  ├─ logger
  ├─ runtime-context
  ├─ ArduinoClient
  ├─ ExpressBootstrapRegistry
  │    ├─ health route installer
  │    └─ API v2 route installer
  └─ server2_legacy.js
```

A `server2_legacy.js` jelenleg még a régi alkalmazás fő része. Az új modulok az
Express alkalmazás létrehozásakor automatikusan bekerülnek, ezért a legacy
végpontok tovább működnek.

## Core modulok

| Modul | Feladat |
|---|---|
| `server/core/runtime-paths.js` | Fájlrendszer-útvonalak |
| `server/core/config.js` | Környezeti és runtime konfiguráció |
| `server/core/logger.js` | Winston logger létrehozása |
| `server/core/runtime-context.js` | Megosztott futásidejű objektumok |

## Arduino és LED modulok

| Modul | Feladat |
|---|---|
| `server/arduino/arduino-client.js` | Sorba állított közös Arduino HTTP-kliens |
| `server/arduino/arduino-error.js` | Egységes Arduino klienshibák |
| `server/led/led-validation.js` | LED-parancsok és színek validációja |
| `server/led/led-service.js` | LED állapot és vezérlési szolgáltatás |
| `server/led/led-error.js` | LED validációs és szolgáltatáshibák |

## Express platform

| Modul | Feladat |
|---|---|
| `server/express/express-bootstrap-registry.js` | Route installerek regisztrálása és az Express factory egyszeri bővítése |
| `server/health-bootstrap.js` | Health route-ok |
| `server/api/v2/api-v2-bootstrap.js` | API v2 route-ok összekapcsolása |

## API v2 modulok

| Modul | Feladat |
|---|---|
| `auth.js` | Bearer token feldolgozás, szerepkör és principal |
| `cors-security.js` | CORS és security response headerek |
| `readiness.js` | API- és könyvtárkészenléti ellenőrzés |
| `arduino-error-mapper.js` | Arduino klienshiba → HTTP-hiba |
| `routes.js` | Rendszer- és Arduino-végpontkezelők |
| `authorize.js` | Jogosultsági middleware |
| `led-routes.js` | API v2 LED-végpontok |
| `error-handler.js` | 404 és központi hibakezelés |
| `http-error.js` | HTTP hibaosztály |
| `http-response.js` | Egységes sikeres és hibaválasz |

## Következő kiemelendő területek

1. Legacy felhasználói hitelesítés.
2. LED szolgáltatás és API v2 LED route-ok.
3. Schedule szolgáltatás és API v2 naptárroute-ok.
4. Firmware/OTA szolgáltatás.
5. Socket.IO és konzolstream.
