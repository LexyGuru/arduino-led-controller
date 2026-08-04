# Arduino LED Controller 5.0.0-beta.5

## Multilingual Desktop Stabilization Release

A Beta.5 a teljes magyar, angol és német felületet, a központi runtime-üzenetréteget és a kiadási dokumentáció egységesítését szállítja. A firmware és a Direct API protokoll változatlan marad.

## Verziók

- Alkalmazás: `5.0.0-beta.5`
- Firmware: `4.3.0-beta.4`
- Direct API: `1.0.0`
- Csatorna: `beta`
- GitHub prerelease: igen

## Fő változások

- teljes HU/EN/DE lokalizáció;
- azonnali nyelvváltás és perzisztált választás;
- rendszer-nyelv automatikus felismerése;
- fordítható runtime-, kapcsolat-, LED-, schedule-, firmware- és OTA-üzenetek;
- fordítható siker-, hiba-, konfliktus-, import/export- és backup-üzenetek;
- i18n source-integrity és HU/EN/DE kulcsparitási kapu;
- hardcoded UI és hook-üzenet audit;
- frissített mobilos és desktop contractok;
- frissített README, CONTRIBUTING és SECURITY;
- új Beta.5 telepítési útmutató és release checklist.

## Firmware

A firmware továbbra is `4.3.0-beta.4`. Nem változott:

- Direct API `1.0.0`;
- fejlécalapú `X-Device-Key`;
- A/B EEPROM schedule tárolás;
- 60 rekordos schedule;
- tranzakciós írás;
- OTA és távoli reboot protokoll.

## Kompatibilitás

A Beta.5 kizárólag a beta csatornán jelenik meg. A firmware-katalógus nem használ stabil fallbacket beta csatornán.

## Ág- és hardverbiztonság

- A `main` ág nem módosul; a kiadás kizárólag a `next/v5-rearchitecture` ágról készül.
- A staging alapértelmezésben nem használja a produkciós Arduino `10.0.0.123` címet.
- Produkciós hardver csak külön, explicit engedéllyel érhető el.

## Kiadási bizonyítékok

A release tartalmazza a platformartifactokat, `SHA256SUMS`, `RELEASE-MANIFEST.json`, `release-versions.json`, `firmware-release.json`, `latest-beta.json`, SBOM, provenance és secret-scan fájlokat.
