# Alpha.3 `X-Device-Key` hardverteszt-runbook

## Hatókör

Ez a runbook valódi Arduino UNO R4 WiFi firmware `4.1.21` eszközön igazolja
a fejlécalapú hitelesítést. A teszt nem jogosít produkciós V5 telepítésre.

## Előfeltételek

- a firmware `FIRMWARE_VERSION` értéke `4.1.21`;
- az első tesztben `API_ALLOW_QUERY_KEY_FALLBACK=1`;
- ismert az Arduino IP-je és privát API-útvonala;
- a kulcs csak környezeti változóban vagy biztonságos secret store-ban van;
- rendelkezésre áll a korábbi firmware bináris és SHA-256 lenyomata;
- a LED-rendszer tesztideje egyeztetett.

Példa shell-változók:

```bash
export ARDUINO_IP="TESZT_ARDUINO_IP"
export ARDUINO_API_PATH="/SAJAT_PRIVAT_UTVONAL"
read -s -p "Arduino API-kulcs: " ARDUINO_API_KEY
echo
export ARDUINO_API_KEY
```

A kulcsot ne írd be közvetlenül parancssori argumentumba.

## Előfeltétel: teszt API-útvonal mérete

A firmware EEPROM-mezője a lezáró null karakterrel együtt 49 bájtos, ezért az
`API_PRIVATE_PATH` teljes hossza a kezdő `/` jellel együtt **18-48 karakter**.
A hosszabb fordítási értéket a firmware érvénytelennek tekinti.

## 1. Firmware-verzió és helyes fejléc

```bash
printf 'X-Device-Key: %s\n' "${ARDUINO_API_KEY}" |
curl \
  --silent \
  --show-error \
  --fail \
  --header @- \
  "http://${ARDUINO_IP}${ARDUINO_API_PATH}/api/status"
```

Elvárt:

- HTTP 200;
- `firmwareVersion` = `4.1.21`;
- `queryKeyFallbackEnabled` = `true`;
- `deviceKeyHeaderAccepted` növekszik.

## 2. Kulcs nélküli kérés

```bash
curl \
  --silent \
  --show-error \
  --max-time 3 \
  "http://${ARDUINO_IP}${ARDUINO_API_PATH}/api/status" || true
```

Elvárt: HTTP `401 Unauthorized`, rövid JSON hibatörzs és azonnal lezárt kapcsolat.

## 3. Hibás fejléc

```bash
printf 'X-Device-Key: %s\n' 'INVALID_DEVICE_KEY_FOR_NEGATIVE_TEST' |
curl \
  --silent \
  --show-error \
  --max-time 3 \
  --header @- \
  "http://${ARDUINO_IP}${ARDUINO_API_PATH}/api/status" || true
```

Elvárt: HTTP `401 Unauthorized`, rövid JSON hibatörzs, azonnal lezárt kapcsolat, a LED-állapot nem változik.

## 4. Duplikált fejléc

```bash
{
  printf 'X-Device-Key: %s\n' "${ARDUINO_API_KEY}"
  printf 'X-Device-Key: %s\n' "${ARDUINO_API_KEY}"
} |
curl \
  --silent \
  --show-error \
  --max-time 3 \
  --header @- \
  "http://${ARDUINO_IP}${ARDUINO_API_PATH}/api/status" || true
```

Elvárt: HTTP `400 Bad Request`, rövid JSON hibatörzs és azonnal lezárt kapcsolat.

## 5. Hibás fejléc nem kerülhető meg fallbackkel

Ezt a tesztet csak kontrollált környezetben végezd. A query-értéket ne írd be
a shell historyba. A kérésben hibás fejléc és helyes régi query-kulcs együtt
szerepeljen. Elvárt: elutasítás, mert a jelen lévő fejléc elsőbbséget élvez.

## 6. Régi kliens kompatibilitása

A fallback `1` állapotában indítsd el a korábbi, query-kulcsot használó
klienst. Elvárt:

- a kliens továbbra is működik;
- `queryKeyFallbackAccepted` növekszik;
- a státusz `lastPath` mezőjében nem jelenik meg `k=` vagy kulcsérték.

## 7. Új Node gateway és Tauri kliens

Az új kliensekkel hajts végre:

- státuszlekérést;
- egy nem veszélyes LED tesztpresetet;
- schedule státuszlekérést;
- konzollekérést.

Elvárt:

- minden kérés sikeres;
- `deviceKeyHeaderAccepted` növekszik;
- `queryKeyFallbackAccepted` nem változik;
- gateway, audit és hálózati napló URL-jeiben nincs `k=` és nincs kulcsérték.

## 8. Fallback kikapcsolási próba

Külön firmware buildben:

```cpp
#define API_ALLOW_QUERY_KEY_FALLBACK 0
```

Elvárt:

- fejlécalapú Node és Tauri kliens működik;
- régi query-kliens nem működik;
- `queryKeyFallbackEnabled` = `false`;
- `queryKeyFallbackAccepted` nem növekszik.

Ez a build csak minden kliens migrációja után jelölhető release candidate-nek.

## 9. Rollback-próba

