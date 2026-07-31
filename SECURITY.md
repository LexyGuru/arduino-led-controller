# Biztonsági szabályok

## Titkok

A következő fájlok és adatok nem kerülhetnek Gitbe vagy release-csomagba:

- `firmware/ArduinoLedController/secrets.h`;
- `.env` és privát környezeti fájlok;
- API-eszközkulcs, OTA-jelszó, Wi-Fi-jelszó;
- privát API-útvonal;
- importálható titkos eszközprofil.

## Arduino API

- Hitelesítési fejléc: `X-Device-Key`.
- Query-string kulcsfallback: tiltott.
- A kulcsot nem szabad URL-ben vagy parancssori argumentumban naplózható módon átadni.
- Az API-t és az OTA-portot ne tedd közvetlenül elérhetővé a nyilvános internetről.

## OTA

Az OTA kizárólag megbízható desktop környezetből és helyi hálózaton támogatott. A firmware SHA-256 ellenőrzése feltöltés előtt kötelező.

## Hibabejelentés

Biztonsági hibát ne nyilvános issue-ban közölj. A repository tulajdonosával privát csatornán egyeztess, és ne mellékelj valódi kulcsot vagy jelszót.
