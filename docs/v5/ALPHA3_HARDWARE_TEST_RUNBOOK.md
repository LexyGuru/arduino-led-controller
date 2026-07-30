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

Elvárt: nincs sikeres API-válasz.

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

Elvárt: nincs sikeres API-válasz, a LED-állapot nem változik.

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

Elvárt: nincs sikeres API-válasz.

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
