# V5 Alpha.3 – kiadási jegyzetek

## Állapot

Az Alpha.3 hardveres, kliensoldali és integrációs kapuja 2026-07-30-án
sikeresen teljesült. A validált feature commit
`e2dc8ac41edf39717b4e2708e6b03aba0b6431bb` a
`295713798b1487ec2c788b170be2fce32fccea2a` merge commitban bekerült a
`next/v5-rearchitecture` ágba. Az alkalmazásverzió `5.0.0-alpha.3`, a
firmware-verzió `4.1.21`.

Ez továbbra is nem produkciós Alpha kiadás: nem jogosít `main` merge-re,
produkciós telepítésre vagy a public `firmware-latest` release frissítésére.

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

## Kapuállapot

Teljesítve:

- Arduino CLI fordítás és GitHub Actions artifact;
- valódi UNO R4 WiFi auth-mátrix;
- moduláris Node staging teszt;
- Tauri/Rust közvetlen staging teszt;
- firmware-first rollout és visszaállítás;
- query fallback kikapcsolási próba;
- fallback-on rollback és utóellenőrzés;
- titokmentes Node, Tauri és fallback-off evidence.

Lezárt integrációs kapuk:

- feature merge a `next/v5-rearchitecture` ágba;
- `5.0.0-alpha.3` verziófinalizálás;
- teljes Node, TypeScript és Tauri/Rust regresszió;
- artifact-only Tauri desktop CI macOS, Windows és Linux staging csomagokhoz;
- firmware GitHub Actions build a merge commiton;
- `main` merge és produkciós telepítés továbbra is tiltott.

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
NTP- és telemetriafrissítés előtt fut. A V8 hardveres auth-mátrixa, Node/Tauri staging próbája, fallback-off tesztje és
rollbackje sikeresen teljesült. A jelölt bekerült a feature ágba; ez továbbra sem
jogosít `main` merge-re vagy produkciós telepítésre.


## Arduino API 30 másodperces timeout V9

A valós hardvermérés szerint a helyes Arduino-válasz első bájtja periodikus
WiFiS3 háttérműveletek mellett 2,6–9,9 másodperc után érkezhet meg. A kliensoldali
rövid health és státuszmonitor időkorlátok ezért hibás offline állapotot okozhattak.

A V9 egységes minimum 30000 ms teljes Arduino API-időkorlátot vezet be a
moduláris Node kliens, a health ellenőrzés, a státuszmonitor és a legacy kliens
számára. A Tauri közvetlen kliens 5 másodperces kapcsolódási kaput és 30
másodperces olvasási/írási időkorlátot használ. A macOS curl transport 5
másodperces kapcsolódási és legalább 30 másodperces teljes timeouttal fut.

## Alpha.3 hardveres és staging gate – PASSED

Validált feature commit:
`221d7dd56ccf4eed2b6048eb91aee0ea526b2c73`.

A fallback-on auth-mátrix eredménye: `200, 401, 401, 200, 401, 400, 200`.
A moduláris Node és a Tauri/Rust közvetlen kliens egyaránt `X-Device-Key`
fejlécet használt és sikeresen lekérte az `/api/status`, valamint az
`/api/console/stats` végpontot. A fallback-off buildben a fejléc továbbra is
HTTP 200, a csak query-alapú hitelesítés és a hiányzó kulcs HTTP 401 választ
kapott. Az automatikus fallback-on rollback és a rollback utáni fejléc/query
ellenőrzés sikeres volt.

Elfogadott klienspolitika: 5 másodperces TCP-kapcsolódási kapu és minimum
30 másodperces teljes Arduino API-válaszablak. A mért WiFiS3 válaszidő
információs adat, nem önálló release-elutasítási feltétel.

Az Alpha.3 integrációs merge sikeres:

- `next/v5-rearchitecture` merge commit:
  `295713798b1487ec2c788b170be2fce32fccea2a`;
- merge első szülője: `bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b`;
- merge második szülője: `e2dc8ac41edf39717b4e2708e6b03aba0b6431bb`;
- firmware workflow: `30536184636`, eredmény: `success`;
- alkalmazásverzió: `5.0.0-alpha.3`;
- firmware-verzió: `4.1.21`.

A következő fejlesztési szakasz a teljes Alpha.3 alkalmazási staging és a
Beta.1 előtti stabilizáció. A `main`, a produkciós Arduino és a public firmware
release változatlan marad.