- állítsd vissza a fallbackes `4.1.21` firmware-t;
- ellenőrizd a bináris SHA-256 lenyomatát;
- ellenőrizd, hogy az új és a régi kliens is újra eléri az eszközt;
- rögzítsd a teszt idejét, firmware hashét és eredményét.

## Hardveres megállapítás – 2026-07-30

A tartalék UNO R4 WiFi-n a helyes `X-Device-Key` kérés HTTP 200 választ adott,
de a hiányzó kulcsos kérésnél a korábbi firmware csak lezárta a TCP-kapcsolatot
HTTP-válasz nélkül. A hotfix kötelező szerződése:

- hiányzó vagy hibás kulcs: `401 Unauthorized`;
- hibás vagy duplikált `X-Device-Key`: `400 Bad Request`;
- befejezetlen fejléc olvasási időtúllépése: `408 Request Timeout`;
- minden hibaválasz `Content-Length` és `Connection: close` fejléccel záródik.

## Tesztjegyzőkönyv

| Ellenőrzés | Eredmény | Bizonyíték |
|---|---|---|
| 4.1.21 firmware |  |  |
| helyes `X-Device-Key` |  |  |
| hiányzó kulcs tiltva |  |  |
| hibás kulcs tiltva |  |  |
| duplikált fejléc tiltva |  |  |
| hibás fejléc + query tiltva |  |  |
| régi query fallback működik |  |  |
| Node kliens fejlécet használ |  |  |
| Tauri kliens fejlécet használ |  |  |
| naplók titokmentesek |  |  |
| fallback-off próba |  |  |
| rollback próba |  |  |
## Auth-response WiFiS3 darabolt V7 mérés és V8 telemetria-cache javítás

A hardverteszt két elutasított jelöltet azonosított:

- V5: a `WiFiClient::flush()` ugyan továbbította a rövid `401` választ, de
  minden kéréshez körülbelül 4,4-4,7 másodperces késleltetést adott;
- V6: a teljes, körülbelül 1,6 KB-os státuszválasz egyetlen `CLIENTSEND`
  műveletben a Wi-Fi bridge beragadását okozta, ezért teljes áramtalanítás és
  V5 rollback kellett.

A V7 hardvermérés eredménye:

- hiányzó kulcs: HTTP 401, helyes JSON, 2,75 másodperc;
- helyes kulcsos `/api/status`: HTTP 200, 1457 bájt, 9,63 másodperc;
- helyes kulcsos `/api/console/stats`: HTTP 200, 266 bájt, 6,86 másodperc;
- a bridge a kérések után elérhető maradt, de a válaszidő nem elfogadható.

A 266 bájtos törzs a HTTP-fejléccel együtt egyetlen 512 bájtos írásba fér,
ezért a V7 lassulását nem a válasz darabszáma magyarázza. A forrásellenőrzés
szerint a polling hot path minden kérésnél több szinkron WiFiS3 modemparancsot
indított: `remoteIP()`, `status()`, `localIP()` és `RSSI()` lekérdezéseket.

A V8 jelölt szabályai:

- megtartja a legfeljebb 512 bájtos válaszdarabolást;
- nincs `client.flush()` és nincs túlméretes egyírásos válasz;
- a Wi-Fi kapcsolat, IP-cím és RSSI gyorsítótárból kerül a JSON-válaszokba;
- linkállapot legfeljebb 15 másodpercenként, RSSI legfeljebb 30 másodpercenként frissül;
- polling és auth-hiba útvonalon nincs szinkron `remoteIP()` lekérdezés;
- a HTTP feldolgozás megelőzi a periodikus NTP- és telemetria-parancsokat;
- sikertelen NTP-szinkron esetén nincs minden ciklusban új modemlekérdezés.

Kötelező újrateszt:

- helyes fejléc: HTTP 200;
- hiányzó kulcs: HTTP 401, timeout nélkül;
- hibás kulcs: HTTP 401;
- helyes query fallback: HTTP 200;
- hibás fejléc és helyes query: HTTP 401;
- duplikált fejléc: HTTP 400;
- `/api/console/stats` és `/api/status` válaszidő összehasonlítása a V7 méréssel;
- legalább 20 egymást követő helyes és negatív kérés után az Arduino és a
  Wi-Fi bridge továbbra is elérhető marad.


## Elfogadott kliensoldali időkorlátok

A valós UNO R4 WiFi hardvermérés periodikus WiFiS3 háttérműveletek mellett
2,6–9,9 másodperces elsőbájt-időt mutatott. Ez működési szempontból elfogadott,
ha a kliens nem szakítja meg idő előtt a helyes HTTP-választ.

Kötelező Alpha.3 klienspolitika:

- Tauri TCP-kapcsolódási időkorlát: 5 másodperc;
- Arduino API teljes olvasási/írási időkorlát: minimum 30 másodperc;
- moduláris Node normál, health és státuszmonitor timeout: minimum 30000 ms;
- legacy Node és macOS curl teljes kérési timeout: minimum 30 másodperc;
- OTA és firmware-feltöltési timeoutok ettől külön kezelendők.

A 30 másodperces érték nem teljesítménycél. Biztonsági tartalék a periodikus
WiFiS3 műveletekhez és a későbbi firmware-bővítésekhez.
