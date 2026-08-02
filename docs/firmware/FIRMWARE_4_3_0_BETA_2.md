# Firmware 4.3.0-beta.2

A firmware a Direct API v1 teljesítményjavító kiadása az Arduino UNO R4 WiFi hardverhez.

## Változások

- HTTP válaszchunk 128-ról 512 bájtra nőtt.
- A chunkok közötti várakozás 2 ms-ról 1 ms-ra csökkent.
- A válasz lezárási várakozása 80 ms-ról 8 ms-ra csökkent.
- Az első bájt timeout 200 ms, a normál olvasási timeout 350 ms.
- Direct API v1, schedule revision/checksum, A/B EEPROM és OTA kompatibilitás változatlan.

A tényleges válaszidőt a firmware HTTP statisztikáival kell ellenőrizni valós Arduino hardveren.
