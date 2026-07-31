# Firmware-first végrehajtási terv

**Döntés dátuma:** 2026-07-31
**Kiinduló commit:** `a70a84e335fe9c3199082269a2ce35502f15a6cc`
**Jelenlegi firmware:** `4.1.21`
**Cél firmware:** `4.2.0-beta.1`

## Stop szabály

A következő Tauri-fejlesztések szünetelnek:

- natív credential vault;
- több Arduino-profil;
- schedule UI további bővítése;
- OTA UI további bővítése;
- mobil integráció;
- opcionális szervermód.

Kivétel csak olyan minimális buildjavítás lehet, amely a repository
regresszióját tartja zölden.

## F14.0 – audit és szerződés

Állapot: **elkészült ebben a csomagban**

- jelenlegi firmware endpointleltár;
- hitelesítési audit;
- EEPROM layout audit;
- API v1 OpenAPI terv;
- Serial command szerződés;
- hardveres acceptance matrix;
- dokumentációs regresszió.

Firmware-kód nem módosul.

## F14.1 – diagnosztika és kapcsolat

Állapot: **forrás implementálva; Arduino CLI és hardveres validáció szükséges**

Megvalósított nagy firmware-csomag:

- verzió `4.2.0-beta.1`;
- helyes privát API URL a bootkonzolon;
- device ID és boot ID;
- kulcs fingerprint;
- Serial command parser;
- `profile show`;
- `profile export secrets`;
- request ID;
- egységes JSON error helper;
- hibás path/method/parser esetén nem lehet néma close;
- kliens-IP és response code audit;
- polling summary;
- időkorlátos HTTP trace;
- ping/capabilities/diagnostics/config status első változata;
- legacy endpointok még működhetnek.

## F14.2 – Direct API v1

- `/api/v1`;
- OpenAPI implementáció;
- szabályos HTTP-metódusok;
- JSON body parser;
- Content-Length;
- body limit;
- `413`;
- LED v1;
- schedule v1 staging;
- log v1;
- OTA v1;
- `?k=` fallback kikapcsolása;
- legacy módosító endpointok kivezetése.

## F14.3 – EEPROM és schedule

- A/B config slot;
- A/B schedule slot;
- generation/revision;
- readback;
- checksum;
- power-loss recovery;
- 4.1.21 migráció;
- 0/1/60 rekord;
- DST és manual override regresszió.

## F14.4 – hardveres stabilitási gate

- helyi `10.0.0.117:80`;
- távoli `beta-lexyguruhome.ddns.net:25666`;
- több kliens;
- reboot;
- router/Wi-Fi megszakítás;
- 1000 kérés;
- 24/72 órás soak;
- OTA;
- schedule;
- titokszivárgás-vizsgálat.

## Tauri V15 belépési feltétel

A Tauri csak akkor folytatódik, ha:

```text
F14.1 = PASSED
F14.2 = PASSED
F14.3 = PASSED
F14.4 HARDWARE GATE = PASSED
```

A Tauri V15:

- az Arduino OpenAPI v1 szerződést használja;
- a Serial secret profil-exportot importálja;
- natív credential store-ba ment;
- pontos Arduino error code-ot jelenít meg;
- nem használ Node/LXC API v2-t fallbackként az alapműködéshez.
