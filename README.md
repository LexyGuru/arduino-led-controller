# Arduino LED Controller

[![Firmware build](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml/badge.svg)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml)
[![Tauri builds](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/tauri-desktop.yml/badge.svg)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/tauri-desktop.yml)

Többplatformos LED-vezérlő rendszer **Arduino UNO R4 WiFi** és WS2812B LED-szalagok számára. A projekt része az Arduino firmware, a Tauri 2 alapú asztali és mobil kliens, a GitHub Actions build- és kiadási rendszer, valamint egy opcionális Node.js / Proxmox LXC webszerver.

A Tauri alkalmazás és az Arduino önállóan is használható. A Proxmox/LXC komponens nem követelmény, csak opcionális webes vezérlési és szerveroldali kiegészítés.

## Fő komponensek

| Komponens | Feladat | Technológia |
| --- | --- | --- |
| Arduino firmware | LED-vezérlés, EEPROM-időzítés, védett API, OTA | Arduino UNO R4 WiFi, WiFiS3, Adafruit NeoPixel, ArduinoOTA |
| Tauri alkalmazás | Natív vezérlő, időzítések, diagnosztika és firmware-frissítés | Tauri 2, Rust, React 19, TypeScript, Vite |
| Node.js webszerver | Opcionális böngészős felület és Proxmox/LXC telepítés | Node.js, Express, Socket.IO |
| GitHub Actions | Firmware és kliensalkalmazások automatikus fordítása | Arduino CLI, Tauri CLI, GitHub Releases |

## Fő funkciók

- Három külön WS2812B LED-szalag vezérlése, alapértelmezetten 300 LED/szalag.
- Be- és kikapcsolás, fényerő, RGB-szín, effekt és effektsebesség sávonként.
- Effektek: statikus fény, villogás, lélegzés, szivárvány és futófény.
- Heti időzítések közvetlenül az Arduino EEPROM memóriájában.
- Legfeljebb 60 időzítési esemény.
- NTP-alapú időszinkronizálás és közép-európai téli/nyári idő kezelése.
- Manuális felülbírálás: a kézi módosítás a következő, az adott sávot érintő időzített eseményig marad aktív.
- Védett HTTP API privát útvonallal és külön API-kulccsal.
- Jelszóval védett OTA firmware-frissítés.
- GitHub Release-ből letöltött firmware SHA-256 ellenőrzéssel.
- Valós idejű OTA-konzol, feltöltési állapot és legfeljebb 180 másodperces visszatérési ellenőrzés.
- Arduino LED-mátrixos állapotjelzés.
- Opcionális PIR-érzékelők és fizikai gombok.
- Arduino konzolnapló és hálózati diagnosztika a Tauri alkalmazásban.

## Támogatott platformok

| Platform | Kiadási fájl | Állapot |
| --- | --- | --- |
| Windows | NSIS `.exe` | támogatott |
| macOS Apple Silicon | `.dmg` | támogatott, jelenleg nincs notarizálva |
| Linux | `.AppImage`, `.deb` | támogatott |
| Android | `.apk`, `.aab` | mobil build; kiadáshoz Android aláírókulcs ajánlott |
| iPhone / iPad | aláíratlan `.ipa` | tesztelési build; telepítés előtt külön aláírás szükséges |

Az iPhone és iPad ugyanabból az iOS/iPadOS Tauri projektből készül. Az unsigned IPA nem App Store-csomag; sideload vagy saját Apple-aláírás szükséges.

## Hardver

### Alapértelmezett kiosztás

| Funkció | Arduino láb |
| --- | --- |
| LED-szalag 1 | D6 |
| LED-szalag 2 | D7 |
| LED-szalag 3 | D8 |
| PIR 1–3 | D2, D3, D4 |
| Mód / fényerő gombok | A0, A1, A2 |

A firmware alapértelmezetten három, egyenként 300 pixeles WS2812B szalaggal számol. A PIR-érzékelők és fizikai gombok a `secrets.h` fájlban kapcsolhatók be.

> A LED-szalagokat megfelelő külső 5 V-os tápegységről tápláld, és az Arduino valamint a LED-táp földjét közösítsd. A LED-eket ne az UNO R4 5 V kimenetéről tápláld.

