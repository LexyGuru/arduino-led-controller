# Desktop V5 rendszeroldal

A csomag az első valódi API v2 alapú Tauri felületet vezeti be úgy, hogy a
meglévő közvetlen Arduino/Rust vezérlés változatlanul működik.

## Új navigáció

A bal oldali menüben új **V5 rendszer** oldal jelenik meg.

Az oldal tartalma:

- V5 szerverprofil és URL-validált kapcsolat;
- session-cookie vagy Bearer hitelesítés;
- release és runtime metadata;
- konfigurációs preflight;
- karbantartási mód;
- rendszer-snapshotok;
- snapshot SHA-256 ellenőrzés;
- maintenance-köteles snapshot restore;
- migrációs dry-run és alkalmazás.

## Hitelesítés

A session mód javasolt. Bearer módban a token alapértelmezés szerint csak a
desktop folyamat memóriájában él.

A szerverprofil módosítása után az alkalmazás újratöltődik, hogy a generált
OpenAPI kliens új base URL-lel épüljön fel.

## Biztonsági korlátok

- Offline állapotban módosító művelet nem indul.
- Snapshot restore csak aktív karbantartási módban engedélyezett.
- Restore előtt a felhasználói felület külön megerősítést kér.
- A backend felé a kötelező `RESTORE_SYSTEM_SNAPSHOT` megerősítés kerül.
- Migráció alkalmazása csak maintenance módban választható.
- A meglévő közvetlen Arduino és OTA képernyők nem változnak.

## Következő desktop migráció

1. Dashboard release/preflight állapotának API v2-re állítása.
2. LED képernyő átállítása a `DesktopLedApi` adapterre.
3. Schedule képernyő átállítása a `DesktopScheduleApi` adapterre.
4. Firmware képernyő átállítása a `DesktopFirmwareApi` adapterre.
5. Natív Rust credential bridge implementálása.
