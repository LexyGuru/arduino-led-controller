# V5 desktop és mobil roadmap

## Közös funkciók

Desktop és mobil:

- több Arduino-profil;
- helyi/távoli endpoint;
- LED-vezérlés;
- schedule szerkesztés;
- Arduino schedule import/export;
- állapot és diagnosztika;
- helyi napló;
- natív biztonságos titoktárolás;
- automatikus reconnect;
- világos offline állapot.

## Desktop

### macOS

- Apple Silicon és Intel;
- Keychain;
- Terminal/`arduinoOTA`;
- firmware SHA-256;
- rollback;
- diagnosztikai export.

### Windows

- Credential Manager;
- desktop OTA-motor;
- `.exe` telepítő;
- rollback;
- Windows tűzfal útmutató.

### Linux

- Secret Service;
- desktop OTA-motor;
- AppImage és `.deb`;
- libsecret/desktop környezet teszt;
- rollback.

## Mobil

### Android

- helyi hálózat;
- cleartext HTTP csak explicit hálózati policy szerint;
- mobil secure storage;
- DDNS profil;
- nincs OTA;
- debug APK Beta alatt;
- aláírt release később.

### iPhone/iPad

- Local Network permission;
- mobil secure storage;
- DDNS profil;
- nincs OTA;
- unsigned IPA teszteléshez;
- saját aláírás/sideload.

## OTA funkcióláthatóság

A UI platformképességet használ:

```text
desktopSupportsOta = macOS || Windows || Linux
mobileSupportsOta = false
```

Mobilon:

- OTA menü nem jelenik meg;
- firmware-verzió és új kiadás információ megjelenhet;
- a felület desktop használatát javasolja.

## Kapcsolati UX

Első indítás:

```text
1. Arduino-profil létrehozása
2. Helyi IP/host és port
3. Távoli DDNS opcionálisan
4. Privát API-útvonal
5. Eszközkulcs
6. Kapcsolat tesztelése
```

A Node/LXC szervermód nem jelenik meg ebben a varázslóban.

## Profilimport

Desktop:

- fájlválasztó;
- `controller-profile.secret.json`;
- validáció;
- credential store;
- importfájl törlési figyelmeztetés.

Mobil:

- dokumentumválasztó vagy későbbi QR/párosítás;
- platform secure storage;
- OTA-adatok figyelmen kívül hagyása.

## Kapcsolati hibaüzenetek

Külön hibák:

- DNS nem oldható fel;
- TCP-port nem elérhető;
- HTTP nem Arduino API;
- privát útvonal hibás;
- eszközkulcs hibás;
- firmware túl régi;
- timeout;
- CORS/webview policy;
- offline.

A „Connection succeeded” csak teljes védett státuszválasz után jelenhet meg, nem pusztán nyitott TCP-port alapján.
