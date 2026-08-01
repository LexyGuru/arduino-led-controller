# Tauri Direct API v1 schedule-szinkron

## Cél

A desktop alkalmazás heti időzítéseinek elsődleges adatforrása közvetlenül az Arduino Direct API v1. A működéshez nincs szükség Node.js, LXC vagy V5 API v2 szerverre.

A javítás alapelve: **az Arduino az elsődleges adatforrás**, a Tauri helyi JSON-fájlja csak utoljára teljesen ellenőrzött cache.

## Teljes, lapozott letöltés

A Tauri először lekéri:

```text
GET /api/v1/schedules/status
```

Ezután nyolcas oldalanként végigolvassa a teljes listát:

```text
GET /api/v1/schedules?offset=<offset>&limit=8
```

Minden oldalon az alábbiaknak egyezniük kell:

- `count`
- `revision`
- folyamatos rekordindex
- a várt 27 bájtos rekordméret
- érvényes nap és időpont

Üres oldal, kihagyott index, megváltozó revision vagy hiányos elemszám esetén a letöltés hibával leáll. A korábbi, ellenőrzött helyi cache ilyenkor érintetlen marad.

## Üres LED-műveletű rekordok

A firmware szerződése megengedi, hogy egy schedule rekord érvényes napot és időpontot tartalmazzon, miközben egyik LED `apply` mezője sincs beállítva. Ez egy **üres LED-műveletű rekord**.

Ezeket a desktop korábban érvénytelennek tekinthette, ezért a teljes Arduino-lista letöltése után a helyi cache frissítése meghiúsulhatott. A rekordok most:

- nem vesznek el;
- megjelennek a listában;
- külön figyelmeztetést kapnak;
- törölhetők;
- veszteség nélkül visszakódolhatók.

## Írásvédelmi kapu

Mentés és törlés csak akkor engedélyezett, ha a Tauri rendelkezik sikeres, teljes Arduino-readbackből származó állapottal:

- a betöltött lista hossza egyezik az Arduino `count` értékével;
- ismert a `revision`;
- ismert a `checksum`;
- a szinkron állapota `verified`.

A pusztán helyi cache-ből betöltött lista nem írható vissza automatikusan az Arduino-ra.

## Revision-konfliktus

A szerkesztés az utoljára letöltött Arduino revisionre épül. Mentés előtt a Rust backend újra lekéri az aktuális státuszt.

Ha a revision megváltozott, a művelet `SCHEDULE_CONFLICT` hibával leáll. Így egy másik kliens vagy korábbi művelet változásai nem írhatók felül csendben.

## Tranzakciós feltöltés

Nem üres lista esetén:

1. aktuális revision ellenőrzése;
2. tranzakció létrehozása;
3. minden rekord külön chunkként történő feltöltése;
4. commit;
5. új státusz lekérése;
6. teljes, lapozott readback;
7. minden rekord bináris payloadjának összehasonlítása;
8. revision, count és checksum egyezésének ellenőrzése;
9. helyi cache frissítése.

Hiba esetén a tranzakció visszavonási kérést kap, és a korábbi cache nem módosul.

## Teljes lista törlése

Nulla rekord mentésekor a Tauri a Direct API törlési végpontját használja, majd újra lekéri a teljes állapotot. A helyi cache csak akkor lesz üres, ha az Arduino readback is nulla rekordot igazol.

## Cache-kezelés

A cache csak a sikeres teljes readback után frissül. Ez megszünteti azt a hibát, amikor egy sikertelen vagy félbeszakadt feltöltés előtt a Tauri már elmentette a szerkesztett, például 28 rekordos listát, miközben az Arduino továbbra is 60 rekordot tárolt.

A cache ideiglenes fájlon keresztül kerül aktiválásra, így egy félbeszakadt fájlírás sem hagyhat részleges JSON-t.

## Felhasználói felület

A schedule oldal V5 szerver nélkül működik. A felület külön mutatja:

- Arduino rekordok száma;
- szerkesztési lista hossza;
- revision;
- checksum;
- üres LED-műveletű rekordok száma;
- letöltési vagy ellenőrzési hiba.

A „Mentés Arduino-ra” és a rekordtörlés addig le van tiltva, amíg nincs ellenőrzött teljes Arduino-lista.
