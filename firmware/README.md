# Arduino UNO R4 WiFi firmware

## Verzió

- firmware: `4.3.0-beta.3`;
- Direct API: `1.0.0`;
- feature: `f14-complete-direct-api-storage`.

## Képességek

- három WS2812B LED-szalag;
- maximum 60 heti schedule rekord;
- konfiguráció és schedule A/B EEPROM slotok;
- tranzakciós schedule-import;
- `X-Device-Key` fejlécalapú hitelesítés;
- query fallback véglegesen tiltva;
- diagnosztikai és capability endpointok;
- desktop OTA a `65280/TCP` porton;
- védett távoli reboot `HTTP 202 Accepted` válasszal.

## Konfiguráció

```bash
cp firmware/ArduinoLedController/secrets.example.h \
   firmware/ArduinoLedController/secrets.h
```

A `secrets.h` fájlban adj meg egyedi Wi-Fi-, OTA- és API-adatokat. A fájl nem kerülhet Gitbe.

## Fordítás

```bash
arduino-cli core install arduino:renesas_uno
arduino-cli lib install "Adafruit NeoPixel"
arduino-cli lib install "ArduinoOTA"

arduino-cli compile \
  --fqbn arduino:renesas_uno:unor4wifi \
  firmware/ArduinoLedController
```

## OTA

Az OTA előtt hívd meg a védett `/api/ota/prepare` endpointot, majd használd az `arduinoOTA` eszközt `-t 120` flash timeouttal. Részletek: [OTA_UPDATE.md](../docs/firmware/OTA_UPDATE.md).

## Dokumentáció

- [Firmware release](../docs/firmware/FIRMWARE_4_3_0_BETA_1.md)
- [Direct API](../docs/firmware/DIRECT_API_V1.md)
- [EEPROM](../docs/firmware/EEPROM_STORAGE.md)
- [Tesztelés](../docs/firmware/TESTING.md)
