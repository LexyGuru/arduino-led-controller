# V5 rearchitecture checklist

**Frissítve:** 2026-07-30
**Aktuális verzió:** `5.0.0-beta.1`
**Firmware:** `4.1.21`
**Integrációs ág:** `next/v5-rearchitecture`
**Beta commit:** `ef42c233ebd99a42ec68a5b422b9787b0c4cda44`
**Sikeres workflow:** `30564106374`

## Történeti állapot

- [x] Alpha.2 moduláris Node/LXC és release infrastruktúra
- [x] Teljes izolált LXC integrációs és rollback teszt
- [x] `5.0.0-alpha.2` verziólépés
- [x] Alpha.3 `X-Device-Key`
- [x] `5.0.0-alpha.3` finalization
- [x] Artifact-only Tauri CI előkészítés
- [x] Beta.1 prerelease
- [x] macOS Bash 3.2 hotfix
- [x] Linux Tauri Rust gate hotfix
- [x] GitHub prerelease `v5.0.0-beta.1`

Alpha.2 `next` merge commit: `bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b`

Alpha.3 integrációs merge:
`295713798b1487ec2c788b170be2fce32fccea2a`

Alpha.3 feature:
`e2dc8ac41edf39717b4e2708e6b03aba0b6431bb`

## Új architektúra-döntés

- [x] Közvetlen Arduino mód az alapértelmezett
- [x] Arduino az aktuális eszközállapot hiteles forrása
- [x] Arduino EEPROM az időzítések elsődleges tárolója
- [x] Arduino hajtja végre az időzítéseket kliens nélkül
- [x] `X-Device-Key` a közvetlen kapcsolat hitelesítése
- [x] Node/LXC opcionális és elkülönített
- [x] Bearer/session nem része az alap Arduino módnak
- [x] Mobil OTA tiltott
- [x] Desktop OTA külön platformfolyamat

## V14.0 – dokumentáció

- [x] README direct-first architektúrára állítása
- [x] master roadmap frissítése
- [x] implementációs státusz frissítése
- [x] közvetlen Arduino architektúradokumentum
- [x] titokkezelési dokumentum
- [x] desktop/mobil roadmap
- [x] Beta.1 ismert hibák
- [x] dokumentációs regresszióteszt
- [x] csomagmanifest

## V14.1 – kapcsolat és eszközprofilok

- [x] közvetlen Arduino mód az egyetlen alapértelmezett UI-út
- [x] félrevezető `V5 rendszer` menü eltávolítása
- [x] történeti `V5SystemPage` és release/LXC panelek megőrizve, de leválasztva a normál navigációról
- [x] helyi host külön mező
- [x] helyi port külön mező
- [x] távoli DDNS/IP külön mező
- [x] távoli port külön mező
- [x] privát API-útvonal magyarázata és validációja
- [x] Arduino eszközkulcs magyarázata és validációja
- [x] mentés és teljes védett Arduino-státuszteszt
- [x] DDNS host validáció
- [x] port validáció
- [x] régi üres `10.0.0.123` placeholder automatikus kivezetése
- [x] Beta Arduino címsegéd: `10.0.0.117:80` + `beta-lexyguruhome.ddns.net:25666`
- [ ] több eszközprofil
- [ ] profilnév és aktív profil váltása
- [ ] helyi és távoli végpont külön-külön kényszerített tesztje
- [ ] optionalServer mód külön kísérleti beállítás mögött

## V14.2 – titkos profilimport

- [ ] `controller-profile.secret.json` JSON séma
- [ ] fájlimport desktopon
- [ ] kézi bevitel
- [ ] natív credential store
- [ ] eszközprofilonként külön kulcstárkulcs
- [ ] API-kulcs nem kerül normál config store-ba
- [ ] OTA-jelszó nem kerül normál config store-ba
- [ ] titkos fájl nem kerül Gitbe
- [ ] import után törlési figyelmeztetés
- [ ] redaktált profil-export
- [ ] hibás/hiányos secret fájl elutasítása
- [ ] secret scanner regresszió

## V14.3 – schedule

- [ ] Arduino schedule export
- [ ] Arduino schedule import/upload
- [ ] EEPROM visszaolvasási ellenőrzés
- [ ] 60 eseményes határteszt
- [ ] heti napmaszk teszt
- [ ] éjfélen átnyúló esemény
- [ ] manuális felülbírálás
- [ ] időzóna és DST
- [ ] Tauri cache csak másodlagos
- [ ] nincs Node/LXC schedule-függés
- [ ] nincs háttérben késleltetett automatikus írás

## V14.4 – napló és diagnosztika

- [ ] helyi SQLite vagy JSONL
- [ ] profilazonosító
- [ ] kapcsolatváltási esemény
- [ ] HTTP válaszkód
- [ ] Arduino konzol
- [ ] OTA konzol
- [ ] redaktált diagnosztikai export
- [ ] kulcs/jelszó/header tiltása naplóban
- [ ] naplórotáció
- [ ] felhasználói törlés

## V14.5 – OTA és rollback

- [ ] macOS Terminal/`arduinoOTA`
- [ ] Windows támogatás
- [ ] Linux támogatás
- [ ] firmware SHA-256
- [ ] last-known-good
- [ ] verzióellenőrzés újraindulás után
- [ ] timeout és cancel
- [ ] rollback
- [ ] OTA csak helyi IP/VPN
- [ ] Android OTA rejtve
- [ ] iOS/iPadOS OTA rejtve

## V14.6 – mobil

- [ ] Android local network
- [ ] iOS local network permission
- [ ] manuális host/DDNS
- [ ] secret profilimport vagy biztonságos párosítás
- [ ] mobil secure storage
- [ ] foreground/background reconnect
- [ ] kapcsolatprofil-váltás
- [ ] schedule kezelés
- [ ] naplómegtekintés
- [ ] OTA menü nincs
- [ ] valós Android teszt
- [ ] valós iPhone/iPad teszt

## V14.7 – opcionális szervermód

- [ ] külön „Kísérleti szerver” kapcsoló
- [ ] külön szervercím és port
- [ ] külön szerver Bearer token
- [ ] első token/admin bootstrap
- [ ] szerver telepítő token-generálás
- [ ] nincs függés a direct módban
- [ ] külön szerver dokumentáció
- [ ] külön szerver E2E teszt
- [ ] LXC nélkül teljes Tauri működés

## Biztonsági kapuk

- [ ] `secrets.h` nincs stagingben
- [ ] `*.secret.json` nincs stagingben
- [ ] API-kulcs nincs URL-ben
- [ ] API-kulcs nincs logban
- [ ] OTA-jelszó nincs logban
- [ ] közvetlen API csak privát útvonal + `X-Device-Key`
- [ ] meglévő kulcs nem olvasható vissza
- [ ] kulcscsere hitelesített
- [ ] credential vault platformteszt
- [ ] release secret scan

## Integrációs kapuk

- [ ] Beolvasztás `main` ágba
- [ ] Produkciós LXC átváltása V5-re
- [ ] Produkciós Arduino V5 migráció

## Beta.2 readiness

- [ ] V14.1–V14.5 desktopon kész
- [ ] legalább macOS hardveres E2E
- [ ] Windows/Linux build és alapteszt
- [ ] Android/iOS direct mód alapteszt
- [ ] Beta.1 ismert kapcsolati hibák megszűntek
- [ ] szerverpanel nem zavarja az alapfelhasználót
- [ ] README és telepítési útmutató egységes
- [ ] teljes repository-validáció
- [ ] többplatformos release workflow
- [ ] `main` továbbra is változatlan a külön merge-döntésig
