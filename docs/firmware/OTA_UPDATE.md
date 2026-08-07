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

## OTA Exclusive Mode (5.0.0-beta.6)

A `POST /api/v1/ota/prepare` után a firmware legfeljebb 30 másodpercre OTA Exclusive Mode-ba lép. Ebben az ablakban csak a Wi-Fi kapcsolat, az `ArduinoOTA.poll()` és a LED Matrix OTA-visszajelzése marad aktív. Az NTP UDP socket, a NeoPixel frissítés, a HTTP/API feldolgozás, a scheduler, az EEPROM-háttérműveletek és a runtime logolás szünetelnek.

A prepare timeout feldolgozása az Exclusive Mode korai loop-kapu előtt történik. Ha a feltöltő nem csatlakozik az ablakban, a firmware automatikusan kilép Exclusive Mode-ból, újraindítja az NTP UDP szolgáltatást és visszaállítja a normál vizuális/runtime állapotot. OTA-hiba esetén ugyanez a helyreállítás történik.

Az OTA folyamat **nem törli, nem exportálja és nem írja újra** a schedule rekordokat. A schedule A/B EEPROM storage az OTA-tól független persistent állapot; a desktop reboot után revision/checksum readbackkel ellenőrzi a megmaradását.
