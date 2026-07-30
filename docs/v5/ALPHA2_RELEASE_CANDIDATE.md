# 5.0.0-alpha.2 release candidate

A candidate funkcionalitást a
`1236becc37e9b4d8ed2334f3cd60b455c248e82d` commit rögzítette. A valódi LXC
gate, staging deployment, rollback rehearsal, promotion és finalization
jóváhagyás után a repository verziója `5.0.0-alpha.2` értékre lett
szinkronizálva.

## Candidate tartalom

- forgatható és visszavonható, hash formában tárolt API-tokenek;
- firmware backup, last-known-good védelem és OTA rollback;
- OTA feltöltés megszakítása;
- OpenAPI-alapú TypeScript kliensgenerálás;
- valódi LXC gate és gépi gate-jelentés;
- verziózott, SHA-256 értékkel ellátott release bundle;
- izolált staging service és execution receipt-lánc.

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

A finalizált kiadási összefoglaló:
`docs/v5/ALPHA2_RELEASE_NOTES.md`.
