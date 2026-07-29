# 5.0.0-alpha.2 release candidate

A repository verziója ebben a munkacsomagban még `5.0.0-alpha.1`. Ez
szándékos: a candidate funkcionalitás elkészül, de a verziószinkron csak a
valódi LXC release-gate után történik.

## Candidate tartalom

- forgatható és visszavonható, hash formában tárolt API-tokenek;
- firmware backup, last-known-good védelem és OTA rollback;
- OTA feltöltés megszakítása;
- OpenAPI-alapú TypeScript kliensgenerálás;
- valódi LXC gate és gépi gate-jelentés;
- verziózott, SHA-256 értékkel ellátott release bundle.

## Release bundle

```bash
REF=feature/v5-server-modularization \
  bash deploy/build-versioned-release.sh
```

Ellenőrzés:

```bash
bash deploy/verify-versioned-release.sh \
  dist/releases/<release>.tar.gz
```
