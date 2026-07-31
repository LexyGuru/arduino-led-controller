# OTA frissítés

## Előfeltételek

- helyi hálózati elérés;
- OTA-jelszó;
- ellenőrzött firmware BIN;
- `arduinoOTA` uploader.

## Folyamat

1. Kérd le az aktuális Boot ID-t és schedule státuszt.
2. Nyisd meg a 30 másodperces ablakot a védett `POST /api/ota/prepare` kéréssel.
3. Töltsd fel a BIN-t:

```bash
/usr/local/bin/arduinoOTA \
  -address ARDUINO_IP \
  -port 65280 \
  -username arduino \
  -password OTA_PASSWORD \
  -sketch firmware.bin \
  -upload /sketch \
  -t 120 \
  -b
```

4. Várj új Boot ID-re.
5. Ellenőrizd a firmware-verziót, capabilityket, schedule count/revision/checksum értékeket.

Az `arduino-cli upload` UNO R4 esetén USB-s `bossac` feltöltőt választhat; hálózati OTA-hoz a külön `arduinoOTA` uploader szükséges.
