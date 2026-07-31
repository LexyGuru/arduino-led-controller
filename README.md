# Arduino LED Controller

[![Firmware build](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml/badge.svg)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/firmware-build.yml)
[![V5 Beta release](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/beta-release.yml/badge.svg)](https://github.com/LexyGuru/arduino-led-controller/actions/workflows/beta-release.yml)

Többplatformos LED-vezérlő rendszer **Arduino UNO R4 WiFi** és három WS2812B LED-szalag számára.

A V5 rendszer elsődleges működési módja:

```text
macOS / Windows / Linux / Android / iOS Tauri kliens
                         │
                         │ védett közvetlen HTTP API
                         │ X-Device-Key
                         ▼
                  Arduino UNO R4 WiFi
                         │
                         ├─ LED-vezérlés
                         ├─ EEPROM-időzítések
                         ├─ Wi-Fi- és API-beállítások
                         ├─ állapot és konzol
                         └─ ArduinoOTA desktopról
```

A Node.js / Proxmox LXC komponens **nem követelmény**, nem a Tauri alapkapcsolata és nem az Arduino működésének feltétele. Külön, opcionális böngészős átjáróként maradhat a projektben.

## Aktuális kiadási állapot

- alkalmazás: `5.0.0-beta.1`;
- firmware: `4.1.21`;
- Beta.1 commit: `ef42c233ebd99a42ec68a5b422b9787b0c4cda44`;
- sikeres Beta workflow: `30564106374`;
- kiadás: `v5.0.0-beta.1`;
- `main` ág, produkciós LXC és produkciós Arduino a Beta kiadáskor nem módosult.

A Beta.1 ismert alkalmazásoldali hiányosságait a
`docs/v5/BETA1_KNOWN_ISSUES.md` dokumentum tartalmazza.

## Alapelvek

1. Az Arduino az aktuális eszközállapot hiteles forrása.
2. Az Arduino tárolja és hajtja végre a heti időzítéseket.
3. A Tauri alkalmazás közvetlenül kommunikál az Arduinóval.
4. A közvetlen kapcsolat hitelesítése az `X-Device-Key` fejléc.
5. A Node/LXC szerver nem szükséges az alapműködéshez.
6. Bearer token és session-cookie csak opcionális szervermódhoz tartozhat.
7. Mobilplatformon nincs firmware-OTA; OTA kizárólag desktopon támogatott.
8. A titkok nem kerülhetnek GitHubra, URL-paraméterbe, naplóba vagy release-csomagba.

## Fő komponensek

| Komponens | Elsődleges feladat | Kötelező? |
|---|---|---:|
| Arduino firmware | LED, schedule, EEPROM, HTTP API, OTA fogadás | igen |
| Tauri desktop/mobil | natív vezérlés, profilok, naplók, diagnosztika | igen |
| GitHub Actions | build, teszt, kiadás és supply-chain evidence | igen |
| Node.js / LXC | opcionális böngészős vagy integrációs átjáró | nem |

## Arduino felelősségi köre

Az Arduino önállóan működik a Tauri alkalmazás bezárása után is.

- három LED-szalag vezérlése;
- aktuális LED-állapot;
- legfeljebb 60 időzítési esemény;
- heti időzítések tartós EEPROM-tárolása;
- NTP és közép-európai időkezelés;
- Wi-Fi-, OTA- és védett API-beállítások EEPROM-ból;
- `X-Device-Key` alapú HTTP API;
- jelszóval védett OTA listener;
- soros és HTTP konzolállapot;
- LED-mátrixos státuszjelzés.

## Tauri felelősségi köre

- helyi és távoli Arduino-kapcsolat;
- több Arduino eszközprofil;
- LED- és időzítéskezelő felület;
- schedule feltöltés és visszaolvasás;
- helyi alkalmazásnapló;
- diagnosztika és kapcsolatvizsgálat;
- desktop firmware-letöltés, SHA-256 ellenőrzés, OTA és rollback;
- titkok natív operációsrendszer-kulcstárban;
- importálható, helyi és titkos eszközprofil-fájl;
- mobilon az OTA-funkció elrejtése.

## Kapcsolati profil

Egy Arduino-profil külön kezeli a helyi és távoli címet:

```text
Név: Beta Arduino

Helyi:
  host: 10.0.0.117
  port: 80

Távoli:
  host: beta-lexyguruhome.ddns.net
  port: 25666

Védelem:
  privát API-útvonal
  X-Device-Key

OTA, csak desktop:
  host: 10.0.0.117
  port: 65280
  OTA-jelszó
```

A felületnek egyértelműen jeleznie kell, hogy a távoli DDNS-port az Arduino HTTP API-jára mutat-e. A TCP-port elérhetősége önmagában nem bizonyítja, hogy megfelelő API válaszol mögötte.

## Hitelesítés

### Közvetlen Arduino mód

A közvetlen kliens ezt küldi:

```http
X-Device-Key: <ARDUINO_ESZKOZKULCS>
```

A kliensnek ezen kívül ismernie kell a privát API-előtagot.

A firmware-forrás titkai:

```cpp
#define API_SHARED_SECRET "LEGALABB_24_KARAKTERES_EGYEDI_KULCS"
#define API_PRIVATE_PATH "/HOSSZU_VELETLEN_PRIVAT_UTVONAL"
#define OTA_PASSWORD "HOSSZU_VELETLEN_OTA_JELSZO"
```

A `secrets.h` nem kerül GitHubra. Az első USB-s feltöltés után a firmware a szükséges értékeket EEPROM-ban kezeli.

### Titkos profil importálása

A telepített Tauri alkalmazás nem olvashatja ki távolról az Arduino `secrets.h` fájlját. Ez szándékos biztonsági korlát.

A tervezett kényelmes folyamat:

1. ugyanazokból a helyi értékekből létrejön egy `controller-profile.secret.json`;
2. a felhasználó ezt egyszer importálja a Tauri alkalmazásba;
3. a Tauri a titkokat a macOS Keychain, Windows Credential Manager vagy Linux Secret Service tárba menti;
4. a titkos importfájl ezután törölhető;
5. a kulcs az Arduino API-ján keresztül nem olvasható vissza.

A fájl nem kerülhet repositoryba vagy release-be.

### Opcionális Node/LXC mód

A külön Node/LXC szerver saját Bearer tokent vagy session-hitelesítést használhat. Ez nem azonos az Arduino eszközkulcsával.

A szervermód:

- alapértelmezetten kikapcsolt;
- külön „Kísérleti / haladó” kapcsoló mögött jelenhet meg;
- nem akadályozhatja a közvetlen Arduino mód használatát;
- nem kérhet ismeretlen felhasználónevet vagy tokent az alapfelületen.

## Időzítések

A schedule egyetlen hiteles futtatója az Arduino.

```text
Tauri szerkeszt
      │
      ▼
Arduino ellenőriz
      │
      ▼
EEPROM-ba ment
      │
      ▼
Arduino önállóan végrehajt
```

A Tauri tárolhat szerkesztési piszkozatot, exportot vagy helyi cache-t, de nem válhat az időzítés kötelező háttérszolgáltatásává.

## Naplózás

A Tauri helyi naplója tartalmazhatja:

- küldött művelet;
- cél-eszközprofil;
- időbélyeg;
- válaszkód;
- feldolgozási hiba;
- OTA-folyamat;
- kapcsolatváltás.

Ajánlott formátum: SQLite vagy JSONL.

A titkok, teljes auth-fejlécek és OTA-jelszó nem kerülhetnek naplóba.

## OTA

| Platform | OTA |
|---|---|
| macOS | támogatott, külön Terminal/`arduinoOTA` vagy natív motor |
| Windows | támogatandó desktop OTA-motorral |
| Linux | támogatandó desktop OTA-motorral |
| Android | nem támogatott |
| iPhone / iPad | nem támogatott |

Az OTA-portot nem szabad közvetlenül az internetre továbbítani.

## Gyors kezdés

### 1. Titkos firmware-konfiguráció

```bash
cp firmware/ArduinoLedController/secrets.example.h \
   firmware/ArduinoLedController/secrets.h
```

A `secrets.h` fájlban adj meg egyedi Wi-Fi-, OTA- és API-adatokat.

### 2. Első firmware-feltöltés

Az első feltöltés USB-n történjen. A firmware ezután EEPROM-ból képes betölteni a működéshez szükséges beállításokat.

### 3. Tauri fejlesztői indítás

```bash
cd desktop-tauri
npm install
npm run tauri:dev
```

### 4. Arduino-profil

A Tauri alkalmazásban add meg:

- profil neve;
- helyi IP/host és port;
- távoli DDNS/IP és port;
- privát API-útvonal;
- Arduino eszközkulcs;
- desktopon OTA host, port és jelszó.

## Hálózati portok

| Szolgáltatás | Alapport | Megjegyzés |
|---|---:|---|
| Arduino védett HTTP API | `80/TCP` | helyi vagy megfelelően védett távoli kapcsolat |
| ArduinoOTA | `65280/TCP` | csak helyi hálózat/VPN |
| Opcionális Node webszerver | konfigurálható | nem része a közvetlen módnak |

## Dokumentáció

- `docs/v5/V5_DIRECT_ARDUINO_ARCHITECTURE.md`
- `docs/v5/V5_DIRECT_ARDUINO_SECURITY.md`
- `docs/v5/V5_DESKTOP_MOBILE_ROADMAP.md`
- `docs/v5/V5_REARCHITECTURE_CHECKLIST.md`
- `docs/v5/V5_IMPLEMENTATION_STATUS.md`
- `docs/v5/BETA1_KNOWN_ISSUES.md`

A korábbi Alpha.2, Alpha.3 és API v2 dokumentumok történeti bizonyítékok. Nem írják felül a jelenlegi közvetlen Arduino-első architektúradöntést.

## Biztonsági megjegyzések

- A `secrets.h` és `*.secret.json` fájlokat ne töltsd fel GitHubra.
- Az API-kulcs ne kerüljön URL-be.
- A Tauri a kulcsot natív credential store-ban tárolja.
- A meglévő eszközkulcs nem kérdezhető le az Arduino API-ján.
- Kulcscsere csak a jelenlegi kulccsal hitelesített helyi művelettel történhet.
- Távoli közvetlen HTTP helyett VPN vagy TLS-es átjáró ajánlott.
