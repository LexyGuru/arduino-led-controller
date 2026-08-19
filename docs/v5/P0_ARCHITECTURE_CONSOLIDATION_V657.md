# P0 Architecture Consolidation V657

Test-stage consolidation for `next/v5-rearchitecture`.

- Stable Device Key gate fix forward-synced without Stable version identity.
- `release-versions.json` is the canonical application release identity.
- Test Architecture V2 accepts and validates Beta/Stable runtime identity.
- Historical tests remain outside default `npm test`.
- Application stays `5.6.1-beta.2`.
- Firmware stays `5.0.0-beta.10`.
- Direct API stays `1.0.0`.
- Firmware source behavior is unchanged.
- No commit or push is performed by the test package.
