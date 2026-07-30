# Release secret scanner env-placeholder hotfix

## Hiba

A release evidence scanner az `.env.example` dokumentációs értékeit valódi
titoknak tekinthette.

Két külön hiba volt:

1. a `CHANGE_THIS_TO_...` minták nem szerepeltek az engedélyezett
   helyőrzők között;
2. az env-hozzárendelés regexe `\s*` kifejezést használt, amely sortörést is
   elfogyaszthatott. Emiatt egy üres `OTA_PASSWORD=` érték után a következő
   `OTA_PORT=65280` sor kerülhetett a találatba.

## Javítás

Az env scanner most:

- csak szóközt és tabulátort enged az egyenlőség körül;
- soha nem lép át a következő sorra;
- engedélyezi az üres értéket;
- engedélyezi a dokumentációs helyőrzőket;
- kezeli az idézőjelet és a sorvégi megjegyzést;
- a valódi értéket továbbra is SHA-256 lenyomattal blokkolja;
- soha nem írja ki a nyers titkot.

Sikertelen szkenneléskor a build csak ezt jeleníti meg:

- találat típusa;
- repository-relatív fájlútvonal;
- sorszám;
- érték SHA-256 lenyomata;
- értékhossz.
