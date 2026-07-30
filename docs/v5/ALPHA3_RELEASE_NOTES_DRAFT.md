# V5 Alpha.3 – kiadási jegyzetek tervezete

## Állapot

Fejlesztési munkacsomag. Nem produkciós kiadás és nem jogosít `main` merge-re.

## Biztonsági változás

Az Arduino API-kulcs a Node-, legacy- és Tauri-kliensekben többé nem kerül
`?k=` URL-paraméterbe. Az új belső eszközhitelesítés:

```http
X-Device-Key: <ARDUINO_API_KEY>
```

## Firmware

- firmware-verzió: `4.1.21`;
- header-first eszközhitelesítés;
- kis- és nagybetűtől független fejlécnév;
- duplikált fejléc tiltása;
- hibás fejléc mellett nincs query fallback;
- átmeneti, kikapcsolható `?k=` kompatibilitás;
- fejléc- és fallback-számlálók a státuszban;
- a query-kulcs nem kerül route-ba vagy naplózott útvonalba.
- feature ág buildje artifactot készít, de nem írhatja felül a `firmware-latest` nyilvános release-t.
- hiányzó vagy hibás eszközkulcsra lezárt `401 Unauthorized` JSON-válasz;
- hibás vagy duplikált kulcsfejlécre lezárt `400 Bad Request` JSON-válasz;
- befejezetlen HTTP-fejléc olvasására `408 Request Timeout`;
- az API privát útvonala legfeljebb 48 karakter lehet.

## Gateway és desktop

- moduláris Node kliens `X-Device-Key` fejlécet küld;
- hívó nem írhatja felül kisbetűs vagy duplikált fejléccel;
- legacy Node kliens fejlécet küld;
- macOS `curl` fallback stdinről kapja a titkos fejlécet;
- Tauri közvetlen kliens fejlécet küld;
- Arduino API-kulcs nincs a kliensoldali URL-ekben.

## Validáció

- új Alpha.3 szerződés- és negatív teszt;
- új package manifest és SHA-256 ellenőrzés;
- repository-validátorba bekötött Alpha.3 tesztek;
- dokumentált firmware-first rollout és rollback;
- külön valódi UNO R4 WiFi hardverteszt-runbook.

## Nyitott kapuk

- Arduino CLI fordítás GitHub Actionsben;
- valódi eszközteszt;
- staging gateway teszt;
- firmware-first rollout bizonyítása;
- query fallback kikapcsolási próba;
- új Alpha.3 gate, staging, rollback és evidence;
- `5.0.0-alpha.3` finalization;
- `main` továbbra is tiltott.

## Teszt- és dokumentációs konzisztencia

- Az Alpha.2 finalizációs regressziós teszt már a bizonyított `PR #1` / `bd5cb67` `next` merge állapotot várja.
- A `main` merge és a produkciós telepítés továbbra is külön, nyitott kapu.


## Desktop TypeScript build gate

Az Alpha.3 csomag a teljes desktop TypeScript buildet is blokkoló kapuként kezeli. A V5 preflight panel az ismeretlen API-mezőket explicit szöveggé alakítja, a Vite környezeti változók saját típusdeklarációt kapnak, a Tauri `invoke` pedig típusos adapteren keresztül illeszkedik a desktop API credential bridge szerződéséhez.
## Hardveres auth-response darabolt V7 hotfix

A valódi UNO R4 WiFi teszt igazolta, hogy a rövid 400/401/408 válaszok elveszhetnek, ha a firmware túl gyorsan zárja a socketet. A V5 `flush()` próba 4,4-4,7 másodperces késleltetést okozott, a V6 egyetlen nagy írása pedig beragasztotta a Wi-Fi bridge-et; mindkettő elutasítva.

A V7 jelölt legfeljebb 512 bájtos `WiFiClient::write()` darabokat használ. A rövid hibaválaszok fejléce és törzse egyetlen darabba kerül, a nagy státuszválasz több darabban megy ki. Nincs blokkoló `flush()`, a socket lezárása előtt 150 ms korlátozott várakozás van. A megoldás teljes auth-mátrixot, válaszidőmérést és ismételt kéréses bridge-stabilitási próbát igényel.


## Hardveres WiFiS3 telemetria-cache V8 hotfix

A V7 helyes 400/401/200 válaszokat adott és nem ragasztotta be a bridge-et, de
hardveren a hiányzó kulcsos válasz 2,75 másodperc, a 266 bájtos konzolstatisztika
6,86 másodperc, az 1457 bájtos státusz pedig 9,63 másodperc volt. Mivel a kis
statisztikaválasz egyetlen 512 bájtos írásba fért, a késés fő oka nem a darabolás,
hanem a polling útvonalon végzett ismételt szinkron WiFiS3 modemlekérdezés volt.

A V8 megtartja az 512 bájtos biztonságos válaszdarabolást, de gyorsítótárazza a
kapcsolatállapotot, IP-címet és RSSI-t. A státusz- és konzolpolling nem kérdezi le
minden alkalommal a távoli kliens IP-jét, a HTTP feldolgozás pedig a periodikus
NTP- és telemetriafrissítés előtt fut. A V8 továbbra is hardverteszt-jelölt; nem
jogosít commitra, Alpha.3 finalizációra, `main` merge-re vagy produkciós telepítésre.
