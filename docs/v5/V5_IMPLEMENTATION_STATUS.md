# V5 implementációs állapot – közvetlen Arduino realignment

**Frissítve:** 2026-07-31
**Alkalmazás:** `5.0.0-beta.1`
**Firmware:** `4.1.21`
**Beta commit:** `ef42c233ebd99a42ec68a5b422b9787b0c4cda44`

## Összefoglaló

A Beta.1 kiadás build- és release-folyamata sikeresen lezárult, de a Tauri felhasználói architektúrája további javítást igényel.

A fő probléma:

- a közvetlen Arduino kapcsolat és az opcionális API v2 szerverkapcsolat összekeveredik;
- a felület session-cookie-t, felhasználónevet/jelszót vagy Bearer tokent kérhet olyan felhasználótól is, aki nem telepített Node/LXC szervert;
- a DDNS/port mezők és a szervercím szerepe nem egyértelmű;
- nincs dokumentált első szerveradmin/token bootstrap;
- a firmware meglévő önálló schedule- és EEPROM-képessége nincs megfelelően elsődlegesként kezelve.

## Bizonyított firmware-képességek

A `4.1.21` firmware:

- EEPROM-ból tölti a Wi-Fi- és OTA-beállításokat;
- EEPROM-ból tölti a védett API-beállításokat;
- önálló HTTP API-t futtat;
- `X-Device-Key` hitelesítést támogat;
- ArduinoOTA listenert futtat;
- a heti időzítéseket Arduino-oldalon tárolja és hajtja végre;
- Tauri és Node/LXC nélkül is működik.

Állapot: **részben működő, de Tauri-integrációhoz még nem stabil szerződés**. A hardveres `X-Device-Key` mátrix igazolt, de a közvetlen klienskapcsolat teljes diagnosztikája, hibatérképe és schedule-tranzakciója még hiányos.

A query fallback átmenetileg engedélyezett a `4.1.21` kompatibilitási időszakban, de minden új kliensnek fejlécet kell használnia.


## Firmware-first döntés

A V14.1 Tauri kapcsolatfelület forrásjavítása elkészült a
`a70a84e335fe9c3199082269a2ce35502f15a6cc` commitban, de a firmware
bizonyítható stabilitása nélkül nem folytatjuk a Tauri funkciófejlesztését.

Az F14.0 audit kritikus megállapításai:

- a bootkonzol privát útvonal nélküli, használhatatlan `/api/status` URL-t ír;
- hibás privát útvonal és metódus esetén a firmware válasz nélkül lezárja a TCP-t;
- nincs `/api/v1`;
- a módosító műveletek query stringből dolgoznak;
- a `?k=` query fallback még alapértelmezetten be van kapcsolva;
- a gyakori polling kliens-IP-je nem kerül naplózásra;
- a schedule EEPROM-írás nem A/B és nincs write/readback;
- a darabolt schedule-import közvetlenül az aktív RAM-tömbbe ír.

A célfirmware `4.2.0-beta.1`. A Tauri V15 csak az F14.4 hardveres kapu után
folytatódhat.


## F14.1 forrásimplementáció

A `4.2.0-beta.1` firmware-forrás elkészült request ID-val, egységes HTTP/JSON
hibákkal, kliens-IP audittal, polling összesítéssel, Serial parancskezelővel,
secret profil-exporttal és read-only `/api/v1` diagnosztikával. A legacy
Tauri-kompatibilitás megmaradt.

A fázis csak Arduino CLI fordítás és valós hardveres teszt után zárható le.
Az F14.2 JSON body API és az F14.3 A/B EEPROM továbbra is nyitott.

## Beta.1 release

- sikertelen első workflow: `30560448751`;
- javított sikeres workflow: `30564106374`;
- release commit: `ef42c233ebd99a42ec68a5b422b9787b0c4cda44`;
- prerelease tag: `v5.0.0-beta.1`;
- Windows, macOS ARM/Intel, Linux, Android, iOS, LXC és firmware assetek elkészültek;
- `main`, firmware-latest produkciós állapota és produkciós telepítés változatlan maradt.

## Komponensenkénti állapot

### Arduino firmware

| Tétel | Állapot | Megjegyzés |
|---|---|---|
| LED-vezérlés | működő alap | hardveres teljes regresszió még kell |
| EEPROM schedule | működő alap | 60 esemény és edge case teszt kell |
| Wi-Fi/OTA EEPROM | működő | log alapján betöltődik |
| Védett API | működő | `X-Device-Key` |
| OTA listener | működő | `65280/TCP` |
| Titok visszaolvasás | tiltandó | csak configured flag engedhető |
| Kulcscsere | tervezett | hitelesített helyi művelet |

