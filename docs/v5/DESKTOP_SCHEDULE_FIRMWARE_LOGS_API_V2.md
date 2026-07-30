# Desktop Schedule, Firmware és Naplók API v2

## Schedule

A V5 szerver helyi schedule listája az elsődleges adatforrás. Mentés előtt a
desktop kliens frissen lekéri a szerverlistát és stabil ujjlenyomatot képez.

Ha a szerverlista a szerkesztés megkezdése óta változott:

- a mentés `SCHEDULE_CONFLICT` hibával leáll;
- a felhasználó betöltheti a szerver változatát;
- vagy külön megerősítéssel tudatosan felülírhatja.

Az Arduino-szinkron külön művelet, ezért a V5 szerverre mentés nem indít
észrevétlen eszközmódosítást.

## Firmware és OTA

API v2 módban a V5 szerver kezeli:

- kiadásellenőrzés;
- OTA-frissítés;
- futó művelet megszakítása;
- firmware backupok;
- last-known-good védelem;
- rollback;
- backup törlés.

A `firmware.*` EventBus események valós időben frissítik a desktop konzolt.
Futó OTA alatt a kliens időszakosan lekéri a hiteles állapotot is.

## Naplók

A naplóoldal egyesíti:

- Arduino közös konzolcache;
- konzolstatisztika;
- biztonsági audit;
- EventBus események;
- helyi Tauri hálózati napló.

A konzoltörlés csak hitelesített API v2 kapcsolaton érhető el.

## Biztonságos fallback

Közvetlen Tauri fallback csak a művelet indítása előtt használható, amikor
egyértelmű, hogy nincs hitelesített és online API v2 kapcsolat. Elindult
schedule-, firmware- vagy törlési kérés hálózati hibája után a kliens nem
ismétli meg automatikusan a műveletet közvetlen útvonalon.