## Rendszerfelépítés

```text
Windows / macOS / Linux / Android / iOS
                    │
                    │ védett HTTP API
                    ▼
          Arduino UNO R4 WiFi :80
                    │
                    ├─ 3 × WS2812B LED-szalag
                    ├─ EEPROM heti időzítések
                    ├─ NTP és állapotnapló
                    └─ ArduinoOTA :65280

Opcionálisan:
Böngésző ── HTTPS ── Proxmox LXC / Node.js ── Arduino API
```

## Gyors kezdés

### 1. Repository klónozása

```bash
git clone https://github.com/LexyGuru/arduino-led-controller.git
cd arduino-led-controller
```

### 2. Arduino titkos beállításainak létrehozása

Másold át a mintafájlt:

```bash
cp firmware/ArduinoLedController/secrets.example.h \
   firmware/ArduinoLedController/secrets.h
```

Szerkeszd a `firmware/ArduinoLedController/secrets.h` fájlt:

```cpp
#pragma once

#define WIFI_SSID "SAJAT_WIFI_NEVE"
#define WIFI_PASSWORD "SAJAT_WIFI_JELSZAVA"
#define OTA_PASSWORD "HOSSZU_VELETLEN_OTA_JELSZO"
#define API_SHARED_SECRET "LEGALABB_24_KARAKTERES_API_KULCS"
#define API_PRIVATE_PATH "/HOSSZU_VELETLEN_PRIVAT_UTVONAL"

#define ENABLE_PIR_SENSORS 0
#define ENABLE_PHYSICAL_BUTTONS 0
```

A `secrets.h` fájlt ne töltsd fel GitHubra.

### 3. Első firmware-feltöltés USB-n

Az első feltöltést USB-kábellel kell elvégezni. Ez menti EEPROM-ba a WiFi-, OTA- és API-beállításokat. A későbbi nyilvános GitHub firmware-build a `secrets.example.h` mintaértékeivel fordul, ezért nem írja felül az EEPROM-ban tárolt valódi adatokat.

Arduino IDE-ben válaszd:

```text
Board: Arduino UNO R4 WiFi
```

Majd nyisd meg:

```text
firmware/ArduinoLedController/ArduinoLedController.ino
```

### 4. Tauri alkalmazás indítása

```bash
cd desktop-tauri
npm install
npm run tauri:dev
```

Az első indítás után a **Kapcsolat és védelem** részen add meg:

- az Arduino helyi IP-címét vagy távoli DDNS-címét;
- az HTTP-portot;
- a privát API-útvonalat;
- az API-kulcsot;
- az OTA-jelszót.

## Arduino firmware

### Könyvtárak

- `WiFiS3`
- `Adafruit NeoPixel`
- `ArduinoOTA`
- `EEPROM`
- `Arduino_LED_Matrix`

### Parancssoros fordítás Arduino CLI-vel

```bash
arduino-cli core update-index
arduino-cli lib update-index
arduino-cli core install arduino:renesas_uno
arduino-cli lib install "Adafruit NeoPixel"
arduino-cli lib install "ArduinoOTA"

cp firmware/ArduinoLedController/secrets.example.h \
   firmware/ArduinoLedController/secrets.h

arduino-cli compile \
  --fqbn arduino:renesas_uno:unor4wifi \
  --output-dir build/firmware \
  firmware/ArduinoLedController
```

A GitHub Actions ugyanezt automatikusan elvégzi a `.github/workflows/firmware-build.yml` workflow-ban, majd a binárist és annak SHA-256 fájlját a `firmware-latest` prerelease-hez tölti fel.

## Tauri alkalmazás

### Fejlesztői build

```bash
cd desktop-tauri
npm install
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri:dev
```

### Desktop build

```bash
npm run tauri:build
```

A Tauri alkalmazás verziója legyen azonos ezekben a fájlokban:

```text
desktop-tauri/package.json
desktop-tauri/src-tauri/Cargo.toml
desktop-tauri/src-tauri/tauri.conf.json
```

### Android

Első inicializálás:

```bash
npx tauri android init
```

Fejlesztői indítás:

```bash
npx tauri android dev
```

