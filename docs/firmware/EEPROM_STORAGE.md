# EEPROM tárolás

A firmware két külön A/B tárolási rendszert használ konfigurációhoz és schedule-höz.

## Tulajdonságok

- slot header, verzió, generáció és checksum;
- `WRITING` majd `VALID` állapot;
- írás utáni readback ellenőrzés;
- bootkor a legújabb érvényes slot kiválasztása;
- hibás vagy félbeszakadt írás esetén az előző aktív slot megmarad.

## Schedule

- maximum 60 rekord;
- rekordméret: 27 bájt;
- tranzakciós begin/chunk/commit/cancel API;
- revision és checksum konfliktusvédelem;
- megszakított tranzakció nem módosítja az aktív slotot.
