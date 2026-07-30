# Desktop Dashboard és LED API v2 átállás

## Elsődleges adatút

A Dashboard az alábbi sorrendben választ adatforrást:

1. élő API v2;
2. API v2 offline cache;
3. közvetlen Tauri–Arduino adat;
4. API-hiba esetén a meglévő Tauri-adat megjelenítése.

A felület minden esetben jelzi az aktuális adatforrást.

## LED-vezérlés

Hitelesített és online API v2 kapcsolatnál:

- LED állapotlista az `/api/v2/leds` végpontról;
- csatornánkénti módosítás `PUT /api/v2/leds/:id`;
- összes bekapcsolás és kikapcsolás;
- reset;
- három tesztpreset;
- `led.*` realtime esemény után automatikus frissítés.

Hitelesítés vagy V5 szerverkapcsolat hiányában a meglévő közvetlen Tauri
vezérlés működik tovább.

## Dupla parancs elleni védelem

Ha egy API v2 módosító kérés elindult, de hálózati hibával tér vissza, a kliens
nem küldi el automatikusan ugyanazt a műveletet közvetlen Tauri útvonalon.
Nem állapítható meg biztonságosan, hogy az Arduino már végrehajtotta-e az első
parancsot.

Közvetlen fallback csak akkor használható, amikor a művelet előtt egyértelmű,
hogy nincs hitelesített és online API v2 kapcsolat.

## Még hátralévő desktop migráció

- Schedule oldal API v2-re állítása.
- Firmware/OTA oldal API v2-re állítása.
- Naplóoldal közös konzol- és audit API-ra állítása.
- Natív credential bridge regisztrálása a Tauri Rust builderben.