Build:

```bash
npx tauri android build --apk
npx tauri android build --aab
```

GitHub Actionsben Android-aláíró adatok nélkül debug APK és aláíratlan AAB készül. Aláírt kiadáshoz ezek a repository secretek használhatók:

```text
ANDROID_KEY_BASE64
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

### iPhone és iPad

Első inicializálás:

```bash
npx tauri ios init
```

Fejlesztői indítás:

```bash
npx tauri ios dev
```

Aláíratlan CI-build:

```bash
npx tauri ios build --ci --no-sign
```

Az unsigned IPA telepítéséhez saját Apple-aláírás vagy sideload eszköz szükséges.

## OTA firmware-frissítés

Az OTA-frissítés folyamata:

1. Az alkalmazás lekéri a GitHub `firmware-latest` kiadását.
2. Letölti az `ArduinoLedController.ino.bin` fájlt.
3. Letölti és ellenőrzi az SHA-256 ellenőrzőösszeget.
4. Lekéri az Arduino aktuális státuszát, helyi IP-címét és OTA-portját.
5. Előkészíti az OTA-listenert.
6. Feltölti a binárist a jelszóval védett `/sketch` végpontra.
7. Legfeljebb 180 másodpercig ellenőrzi, hogy az Arduino visszatért-e.
8. A firmware-verzió egyezése alapján dönti el, hogy a frissítés sikeres volt-e.

macOS-en az alkalmazás használhatja a Terminalban futó `arduinoOTA` feltöltőt. Androidon, iOS-en, Windowson és Linuxon a beépített Rust OTA-motor használható.

### Hálózati portok

| Szolgáltatás | Port | Megjegyzés |
| --- | --- | --- |
| Védett Arduino HTTP API | `80/TCP` | helyi hálózaton közvetlenül |
| Arduino OTA | `65280/TCP` | csak helyi hálózaton használd |
| Opcionális Node.js webszerver | `3000/TCP` | LXC-ben alapból csak localhost |
| Opcionális HTTPS felület | `443/TCP` | Caddy / Proxmox LXC |

**Az OTA `65280` portot ne továbbítsd az internet felé.** Távoli vezérléshez VPN vagy megfelelő HTTPS-közvetítő ajánlott.

## Védett Arduino API

A firmware nem fogadja el közvetlenül a nyilvános `/api/...` útvonalakat. A kliensnek a privát előtagot és az `X-Device-Key` fejlécben küldött API-kulcsot is használnia kell.

Főbb végpontok:

```text
/api/status
/api/led/status
/api/led/:id
/api/all-on
/api/all-off
/api/schedules/upload
/api/schedules/chunk
/api/schedules/export
/api/schedules/clear
/api/console/logs
/api/console/stats
/api/ota/status
/api/ota/prepare
```

Minden végpont a beállított privát útvonal mögött érhető el. Az Alpha.3
kliensek a kulcsot nem URL-paraméterben, hanem fejlécben küldik:

```http
X-Device-Key: <ARDUINO_API_KEY>
```

A firmware `4.1.21` átmenetileg képes fogadni a régi `?k=` formátumot is,
de az új Node- és Tauri-kliensek már kizárólag fejlécet használnak. A fallback
később a `API_ALLOW_QUERY_KEY_FALLBACK=0` firmware-beállítással tiltható.

## Opcionális Proxmox LXC webszerver

A Tauri alkalmazás nem igényli a Proxmoxot. Az LXC telepítés azoknak készült, akik folyamatosan futó, HTTPS-en elérhető böngészős felületet is szeretnének.

Javasolt alap:

- Debian 12 LXC
- 1 CPU
- legalább 512 MB RAM
- legalább 4 GB tárhely
- helyi hálózati hozzáférés az Arduino felé

Telepítés:

```bash
apt-get update && apt-get install -y git
git clone https://github.com/LexyGuru/arduino-led-controller.git \
  /opt/arduino-led-controller
