# P0 Architecture Consolidation V657

Test-stage consolidation for `next/v5-rearchitecture`.

- Stable Device Key gate fix forward-synced without Stable version identity.
- `release-versions.json` is the canonical application release identity.
- Test Architecture V2 accepts and validates Beta/Stable runtime identity.
- Historical tests remain outside default `npm test`.
- P0 implementation was validated on `5.6.1-beta.2` and is integrated into versioned release `5.6.1-beta.3`.
- Firmware stays `5.0.0-beta.10`.
- Direct API stays `1.0.0`.
- Firmware source behavior is unchanged.
- The original V657 test package performed no commit/push.
- Release integration is prepared separately as `5.6.1-beta.3` with full release documentation.