### Tauri közvetlen Arduino mód

| Tétel | Állapot |
|---|---|
| közvetlen Arduino kliens | részleges |
| helyi host/port | meglévő, UI-teszt szükséges |
| távoli DDNS/port | meglévő, UI/mentési hiba vizsgálandó |
| privát API-útvonal | meglévő |
| X-Device-Key | meglévő alap |
| több eszközprofil | nyitott |
| secret profilimport | nyitott |
| natív credential store eszközprofilonként | átalakítandó |
| kapcsolat teszt | bővítendő |
| helyes hibaüzenetek | nyitott |

### Tauri schedule

| Tétel | Állapot |
|---|---|
| Arduino schedule kezelés | részleges |
| Arduino legyen elsődleges | architektúradöntés kész |
| server-first schedule | kivezetendő az alapmódból |
| cache/piszkozat | tervezett |
| EEPROM visszaellenőrzés | nyitott |

### Tauri napló

| Tétel | Állapot |
|---|---|
| Arduino konzol | részleges |
| helyi alkalmazásnapló | bővítendő |
| titokredakció | kötelező |
| profil szerinti szűrés | nyitott |
| diagnosztikai export | nyitott |

### Tauri OTA

| Platform | Állapot |
|---|---|
| macOS | meglévő alap, teljesítendő |
| Windows | build van, funkcionális teszt kell |
| Linux | build van, funkcionális teszt kell |
| Android | ki kell kapcsolni |
| iOS/iPadOS | ki kell kapcsolni |

### Node/LXC

A szerveres rendszer technikailag jelentős Alpha.2/API v2 munkát tartalmaz, de az alap Tauri felhasználói útból ki kell venni.

| Tétel | Állapot |
|---|---|
| opcionális böngészős átjáró | megtartható |
| kötelező kliens-backend | elutasítva |
| session alapértelmezés | elrejtendő |
| Bearer token alapértelmezés | elrejtendő |
| első admin/token bootstrap | hiányos |
| külön kísérleti mód | tervezett |
| külön dokumentáció | tervezett |

## Titokmodell

### Arduino direct

```text
API_PRIVATE_PATH
API_SHARED_SECRET / X-Device-Key
OTA_PASSWORD
```

### Tauri

A telepített alkalmazás nem olvassa ki az Arduino `secrets.h` fájlját a hálózaton.

Beviteli utak:

- kézi bevitel;
- helyi `controller-profile.secret.json` import;
- későbbi párosítás.

Tárolás:

- natív operációsrendszer-kulcstár;
- profilazonosító szerinti elkülönítés;
- normál config store csak nem titkos metaadatot tartalmaz.

### Opcionális Node/LXC

```text
API_V2_TOKEN vagy session
```

Ez külön titok és külön biztonsági tartomány.

## Történeti Alpha.3 referencia

- Alpha.3 feature:
  `e2dc8ac41edf39717b4e2708e6b03aba0b6431bb`;
- Alpha.3 merge:
  `295713798b1487ec2c788b170be2fce32fccea2a`;
- aktuális alkalmazásverzió: `5.0.0-alpha.3` volt;
- Artifact-only Tauri CI előkészítés elkészült;
- `X-Device-Key` hardveresen igazolt;
- `main` merge és produkciós telepítés akkor tiltott volt.

Ez a rész történeti, nem a jelenlegi alkalmazásverziót jelöli.

A `main` merge és a produkciós telepítés az Alpha.3 minősítéskor **Tilos / korai** állapotú volt, és továbbra is külön elfogadási kapu.

## Következő végrehajtás

1. F14.1 firmware diagnosztika és Serial parancsok;
2. F14.2 Arduino Direct API v1;
3. F14.3 A/B EEPROM és schedule-tranzakció;
4. F14.4 hardveres stabilitási gate;
5. Tauri V15 secret profilimport és credential vault;
6. Tauri V15 schedule, napló és OTA az Arduino v1 szerződés alapján;
7. mobil;
8. opcionális szerver elkülönítés;
9. Beta.2.


## F14 Complete firmware adaptation

- Firmware `4.3.0-beta.1`; Direct API `1.0.0`.
- Header-only auth, JSON LED API, tranzakciós schedule, A/B EEPROM és legacy migráció forrásban elkészült.
- Tauri-forrás változatlan.
- Publikus firmware kiadás előtt a `F14_COMPLETE_HARDWARE_GATE.md` teljesítendő.
