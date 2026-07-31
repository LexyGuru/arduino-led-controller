# Arduino USB Serial parancsszerződés

**Tervezett firmware:** `4.2.0-beta.1`
**Baud:** `115200`
**Állapot:** F14.1 forrásban implementálva; hardveres validáció következik

A Serial parancskezelő célja, hogy a firmware Tauri nélkül is teljesen
diagnosztizálható és beállítható legyen.

## 1. Alapszabályok

- egy parancs egy sor;
- LF és CRLF támogatott;
- maximum parancshossz: 160 bájt;
- ismeretlen parancs: egyértelmű hiba;
- a normál log és a parancsválasz külön prefixet használ;
- hálózati API-ból nem hívható;
- titok csak explicit USB-s secret exportnál jelenhet meg;
- automatikus bootlog soha nem ír teljes titkot.

Prefixek:

```text
[info]
[success]
[warn]
[error]
[http]
[cmd]
[profile-secret-begin]
[profile-secret-end]
```

## 2. Parancsok

| Parancs | Funkció |
|---|---|
| `help` | parancslista |
| `status` | teljes, titokmentes eszközállapot |
| `network` | Wi-Fi, IP, RSSI, HTTP/OTA port |
| `api status` | API version, configured flag, fingerprint |
| `api url` | teljes helyi API status URL privát útvonallal |
| `api test` | belső config- és router-önellenőrzés |
| `http stats` | kérés-, hiba- és latency számlálók |
| `http trace on` | minden kérés átmeneti soros naplója |
| `http trace off` | trace kikapcsolása |
| `profile show` | titokmentes Tauri-profil |
| `profile export secrets` | explicit teljes secret profil USB-n |
| `eeprom status` | slotok, generation, checksum |
| `schedule status` | count, revision, checksum |
| `schedule list` | schedule emberi olvasású listája |
| `logs` | RAM-log |
| `logs clear` | RAM-log törlés |
| `ota status` | OTA listener állapot |
| `reboot` | szabályos újraindítás |

## 3. Bootkapcsolati blokk

A firmware sikeres Wi-Fi kapcsolat után ezt a struktúrát írja:

```text
==========================================
ARDUINO LED CONTROLLER – KAPCSOLAT
==========================================
Eszkozazonosito:      ALC-7C9E31
Firmware:             4.2.0-beta.1
API verzio:           1
Helyi IP:             10.0.0.117
HTTP port:            80
OTA port:             65280
Privat API:           BEALLITVA
Eszkozkulcs:          BEALLITVA
Kulcs ujjlenyomat:    84A2-19F0
Schedule:             14 / 60
Schedule revision:    12
Schedule checksum:    OK
Teljes status URL:
http://10.0.0.117:80/<VALODI_PRIVAT_UTVONAL>/api/v1/status
Hitelesitesi fejlec:
X-Device-Key
==========================================
```

A privát útvonal megjelenhet USB-s bootkonzolon, mert a felhasználónak ezt
kell a kliensbe beírnia. A teljes eszközkulcs és OTA-jelszó automatikusan
nem jelenhet meg.

## 4. Titokmentes profil

`profile show`:

```json
{
  "schemaVersion": 1,
  "deviceId": "ALC-7C9E31",
  "name": "Beta Arduino",
  "localHost": "10.0.0.117",
  "localPort": 80,
  "apiVersion": 1,
  "apiPrivatePathConfigured": true,
  "deviceKeyConfigured": true,
  "deviceKeyFingerprint": "84A2-19F0",
  "otaHost": "10.0.0.117",
  "otaPort": 65280,
  "otaPasswordConfigured": true
}
```

## 5. Explicit secret profil-export

Parancs:

```text
profile export secrets
```

Az Arduino először figyelmeztetést ír:

```text
[warn] A kovetkezo blokk API- es OTA-titkot tartalmaz.
[warn] Ne masold nyilvanos chatbe, logba vagy GitHubra.
```

Ezután:

```text
[profile-secret-begin]
{
  "schemaVersion": 1,
  "deviceId": "ALC-7C9E31",
  "name": "Beta Arduino",
  "localHost": "10.0.0.117",
  "localPort": 80,
  "remoteHost": "",
  "remotePort": 0,
  "apiVersion": 1,
  "apiPrivatePath": "/valodi_privát_utvonal",
  "deviceKey": "valodi_hosszu_eszkozkulcs",
  "otaHost": "10.0.0.117",
  "otaPort": 65280,
  "otaPassword": "valodi_ota_jelszo"
}
[profile-secret-end]
```

Wi-Fi SSID és Wi-Fi-jelszó nem része a Tauri profilnak.

A Tauri később csak a két marker közötti JSON-t importálja, majd natív
credential store-ba menti.

## 6. HTTP auditlog

Alapértelmezett mód:

- auth/path/parser hibák azonnal;
- módosító kérések azonnal;
- gyakori polling 30 másodperces összesítésben.

Példák:

```text
[http] #184 10.0.0.42 GET /api/v1/status AUTH=OK 200 168ms
[http] #185 10.0.0.42 GET /api/v1/status AUTH=MISSING 401 9ms
[http] #186 10.0.0.42 GET /wrong-path AUTH=PATH_REJECTED 404 4ms
[http] #187 10.0.0.56 PUT /api/v1/leds/1 AUTH=OK 200 175ms
```

Polling összesítés:

```text
[http] 30s: requests=15 success=15 authError=0 pathError=0 avg=171ms
```

`http trace on` minden kérést naplóz, de legfeljebb 10 perc után
automatikusan kikapcsol.

## 7. Titokredakció

A soros logban tilos:

- `X-Device-Key` teljes értéke;
- `Authorization`;
- OTA-jelszó;
- Wi-Fi-jelszó;
- régi `?k=` érték;
- teljes raw HTTP header dump.

A secret profil-export az egyetlen explicit kivétel.
