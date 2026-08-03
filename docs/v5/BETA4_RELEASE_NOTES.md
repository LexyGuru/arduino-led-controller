# Arduino LED Controller 5.0.0-beta.4

A Beta.4 a `4.3.0-beta.3` firmware és a Direct API `1.0.0` változatlan, hardveresen elfogadott alapjára épül. A kiadás legfontosabb célja, hogy a Tauri heti időzítése közvetlenül és adatvesztés nélkül szinkronizálja az Arduino teljes, legfeljebb 60 rekordos schedule-listáját.

## Fő javítások

- Az Arduino Direct API az elsődleges schedule-adatforrás; a heti időzítéshez nem szükséges V5/Node/LXC szerver.
- A Tauri minden lapot letölt az `offset`/`limit` API-val, és csak teljes `count` egyezésnél fogadja el a snapshotot.
- A lapok között változó `revision` konfliktusnak számít, ezért a kliens nem kever össze eltérő Arduino-állapotokat.
- A helyi schedule-cache csak sikeres feltöltés, commit és teljes readback-ellenőrzés után frissül.
- A mentési és törlési művelet le van tiltva addig, amíg nincs teljes, ellenőrzött Arduino-snapshot.
- A valóban üres LED-műveletű, de érvényes Arduino-rekordok megmaradnak, megjeleníthetők és törölhetők.
- A hiányzó `apply` jelzővel, de megmaradt LED-adatokkal rendelkező örökölt rekordok automatikusan helyreállnak; a következő sikeres mentés normalizálja őket.
- A közvetlen letöltési és mentési Promise-okat a felület megvárja; a hibák nem maradnak néma háttérműveletek.
- A dashboard külön jelzi az Arduino rekordmennyiséget, a betöltött szerkesztési listát és a szinkronizáció állapotát.
- Új Direct schedule regressziós teszt és architektúra-dokumentáció védi a 60 rekordos működést.

## Verziópárosítás

- Alkalmazás: `5.0.0-beta.4`
- Firmware: `4.3.0-beta.3`
- Direct API: `1.0.0`
- Board: Arduino UNO R4 WiFi

Firmware verzió: 4.3.0-beta.3

A firmware verziója szándékosan nem változik. A Beta.4 kizárólag a Tauri schedule-kliensét, a felületi állapotkezelést, a regressziós teszteket és a kiadási dokumentációt módosítja.

## Schedule-adatbiztonság

A Beta.4 előtti alkalmazással nem ajánlott hiányos, például 28/60 eltérést mutató schedule-listát visszamenteni. A Beta.4 a Mentés és Törlés műveletet addig nem engedélyezi, amíg az Arduino teljes listája, revisionje és rekordszáma nincs ellenőrizve.

Sikeres módosítás után a kliens újra letölti a teljes Arduino-listát, és csak az egyező readback után tekinti befejezettnek a műveletet. A felület külön jelzi a valóban üres rekordokat és a megőrzött LED-adatokból helyreállított örökölt műveleteket.

## Kiadási jelleg

Ez GitHub prerelease. A `main` ág és a stabil csatorna nem módosul. A csomag nem tartalmaz produkciós telepítést vagy valódi Wi-Fi-, Device Key-, privát API-path- vagy OTA-titkot.

A Node.js/LXC csomag kompatibilitási artifactként továbbra is elkészül, de a Beta.4 schedule-funkciójához nem szükséges és nem elsődleges.
A staging telepítés alapértelmezetten nem használja a produkciós `10.0.0.123` Arduino címet; annak engedélyezése külön, explicit kapcsolóhoz kötött.

## Biztonság és integritás

A release tartalmaz `SHA256SUMS`, `RELEASE-MANIFEST.json`, `latest-beta.json`, `SBOM.cdx.json`, `PROVENANCE.json` és `SECRET-SCAN.json` fájlokat. Minden platformartifact ugyanabból a `v5.0.0-beta.4` release commitból készül.
