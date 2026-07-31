# F14 Complete Firmware Adaptation

**Alapcommit:** `4a6051d8cb6b5ab3a98ef674a155ccc064d653b5`
**Firmware:** `4.3.0-beta.1`
**Direct API:** `1.0.0`

Ez a csomag összevonja az F14.2, F14.3 és F14.4 firmware-munkát. A Tauri
forrását nem módosítja.

## Kész firmware-funkciók

- kizárólag `X-Device-Key` fejléc; a `?k=` fallback letiltva;
- JSON body és `Content-Length` feldolgozás;
- 2048 bájtos kemény payloadlimit és `413`;
- LED GET/PUT és közös POST API;
- schedule lapozott export;
- schedule begin/chunk/commit/cancel tranzakció;
- a chunkok közvetlenül az inaktív EEPROM-slotba kerülnek;
- aktív schedule csak teljes readback és checksum után változik;
- A/B config és schedule slotok generation számmal;
- első boot migráció a 4.1/4.2 legacy blokkokból;
- legacy olvasási aliasok megtartva;
- legacy query-alapú módosítások `410 Gone` választ adnak;
- WiFiS3-biztos 128 bájtos választransport;
- Serial profil-export és teljes diagnosztika.

## Schedule tranzakció

1. `POST /api/v1/schedules/transactions`
2. minden rekord: `PUT /api/v1/schedules/transactions/{id}/chunks`
3. `POST /api/v1/schedules/transactions/{id}/commit`
4. hiba/megszakítás: `DELETE /api/v1/schedules/transactions/{id}`

A begin body:

```json
{"expectedRevision":0,"total":2}
```

A chunk body:

```json
{"index":0,"payload":"<54 hex karakter>"}
```

A teljes 60 rekordos schedule nem kerül egyszerre RAM-ba. A firmware az
inaktív EEPROM-slotot használja staging területként.

## A/B EEPROM layout

| Tartomány | Offset | Méret |
|---|---:|---:|
| config A | 0 | 384 |
| config B | 384 | 384 |
| schedule A | 768 | 1792 |
| schedule B | 2560 | 1792 |
| tartalék | 4352 | 3840 |

A slot állapotai: `WRITING`, `VALID`. A firmware mindig a legmagasabb valid
generation értéket tölti be.

## Még szükséges hardveres lezárás

A forrásadaptáció teljes, de a firmware csak az alábbi hardvertesztek sikeres
lefutása után tekinthető kiadásra késznek:

- fordítás és USB feltöltés;
- auth mátrix, beleértve a `?k=` elutasítását;
- LED v1 műveletek;
- 0/1/60 schedule tranzakció;
- reboot utáni A/B visszatöltés;
- félbeszakított tranzakció;
- OTA;
- 1000 statuszkérés;
- 24 és 72 órás soak.
