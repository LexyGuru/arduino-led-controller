# Arduino LED Controller Lite firmware

Ez az SD-kartya nelkuli, egyszerusitett UNO R4 WiFi firmware. A heti
idözitesek a Proxmoxon futó webszerveren maradnak; az Arduino csak a LED-eket,
a PIR szenzorokat, a helyi API-t, a naplot es az OTA fogadast kezeli.

Alapbol a PIR szenzorok es a fizikai gombok ki vannak kapcsolva. Ez fontos,
mert szenzor nelkul a bemenetek zajt olvasnak, ami teves „mozgas erzekelve"
uzeneteket okozhat. Ha kesobb bekotod ezeket, a sajat `secrets.h` fajlodban
allitsd az `ENABLE_PIR_SENSORS` vagy `ENABLE_PHYSICAL_BUTTONS` erteket `1`-re.

## Elso telepites USB-n

1. Telepitsd az **Adafruit NeoPixel** es **ArduinoOTA** konyvtarakat az Arduino
   IDE Library Managerbol.
2. Masold a `secrets.example.h` fajlt `secrets.h` nevvel ugyanebbe a mappaba.
3. Ird be a WiFi adataidat es egy hosszu, egyedi OTA jelszot.
4. Valaszd ki: **Arduino UNO R4 WiFi**, majd toltsd fel USB-n.

Az elso USB-s feltoltes kotelezo: a korabbi firmware nem tud OTA-frissitest
fogadni. A sikeres inditas utan a `/api/status` valaszban az
`"otaEnabled":true` mező jelzi, hogy a keszulek keszen all a halozati
frissitesre.

## OTA frissites Proxmoxrol

A webszerver a GitHub Actions altal sikeresen leforditott `.bin` firmware-t
tolti le, ellenorzi az ellenorzoosszeget, majd a helyi halozaton telepiti az
UNO R4-re. A Proxmox `/etc/arduino-led-controller.env` fajljaba ugyanazt az
`OTA_PASSWORD` erteket kell beirni, mint ami az Arduino sajat `secrets.h`
fajljaban van. A firmware-kiadas nyilvanos, ezert GitHub hozzáférési kulcs
nem szükséges.

## API kompatibilitas

A Lite firmware megtartja a webalkalmazas altal hasznalt vegpontokat:

- `/api/status`, `/api/led/status`
- `/api/led/1?...`, `/api/led/2?...`, `/api/led/3?...`
- `/api/all-on`, `/api/all-off`
- `/api/console/logs`, `/api/console/stats`, `/api/console/clear`

Nincs SD-kartya, nincs `/api/schedule/*`, nincs Arduino-oldali konfiguracios
fajl es nincs Arduino-oldali utemezes.
