# 5.0.0-alpha.2 – release notes tervezet

## Backend és API

- moduláris API v2 platform;
- többfelhasználós session és forgatható tokenek;
- LED-, schedule-, firmware-, konzol- és fájl API;
- OpenAPI 3.1 és generált TypeScript kliens;
- audit, metrikák, Prometheus és diagnosztika;
- maintenance, snapshot és migrációs rendszer;
- release-gate státusz és promóciós jóváhagyás.

## Desktop

- V5 szerver- és kiadási központ;
- Dashboard, LED, schedule, firmware és napló API v2;
- realtime események;
- offline olvasási cache;
- biztonságos, előre eldöntött legacy fallback;
- schedule konfliktusvédelem;
- firmware backup, rollback és cancel.

## Telepítés

- verziózott release bundle;
- izolált staging systemd szolgáltatás;
- health-alapú automatikus rollback;
- commit- és korazonos release-gate jelentés.

## Gate utáni véglegesítés

A release notes csak a sikeres LXC gate és a közvetlen
`5.0.0-alpha.2` verziószinkron után tekinthető véglegesnek.

## Execution receipt és finalization

- staging deployment receipt;
- staging rollback rehearsal receipt;
- promotion deployment receipt;
- SHA-256 előzménylánc;
- backend finalization readiness;
- desktop execution receipt panel;
- `FINALIZE_ALPHA2_VERSION_SYNC` jóváhagyás fájlmódosítás nélkül.

