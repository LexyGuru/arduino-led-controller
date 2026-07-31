# Arduino LED Controller – V5 fejlesztési roadmap

**Frissítve:** 2026-07-30
**Integrációs ág:** `next/v5-rearchitecture`
**Aktuális alkalmazásverzió:** `5.0.0-beta.1`
**Firmware:** `4.1.21`
**Beta commit:** `ef42c233ebd99a42ec68a5b422b9787b0c4cda44`
**Sikeres Beta workflow:** `30564106374`

## 0. Architektúradöntés

A V5 fejlesztés elsődleges iránya **közvetlen Arduino-első**.

```text
Tauri desktop / mobil
          │
          │ X-Device-Key
          ▼
Arduino UNO R4 WiFi
          │
          ├─ LED
          ├─ EEPROM schedule
          ├─ Wi-Fi/API konfiguráció
          ├─ konzol és diagnosztika
          └─ desktop OTA
```

A Node.js/LXC rendszer opcionális marad. Nem lehet:

- kötelező Tauri-függőség;
- az időzítések elsődleges tárolója;
- az Arduino állapotának hiteles forrása;
- az OTA kötelező közvetítője;
- az alapértelmezett hitelesítési felület.

## 1. Miért történt iránykorrekció?

A `5.0.0-beta.1` alkalmazás kiadása után kiderült, hogy a felület összemossa:

- a közvetlen Arduino kapcsolatot;
- az opcionális Node/LXC API v2 kapcsolatot;
- az Arduino `X-Device-Key` kulcsát;
- a szerver Bearer tokenjét;
- a session felhasználónevet és jelszót.

A firmware közben már önállóan:

- EEPROM-ból tölti a Wi-Fi-, OTA- és API-konfigurációt;
- futtatja a heti időzítéseket;
- kiszolgálja a védett HTTP API-t;
- fogadja a desktop OTA-frissítést;
- működik Tauri és LXC nélkül is.

Ezért a kliensnek ezt a meglévő, működő modellt kell elsődlegesen támogatnia.

## 2. Nem változó alapelvek

1. A `main` ág csak külön elfogadási kapu után módosulhat.
2. A Beta fejlesztés a `next/v5-rearchitecture` ágon folytatódik.
3. Titok nem kerül GitHubra vagy release-assetbe.
4. A firmware továbbra is önálló schedule-futtató.
5. OTA csak desktopon támogatott.
6. A távoli OTA-port nem nyitható internetre.
7. Minden nagy csomag teljes fájlokat, manifestet és tesztet tartalmaz.
8. Minden csomag előtt és után pontos Git-állapotvédelem szükséges.

## 3. Történeti mérföldkövek

### Alpha.2

- történeti produkciós Arduino baseline: `10.0.0.123:80`;
- moduláris Node/LXC szerver;
- API v2, audit, metrics, auth;
- staging, release gate és rollback;
- produkcióvédelem.

### Alpha.3

- feature commit: `e2dc8ac41edf39717b4e2708e6b03aba0b6431bb`;
- integrációs merge: `295713798b1487ec2c788b170be2fce32fccea2a`;
- `X-Device-Key` fejléc;
- firmware `4.1.21`;
- hardveres auth-mátrix;
- `5.0.0-alpha.3` finalization;
- teljes Alpha.3 alkalmazási staging előkészítése;
- artifact-only Tauri desktop CI előkészítése.

Ezek történeti bizonyítékok. A Node/API v2 fejlesztés megmaradhat opcionális módként, de nem határozza meg az alapfelhasználói architektúrát.

### Beta.1

- első nyilvános Beta prerelease;
- többplatformos telepítők;
- firmware, LXC és supply-chain evidence;
- macOS Bash 3.2 hotfix;
- Linux Tauri Rust gate hotfix;
- sikeres workflow: `30564106374`.

## 4. Új munkacsomag-stratégia

A fejlesztés nagyobb, egymásra épülő ZIP-csomagokban halad.

### V14.0 – Dokumentáció és architektúraszerződés

- aktív README és roadmap frissítése;
- közvetlen Arduino architektúra;
- titok- és credential-kezelési szabályok;
- Beta.1 ismert hibák;
- desktop/mobil roadmap;
- automatikus dokumentációs regresszióteszt.

### V14.1 – Tauri kapcsolat és eszközprofilok

Tervezett fő elemek:

- több Arduino-profil;
- helyi és távoli host/port külön mezők;
- közvetlen Arduino mód alapértelmezett;
- „V5 rendszer” szerverpanel elrejtése;
- kapcsolat- és API-teszt;
- profilváltás;
- helyes Beta Arduino adatok megadhatósága;
- validáció: hostban nincs protokoll, port 1–65535.

### V14.2 – Titkos profilimport és credential store

- `controller-profile.secret.json` séma;
- egyszeri import;
- natív keychain/credential manager/secret service;
- eszközprofilonként külön kulcstárbejegyzés;
- Arduino API-kulcs;
- privát API-útvonal;
- desktop OTA-jelszó;
- redaktált export;
- titkok nélküli normál profil-export.

