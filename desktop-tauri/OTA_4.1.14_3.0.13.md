# OTA kapcsolatjavítás – firmware 4.1.14 / Tauri 3.0.13

## A hiba jelentése

A `Connecting to board ... failed!` az ArduinoOTA kapcsolatfelvétel első lépésénél történik. A firmware letöltése és SHA-256 ellenőrzése már sikerült; a jelszó és a bináris tartalom ellenőrzéséig a feltöltő még nem jutott el.

## Firmware 4.1.14

- Új védett API: `/api/ota/restart`
- Leállítja, majd újraindítja a 65280-as ArduinoOTA listenert.
- Státuszmezők: `otaRestartCount`, `otaLastRestartAge`.
- Megtartja a 4.1.13 kézi időzítés-felülbírálását.

Az első 4.1.14 feltöltést USB-n kell elvégezni, mert a 4.1.13-ban még nincs OTA-listener újraindító végpont.

## Tauri 3.0.13

- Kiírja az `arduinoOTA -version` eredményét.
- Részletes `-v` módban indítja a feltöltőt.
- Feltöltés előtt meghívja az `/api/ota/restart` végpontot.
- 2,5 másodperc stabilizálási időt tart.
- Közvetlen TCP-próbát végez az OTA-címen és porton.
- A próbakapcsolat után még egyszer megtisztítja a listenert.
- Kapcsolódási hibánál konkrét `nc -vz IP PORT` tesztet ír ki.

## Kézi ellenőrzés macOS-en

```bash
nc -vz 10.0.0.123 65280
```

Sikeres esetben a port elérhető. Sikertelen esetben a firmware OTA-listenere vagy a helyi hálózati útvonal nem működik.