cd /opt/arduino-led-controller
ARDUINO_IP=10.0.0.123 bash deploy/install-lxc.sh
```

Konfiguráció:

```text
/etc/arduino-led-controller.env
```

Fontos értékek:

```text
ARDUINO_IP=10.0.0.123
ARDUINO_PORT=80
ARDUINO_API_PATH=/SAJAT_PRIVAT_UTVONAL
ARDUINO_API_KEY=SAJAT_API_KULCS
OTA_PASSWORD=<SAJAT_OTA_JELSZO>
TZ=Europe/Vienna
```

Hasznos parancsok:

```bash
systemctl status arduino-led-controller
journalctl -u arduino-led-controller -f
systemctl restart arduino-led-controller
systemctl status arduino-led-controller-update.timer
```

## GitHub Actions és kiadások

### Firmware workflow

```text
.github/workflows/firmware-build.yml
```

Kimenet:

```text
ArduinoLedController.ino.bin
ArduinoLedController.ino.bin.sha256
```

Release tag:

```text
firmware-latest
```

### Tauri többplatformos workflow

```text
.github/workflows/tauri-desktop.yml
```

A közös workflow párhuzamosan készíti el:

```text
Windows .exe
macOS .dmg
Linux .AppImage és .deb
Android .apk és .aab
iPhone/iPad unsigned .ipa
```

A végén egyetlen Release-job tölti fel a csomagokat a következő tag alá:

```text
tauri-v<alkalmazásverzió>
```

## Projektstruktúra

```text
arduino-led-controller/
├── .github/workflows/
│   ├── firmware-build.yml
│   └── tauri-desktop.yml
├── firmware/ArduinoLedController/
│   ├── ArduinoLedController.ino
│   ├── secrets.example.h
│   └── secrets.h              # helyi, nem kerül GitHubra
├── desktop-tauri/             # elsődleges Tauri 2 kliens
│   ├── src/                   # React / TypeScript kezelőfelület
│   └── src-tauri/             # Rust backend és platformkonfiguráció
├── desktop/                   # korábbi Electron kliens
├── deploy/                    # Proxmox LXC és systemd telepítők
├── tools/                     # helyi segédeszközök
├── server2_final.js           # opcionális Node.js webszerver
├── package.json
└── README.md
```

## Hibaelhárítás

### `Connection refused` az OTA-porton

```bash
nc -vz -w 5 ARDUINO_IP 65280
```

Ha `Connection refused` jelenik meg, az OTA-listener nem hallgat. Indítsd újra az Arduinót, és ellenőrizd a soros konzolt. A stabil listeneres firmware nem állítja le az OTA-szervert az előkészítés során.

### `Flashing sketch ... Error`, de a verzió frissült

Az UNO R4 WiFi újraindulhat a végső visszaigazolás előtt. Az alkalmazás ezért nem kizárólag az `arduinoOTA` kilépési kódját használja, hanem legfeljebb 180 másodpercig ellenőrzi az Arduino visszatérését és az új firmware-verziót.

### macOS szerint az alkalmazás sérült vagy nem megbízható

A jelenlegi nyilvános DMG nincs Apple Developer tanúsítvánnyal notarizálva. Csak a projekt hivatalos GitHub Release-éből származó fájlnál használd:

```bash
xattr -dr com.apple.quarantine "/Applications/Arduino LED Controller.app"
```

### Android GitHub Actions: nincs Gradle-fájl

A Tauri Android projekt csak az `npx tauri android init --ci` után jön létre. A Java setup lépésben ezért nem szabad előre bekapcsolni a `cache: gradle` opciót, mert ekkor még nincs `build.gradle` vagy `gradle-wrapper.properties` fájl.

## Biztonsági megjegyzések

- A `secrets.h`, OTA-jelszó és API-kulcs ne kerüljön GitHubra.
- Az API privát útvonala nem helyettesíti a titkosított kapcsolatot.
- Az OTA-portot ne tedd közvetlenül elérhetővé az internetről.
- Távoli használathoz VPN vagy megfelelő HTTPS-közvetítő ajánlott.
- A nyilvános CI firmware csak mintaadatokkal fordul; a valódi titkok EEPROM-ban maradnak.

## Közreműködés

Hibajegyek és fejlesztési javaslatok a repository **Issues** részében küldhetők be. Pull request előtt futtasd legalább a frontend buildet és a Rust ellenőrzést:

```bash
cd desktop-tauri
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```
