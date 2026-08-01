# V5 implementációs állapot

**Frissítve:** 2026-08-01
**Alkalmazás:** `5.0.0-beta.3`
**Firmware:** `4.3.0-beta.1`
**Direct API:** `1.0.0`

## Lezárt

- F14 firmware implementáció és hardverkapu;
- fejlécalapú auth, query fallback tiltás;
- JSON body API;
- konfiguráció és schedule A/B EEPROM;
- 60 rekordos tranzakció, lapozás és persistence;
- OTA és valódi `HTTP 202` remote reboot;
- repository történeti dokumentációs cleanup;
- Direct API v1 schedule lapozás, 60 rekordos letöltés, revision-konfliktusvédelem és readback-alapú cache-frissítés;
- a schedule Mentés és Törlés tiltása addig, amíg nincs teljes, ellenőrzött Arduino-snapshot.

## Következő fázis: Tauri

A firmware többé nem blokkoló tényező. A következő munkafázis kizárólag a Tauri alkalmazás felhasználói és kliensarchitektúrájának rendezése:

1. direct Arduino mód legyen az alapértelmezett;
2. szerver/LXC funkciók kerüljenek külön haladó módba vagy legyenek eltávolítva;
3. eszközprofilok és natív credential store;
4. LED, firmware és log UI közvetlen API-ra kötésének befejezése;
5. platformonkénti OTA-képesség helyes megjelenítése;
6. elavult release/LXC panelek eltávolítása a végleges UX-ből.

## Tilos / korai

- `main` merge a Tauri regresszió és új hardver-integrációs teszt előtt;
- query kulcsfallback visszakapcsolása;
- firmware-verzió emelése új firmware-funkció nélkül;
- szerver/LXC eltávolítása a Tauri importfüggőségek felmérése nélkül.