### V14.3 – Schedule közvetlen Arduino-szerződés

- Arduino schedule export;
- Arduino schedule upload;
- EEPROM visszaolvasási ellenőrzés;
- konfliktusvédelem;
- alkalmazáscache csak másodlagos;
- offline szerkesztési piszkozat;
- hardveres 60 eseményes teszt.

### V14.4 – Naplózás és diagnosztika

- helyi SQLite vagy JSONL napló;
- eszközprofil-azonosító;
- redaktált hálózati napló;
- Arduino konzol lekérés;
- kapcsolatváltási események;
- exportálható diagnosztikai csomag titkok nélkül.

### V14.5 – Desktop OTA és rollback

- macOS Terminal/`arduinoOTA`;
- Windows és Linux OTA-motor;
- SHA-256 ellenőrzés;
- last-known-good firmware;
- OTA utáni verzióellenőrzés;
- mobil OTA teljes tiltása.

### V14.6 – Mobil használhatóság

- Android/iOS helyi hálózati engedélyek;
- kézi profilimport;
- DDNS használat;
- profilváltás;
- foreground/background reconnect;
- OTA menü elrejtése;
- valós eszköztesztek.

### V14.7 – Opcionális Node/LXC elkülönítés

- külön kísérleti kapcsoló;
- külön dokumentáció;
- szerver által generált saját Bearer token;
- első admin/token bootstrap;
- semmilyen függés a közvetlen Arduino módban;
- külön szerver-DDNS és port.

## 5. Felelősségi mátrix

| Funkció | Arduino | Tauri | Node/LXC |
|---|:---:|:---:|:---:|
| LED-végrehajtás | elsődleges | vezérlő UI | opcionális proxy |
| Aktuális LED-állapot | hiteles forrás | megjelenítés/cache | opcionális |
| Schedule tárolás | elsődleges EEPROM | szerkesztés/cache | nem elsődleges |
| Schedule végrehajtás | igen | nem | nem |
| Wi-Fi/API konfiguráció | EEPROM | beállító UI | opcionális |
| X-Device-Key | ellenőrzi | küldi/tárolja | proxyként küldheti |
| Alkalmazásnapló | korlátozott konzol | elsődleges helyi napló | opcionális |
| OTA | fogadja | desktopon indítja | opcionális |
| Mobil OTA | — | tiltott | — |
| Felhasználói profilok | — | helyi DB | opcionális szerverauth |
| Több Arduino | — | profilokkal | opcionális |

## 6. Titokkezelés

### Arduino titkai

- `API_SHARED_SECRET`;
- `API_PRIVATE_PATH`;
- `OTA_PASSWORD`;
- Wi-Fi adatok.

A forrásértékek `secrets.h` fájlban lehetnek, az Arduino pedig EEPROM-ban kezeli a működő konfigurációt.

### Tauri titkai

A Tauri nem kérdezheti le az Arduino meglévő kulcsát.

Megengedett bevitel:

1. kézi megadás;
2. helyi `controller-profile.secret.json` import;
3. későbbi biztonságos párosítási folyamat.

Tárolás:

- macOS Keychain;
- Windows Credential Manager;
- Linux Secret Service;
- mobil secure storage, ha a platformintegráció elkészül.

### Opcionális szervertitkok

A Node/LXC Bearer token vagy session-hitelesítés külön rendszer. Nem olvasható a firmware `secrets.h` fájljából, és nem azonos az Arduino eszközkulcsával.

## 7. Elfogadási követelmények

Minden csomaghoz:

- teljes fájlok;
- verziózott ZIP;
- ZIP SHA-256;
- fájlmanifest;
- `git diff --check`;
- Node/TypeScript/Rust szintaxis- vagy buildteszt;
- releváns regressziós teszt;
- titokszkennelés;
- pontos staging;
- commit és push csak sikeres helyi gate után.

## 8. Kifejezetten tiltott

- Bearer token kitalálása az Arduinohoz;
- session-cookie használata közvetlen Arduino-kapcsolathoz;
- az Arduino API-kulcs visszaolvasása nyílt API-válaszban;
- OTA-jelszó naplózása;
- `secrets.h` vagy `*.secret.json` commitolása;
- mobil OTA;
- Node/LXC kötelezővé tétele;
- schedule elsődleges tárolása csak desktopon vagy szerveren;
- régi sikertelen workflow újrafuttatása új commit helyett.

## 9. Következő végrehajtási sorrend

1. V14.0 dokumentáció és szerződés;
2. V14.1 Tauri közvetlen kapcsolat és profilok;
3. V14.2 titkos import és credential vault;
4. V14.3 schedule közvetlen Arduino;
5. V14.4 naplózás;
6. V14.5 desktop OTA;
7. V14.6 mobil;
8. V14.7 opcionális LXC elkülönítés;
9. új Beta.2 readiness és többplatformos kiadás.
