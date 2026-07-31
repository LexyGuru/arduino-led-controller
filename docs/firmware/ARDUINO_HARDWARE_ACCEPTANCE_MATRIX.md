# Arduino firmware hardveres acceptance matrix

**Célfirmware:** `4.2.0-beta.1`
**F14.1 forrásállapot:** implementálva; a jelölőnégyzetek hardveres mérésig nyitva maradnak
**Teszt Arduino:** Beta UNO R4 WiFi
**Helyi cím:** `10.0.0.117:80`
**Távoli HTTP:** `beta-lexyguruhome.ddns.net:25666`
**OTA:** `10.0.0.117:65280`

Valódi API-útvonal, eszközkulcs, OTA-jelszó és Wi-Fi-adat nem kerülhet ebbe
a dokumentumba vagy GitHub evidence-be.

## 1. Fordítás és alapindulás

- [ ] Arduino CLI fordítás UNO R4 WiFi targetre
- [ ] firmware verzió `4.2.0-beta.1`
- [ ] query fallback fordításkor kikapcsolva
- [x] USB feltöltés – `4.2.0-beta.1`, 2026-07-31
- [ ] bootmátrix
- [x] Wi-Fi EEPROM-ból
- [x] API EEPROM-ból
- [ ] schedule EEPROM-ból
- [x] helyes teljes API URL a Serial Monitorban
- [ ] kulcs csak fingerprintként automatikusan
- [ ] `profile export secrets` explicit működik

## 2. Hitelesítési mátrix

| # | Útvonal | Fejléc | Elvárt |
|---:|---|---|---:|
| 1 | helyes | helyes | 200 – ping igazolt, nagy válaszok F14.1.3 újrateszt |
| 2 | helyes | hiányzik | 401 – igazolt |
| 3 | helyes | hibás | 401 |
| 4 | helyes | duplikált | 400 |
| 5 | hibás privát útvonal | helyes | 404 – igazolt |
| 6 | ismeretlen `/api/v1` endpoint | helyes | 404 |
| 7 | hibás metódus | helyes | 405 |
| 8 | query `?k=` helyes | nincs fejléc | 401 |
| 9 | túl hosszú header | — | 400 |
| 10 | header timeout | — | 408 |

Minden esetnél:

- [ ] JSON error schema;
- [ ] request ID;
- [ ] Serial auditlog;
- [ ] titok nem szerepel a logban.

## 3. API funkciók

### Diagnosztika

- [ ] ping
- [ ] capabilities
- [ ] status
- [ ] diagnostics
- [ ] config/status
- [ ] kulcs fingerprint egyezik USB és API között
- [ ] nincs secret az API-válaszban

### LED

- [ ] LED 1, 2, 3 külön
- [ ] enabled be/ki
- [ ] brightness 0
- [ ] brightness 255
- [ ] effect 0–4
- [ ] speed 1
- [ ] speed 100
- [ ] RGB 0,0,0
- [ ] RGB 255,255,255
- [ ] hibás LED ID
- [ ] hibás tartomány
- [ ] ismeretlen JSON mező
- [ ] manuális override
- [ ] override lejár a következő schedule eseménynél

### Schedule

- [ ] 0 rekord
- [ ] 1 rekord
- [ ] 60 rekord
- [ ] 61 rekord elutasítva
- [ ] hétfő 00:00
- [ ] vasárnap 23:59
- [ ] több LED ugyanabban a rekordban
- [ ] apply false
- [ ] revision conflict
- [ ] PUT readback
- [ ] checksum egyezés
- [ ] reboot utáni egyezés
- [ ] félbeszakított upload nem módosítja az aktív schedule-t
- [ ] félbeszakított EEPROM-írás után előző slot visszaáll
- [ ] DST március
- [ ] DST október

## 4. Kapcsolat

- [ ] helyi IP elérés
- [ ] DDNS elérés
- [ ] rossz DDNS-port
- [ ] router újraindítás
- [ ] Wi-Fi megszakítás 30 másodperc
- [ ] Wi-Fi megszakítás 5 perc
- [ ] Arduino reboot
- [ ] DHCP IP-változás
- [ ] 1000 egymás utáni statuszkérés
- [ ] egyidejű 2 kliens
- [ ] egyidejű 3 kliens
- [ ] kliens-IP megjelenik trace módban
- [ ] polling summary helyes
- [ ] nincs néma TCP-close ismert hibánál

## 5. Soak teszt

- [ ] 1 óra API polling
- [ ] 8 óra LED animáció + polling
- [ ] 24 óra schedule + polling
- [ ] 72 óra vegyes használat
- [ ] request count
- [ ] timeout count
- [ ] rejected count
- [ ] write failure count
- [ ] reboot count
- [ ] Wi-Fi reconnect count
- [ ] memória/heap trend
- [ ] log ID túlcsordulási viselkedés

Elfogadás:

- nincs fagyás;
- nincs spontán reboot;
- nincs tartós OTA-port bezáródás;
- nincs schedule-vesztés;
- nincs titokszivárgás.

## 6. OTA

- [ ] OTA listener boot után nyitott
- [ ] OTA status
- [ ] OTA prepare
- [ ] helyes jelszó
- [ ] hibás jelszó
- [ ] megszakított feltöltés
- [ ] sikeres feltöltés
- [ ] verzió ellenőrzése reboot után
- [ ] EEPROM titkok megmaradnak
- [ ] schedule megmarad
- [ ] API az újraindítás után visszatér
- [ ] OTA alatt API `503`
- [ ] OTA-port nincs internetre továbbítva

## 7. Evidence

Menthető:

- redaktált Serial log;
- HTTP státuszkód-mátrix;
- request ID-k;
- firmware SHA-256;
- schedule checksum és revision;
- uptime és statisztikák.

Nem menthető:

- privát API-útvonal teljes értéke;
- eszközkulcs;
- OTA-jelszó;
- Wi-Fi SSID/jelszó;
- secret profil-export.
