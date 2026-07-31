# V14.1 – közvetlen Arduino kapcsolat és használhatósági javítás

**Alap commit:** `7a27aa6b91226bae7750ee29061024348f2151f6`
**Alkalmazásverzió:** `5.0.0-beta.1`
**Firmware:** `4.1.21`

## Cél

A kiadott Beta.1 félreérthető szerveres kapcsolatképernyője helyett az alkalmazás
egyetlen alapértelmezett felhasználói utat mutat:

```text
Tauri -> privát API-útvonal + X-Device-Key -> Arduino UNO R4 WiFi
```

## Megvalósított változtatások

- `V5 rendszer` menü eltávolítva a normál navigációból;
- `V5SystemPage` nincs betöltve az alkalmazás fő útvonalába;
- helyi Arduino host és HTTP-port külön mező;
- távoli Arduino DDNS/IP és HTTP-port külön mező;
- hostmezőkben protokoll, perjel és whitespace tiltva;
- porttartomány: 1–65535;
- privát API-útvonal legalább 18 karakter, `/` kezdettel;
- eszközkulcs 24–64 nyomtatható ASCII karakter;
- a felület világosan kimondja, hogy nincs felhasználónév, session-cookie vagy Bearer token;
- a `secrets.h` megfelelő változónevei megjelennek;
- mentés után valódi, hitelesített Arduino `/api/status` teszt;
- hiányos beállítás mellett nincs automatikus hálózati polling;
- régi, titkok nélküli `10.0.0.123` placeholder törlése a betöltött UI-állapotból;
- Beta címsegéd:
  - helyi `10.0.0.117:80`;
  - távoli `beta-lexyguruhome.ddns.net:25666`;
  - helyi OTA `10.0.0.117:65280`.

## Nem része a csomagnak

- több Arduino-profil;
- natív keychain-alapú API-titoktárolás;
- `controller-profile.secret.json` import;
- külön helyi/távoli kényszerített teszt;
- opcionális szerverpanel végleges admin/bootstrap folyamata.

Ezek a V14.2 profil- és credential csomagban következnek.

## Biztonsági megjegyzés

A V14.1 azonnali használhatósági javítás. A meglévő Rust backend ebben a lépésben
még a korábbi `connection.json` konfigurációs modellt használja. Éles Beta.2 kiadás
csak a V14.2 natív credential-vault migráció után készülhet.

## Történeti desktop UI-szerződés migrációja

A korábbi `test-desktop-v5-ui-contract.js` azt követelte, hogy a
`V5SystemPage` közvetlenül szerepeljen az alkalmazás navigációjában. Ez
ellentmondott a V14.1 direct-first döntésnek.

A frissített szerződés most ezt ellenőrzi:

- a `V5 rendszer` oldal nincs a normál navigációban;
- a közvetlen Arduino kapcsolat látható;
- nincs `system` oldalazonosító az aktív `PageId` típusban;
- a `V5SystemPage` és a történeti szerver/release/LXC panelek forrása
  megmarad későbbi opcionális szervermódhoz;
- a `DesktopApiProvider` átmenetileg megmarad, mert a dashboard-, LED-,
  schedule- és firmware-hookok még használják az API v2 fallbackeket.

Ez nem állítja vissza a szerveres felületet. A történeti forrás megőrzése
és az aktív felhasználói út különválik.
