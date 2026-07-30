# Arduino firmware

A firmware az **Arduino UNO R4 WiFi** vezérlőn fut, és három WS2812B LED-szalagot kezel.

## Jelenlegi tesztverzió

```text
4.1.21
```

A 4.1.21 megtartja a stabil OTA-listenert, és bevezeti az `X-Device-Key` fejlécalapú Arduino API-hitelesítést mérhető, kikapcsolható query fallbackkel.

## Fő funkciók

- három, alapértelmezetten 300 pixeles WS2812B sáv;
- sávonkénti fényerő, RGB-szín, effekt és effektsebesség;
- heti EEPROM-időzítés, legfeljebb 60 eseménnyel;
- manuális felülbírálás a következő érintett időzítési eseményig;
- NTP és közép-európai téli/nyári idő;
- privát útvonal és `X-Device-Key` fejléc mögötti HTTP API;
- átmeneti, számlált és kikapcsolható régi `?k=` kompatibilitás;
- folyamatosan nyitva tartott, jelszavas ArduinoOTA listener a `65280/TCP` porton;
- `/api/ota/prepare` tehermentesített OTA-időablak;
- Arduino LED-mátrixos állapotjelzés.

## Első feltöltés

Másold át a mintafájlt:

```bash
cp firmware/ArduinoLedController/secrets.example.h \
   firmware/ArduinoLedController/secrets.h
```

A saját `secrets.h` fájlban add meg:

```cpp
#pragma once

#define WIFI_SSID "SAJAT_WIFI_NEVE"
#define WIFI_PASSWORD "SAJAT_WIFI_JELSZAVA"
#define OTA_PASSWORD "HOSSZU_VELETLEN_OTA_JELSZO"
#define API_SHARED_SECRET "LEGALABB_24_KARAKTERES_API_KULCS"
#define API_PRIVATE_PATH "/HOSSZU_VELETLEN_PRIVAT_UTVONAL"
#define API_ALLOW_QUERY_KEY_FALLBACK 1

#define ENABLE_PIR_SENSORS 0
#define ENABLE_PHYSICAL_BUTTONS 0
```

Az első feltöltést USB-n végezd el. Ekkor a valódi WiFi-, OTA- és API-beállítások EEPROM-ba kerülnek. A GitHub Actions nyilvános buildje a mintaértékekkel fordul, ezért a későbbi OTA-frissítés nem írja felül a tárolt titkokat.


## Védett API-kérés

Az új kliensek a kulcsot fejlécben küldik. A következő példa nem teszi a
kulcsot a parancssori argumentumok közé:

```bash
export ARDUINO_IP="TESZT_ARDUINO_IP"
export ARDUINO_API_PATH="/SAJAT_PRIVAT_UTVONAL"
read -s -p "Arduino API-kulcs: " ARDUINO_API_KEY
echo
printf 'X-Device-Key: %s\n' "${ARDUINO_API_KEY}" |
curl --silent --show-error --fail --header @- \
  "http://${ARDUINO_IP}${ARDUINO_API_PATH}/api/status"
```

A fallback `1` értéke csak migrációs átmenet. A végleges kikapcsolás előtt
futtasd le a `docs/v5/ALPHA3_HARDWARE_TEST_RUNBOOK.md` teljes tesztmátrixát.

## Fordítás Arduino CLI-vel

```bash
arduino-cli core update-index
arduino-cli lib update-index
arduino-cli core install arduino:renesas_uno
arduino-cli lib install "Adafruit NeoPixel"
arduino-cli lib install "ArduinoOTA"

arduino-cli compile \
  --fqbn arduino:renesas_uno:unor4wifi \
  --output-dir build/firmware \
  firmware/ArduinoLedController
```

## OTA ellenőrzése

Az Arduino újraindítása után helyi hálózaton:

```bash
nc -vz -w 5 ARDUINO_IP 65280
```

Sikeres listener esetén a TCP-kapcsolat létrejön.

> Mobilalkalmazásból firmware-frissítés nem indítható. OTA kizárólag Windows, macOS vagy Linux kliensről, illetve az opcionális LXC webszerverről érhető el.
