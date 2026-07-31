# V5 Beta.1 ismert hibák

Érintett kiadás: `5.0.0-beta.1`
Release commit: `ef42c233ebd99a42ec68a5b422b9787b0c4cda44`

## 1. Közvetlen Arduino és V5 szerver összekeverése

A „V5 rendszer” felület külön Node/LXC API v2 szervert vár, miközben az alapfelhasználó közvetlenül az Arduinohoz szeretne kapcsolódni.

Hatás:

- félreérthető szervercím;
- az Arduino DDNS-címe tévesen szervercímként használható;
- a felület szükségtelen session/Bearer adatokat kérhet.

Tervezett javítás: V14.1.

## 2. DDNS és port használhatósága

A forrásban létező távoli DDNS- és portmezők megjelenése, szerkeszthetősége és mentése a kiadott alkalmazásban külön regressziós tesztet igényel.

A host és port külön mező:

```text
host: beta-lexyguruhome.ddns.net
port: 25666
```

Tervezett javítás: V14.1.

## 3. Ismeretlen felhasználónév és jelszó

A session mód `admin` felhasználónevet mutathat, de a Beta LXC telepítés nem hoz létre automatikusan használható első admint.

Nem használható:

- macOS jelszó;
- GitHub jelszó;
- Wi-Fi jelszó;
- OTA-jelszó;
- DDNS-fiók jelszava.

Tervezett javítás: a session mód elrejtése az alapfelületről; opcionális szerver bootstrap V14.7-ben.

## 4. Bearer token nincs létrehozva

A Beta.1 LXC telepítő nem generál egyértelműen átadható első API v2 Bearer tokent.

A tokent nem az Arduino generálja, és nem azonos az `X-Device-Key` kulccsal.

Tervezett javítás:

- direct módban nincs Bearer mező;
- opcionális szervermódban a telepítő generálja;
- külön szerverdokumentáció.

## 5. Schedule elsődleges forrása

Bizonyos API v2 dokumentumok a szerver schedule-listáját elsődlegesként írják le. A végleges direct-first döntés szerint az Arduino EEPROM a hiteles schedule-tároló és az Arduino a végrehajtó.

Tervezett javítás: V14.3.

## 6. Mobil OTA

A Beta többplatformos csomagot készít, de a firmware OTA mobilon nem támogatott funkció.

Tervezett javítás: az OTA menü teljes elrejtése Androidon és iOS/iPadOS-en.

## 7. Biztonságos secret import hiánya

A felhasználónak jelenleg kézzel kell megadnia a privát API-útvonalat és az eszközkulcsot.

Tervezett javítás: `controller-profile.secret.json` import és natív credential store V14.2-ben.

## Átmeneti használati szabály

Beta.1 alatt:

1. a közvetlen Arduino beállításokat használd;
2. host és port külön érték;
3. közvetlen auth: privát útvonal + `X-Device-Key`;
4. ne adj meg Mac/GitHub/Wi-Fi jelszót a session mezőben;
5. a „V5 rendszer” panelt ne használd Arduino DDNS-címmel;
6. OTA-t csak desktopon és helyi hálózaton használj.
