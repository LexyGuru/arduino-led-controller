# Arduino LED Controller – GitHub OTA firmware

Ez a repository-csomag az **Arduino UNO R4 WiFi** LED-vezérlő firmware automatikus fordítására és OTA-kiadására készült.

## Mit csinál automatikusan?

Amikor a `main` ágra firmware-módosítás kerül, a GitHub Actions:

1. telepíti az Arduino CLI-t;
2. telepíti az `arduino:renesas_uno` platformot;
3. telepíti az `Adafruit NeoPixel` könyvtárat;
4. lefordítja a firmware-t UNO R4 WiFi célhardverre;
5. elkészíti a SHA-256 ellenőrzőfájlt;
6. törli a korábbi `firmware-latest` kiadást és tag-et;
7. ugyanazon a címen újra létrehozza a legfrissebb kiadást.

A desktop alkalmazás által használt állandó kiadás:

```text
https://github.com/LexyGuru/arduino-led-controller/releases/tag/firmware-latest
```

A Release két fájlt tartalmaz:

```text
ArduinoLedController.ino.bin
ArduinoLedController.ino.bin.sha256
```

## Könyvtárszerkezet

```text
arduino-led-controller/
├── .github/
│   └── workflows/
│       └── firmware-build.yml
├── firmware/
│   └── ArduinoLedController/
│       ├── ArduinoLedController.ino
│       └── secrets.example.h
├── .gitignore
└── README.md
```

## Első USB-s telepítés

A valódi titkokat tartalmazó fájlt helyben kell létrehozni:

```bash
cd firmware/ArduinoLedController
cp secrets.example.h secrets.h
```

Ezután töltsd ki a saját adataiddal:

```cpp
#define WIFI_SSID "SAJAT_WIFI"
#define WIFI_PASSWORD "SAJAT_WIFI_JELSZO"
#define OTA_PASSWORD "HOSSZU_RANDOM_OTA_JELSZO"
#define API_SHARED_SECRET "HOSSZU_RANDOM_API_KULCS"
#define API_PRIVATE_PATH "/HOSSZU_RANDOM_PRIVAT_UTVONAL"
```

A `secrets.h` szerepel a `.gitignore` fájlban, ezért normál esetben nem kerül fel GitHubra.

Az első, személyes adatokat tartalmazó firmware-t **USB-n** kell feltölteni. Ez elmenti a WiFi-, OTA- és API-adatokat az EEPROM-ba. A GitHub Actions által készített publikus OTA-bináris mintaadatokat tartalmaz, ezért nem írja felül az EEPROM-ban tárolt valódi beállításokat.

## Feltöltés új GitHub repositoryba

```bash
git init
git branch -M main
git add .
git commit -m "Add Arduino firmware OTA build"
git remote add origin https://github.com/LexyGuru/arduino-led-controller.git
git push -u origin main
```

Ha a repository már létezik, másold bele vagy egyesítsd a csomag tartalmát, majd:

```bash
git add .
git commit -m "Add firmware 4.1.3 and automatic OTA release"
git push origin main
```

## GitHub Actions engedély

A repositoryban ellenőrizd:

```text
Settings → Actions → General → Workflow permissions
```

A következő legyen kiválasztva:

```text
Read and write permissions
```

A workflow ugyan `contents: write` jogosultságot kér, de privát vagy korlátozott repository-beállítás esetén a fenti kapcsoló is szükséges lehet.

## Kézi build indítása

A GitHubon:

```text
Actions → Build and publish latest firmware → Run workflow
```

## OTA-frissítés

A desktop alkalmazás a `firmware-latest` Release fájljait tölti le, ellenőrzi a SHA-256 összeget, majd az Arduino OTA szolgáltatására küldi a binárist.

A firmware OTA-portja:

```text
3232
```

## Fontos biztonsági szabály

Soha ne töltsd fel a valódi `secrets.h` fájlt. Feltöltés előtt ellenőrizheted:

```bash
git status --ignored
```

A fájlnak az ignorált elemek között kell megjelennie.

## 4.1.3 build-javítás

Az `encodeScheduleHex()` függvényben a hexadecimális karaktertábla neve `HEX_DIGITS`.
Ez elkerüli az Arduino `Print.h` által definiált `HEX` makróval való névütközést.

## 4.1.3 változások

- Az Arduino 30 másodpercenként ellenőrzi az időzítés alapján elvárt LED-állapotot.
- Újraindítás vagy eltérő kézi állapot után automatikusan helyreállítja a hét legutóbbi érvényes rekordját.
- Csak valódi eltérés esetén módosítja a LED-eket és ír naplóbejegyzést.
- Javítva az Arduino `HEX` makróval ütköző hexadecimális karaktertábla neve.


## 4.1.3

- Valódi IP-címet ír ki a Serial Monitorban.
- HTTP API port: 80.
- OTA port: 65280.
- mDNS port: 5353.
- Az `/api/status` tartalmazza a portokat és az OTA állapotát.
