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

## V14.1 forrásjavítás

A V14.1 csomag a `next/v5-rearchitecture` ágon:

- eltávolítja a normál navigációból a félrevezető `V5 rendszer` menüt;
- a közvetlen Arduino-kapcsolatot teszi az egyetlen alapértelmezett felhasználói úttá;
- külön és jól látható helyi IP/port, illetve távoli DDNS/port mezőket ad;
- megmagyarázza az `API_PRIVATE_PATH` és `API_SHARED_SECRET` eredetét;
- teljes védett `/api/status` kapcsolatpróbát ad;
- nem indít automatikus pollingot hiányos cím vagy hitelesítés mellett;
- kivezeti a titkok nélküli régi `10.0.0.123` placeholdert;
- egyetlen gombbal betölthetővé teszi a Beta tesztcímeket.

A kiadott `v5.0.0-beta.1` telepítők ettől nem változnak meg. A javítás a következő Beta buildbe kerül.

A V14.1 még a korábbi Rust konfigurációs tárolást használja. Az API-útvonal és eszközkulcs natív kulcstárba költöztetése a közvetlenül következő V14.2 csomag feladata.


## 8. Firmware-kapcsolati diagnosztika hiányos

A `4.1.21` firmware a bootkonzolon privát útvonal nélküli API-címet ír:

```text
http://<IP>:80/api/status
```

A valódi cím a privát útvonalat is tartalmazza. Hibás útvonal vagy metódus
esetén a firmware jelenleg JSON-válasz nélkül lezárhatja a TCP-kapcsolatot.

Hatás:

- a kliens csak általános kapcsolati hibát lát;
- nem derül ki, hogy cím-, útvonal- vagy hitelesítési hiba történt;
- a Tauri kapcsolat tesztelése nem bizonyítható egyértelműen.

Tervezett javítás: F14.1.

## 9. Firmware API és schedule még nem stabil kliensszerződés

A `4.1.21`:

- nem használ `/api/v1` verziót;
- több módosítást query stringből végez;
- még elfogadhat `?k=` query-kulcsot;
- a schedule mentése nem A/B slotos;
- mentés után nincs EEPROM readback;
- a chunk upload közvetlenül az aktív RAM-ba ír.

Tervezett javítás: F14.2 és F14.3.

## Firmware-first stop

A V14.1 Tauri forrásjavítás megmarad, de új Tauri funkció nem készül addig,
amíg az F14.1–F14.4 firmware-kapuk hardveren nem sikeresek.

## F14.1 javítási állapot

A `4.2.0-beta.1` forrásban elkészült a helyes teljes API URL, a
`404/405/408/401/400` JSON hibakezelés, a request ID, a kliens-IP audit,
a Serial parancskezelő, a secret profil-export és a read-only Direct API v1.

A nyilvános Beta.1 firmware asset továbbra is `4.1.21`; az új forrást előbb
Arduino CLI-vel és valódi hardveren kell validálni.
