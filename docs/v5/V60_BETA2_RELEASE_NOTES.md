# Arduino LED Controller 6.0.0-beta.2

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.2`
Current firmware: `5.1.0-beta.3`
Current Direct API: `1.1.0`
<!-- CURRENT_VERSION_SSOT_END -->

## Language Pack Architecture 2.0

English is embedded and always available as the canonical fallback. Additional language packs are downloaded once, validated, and stored locally for offline use. The language catalog is hosted independently on the `language-packs` branch.

Published packs: Hungarian 1.0.0 and German 1.0.0. French remains pending.

Firmware: 5.1.0-beta.3 (unchanged)
Direct API: 1.1.0 (unchanged)

## Runtime hardening

- Raw manifest and pack JSON duplicate keys are rejected before parsing.
- Pack size is limited to 1 MiB.
- SHA-256, schema, language code and application compatibility are validated.
- Downloadable dictionaries must exactly match the canonical English keyset.
- Placeholder parity and non-empty values are mandatory.
- Installation uses staged/atomic persistence with last-known-good recovery.
- Manifest cache TTL is 24 hours.
- Installed language packs remain available offline.

## Published language packs

- Hungarian (`hu`): `1.0.0`
- German (`de`): `1.0.0`
- French (`fr`): pending

## Beta.2 hotfix

- Fixes desktop language-pack downloads blocked by the Tauri Content Security Policy.
- Adds minimum-privilege `connect-src 'self' https://raw.githubusercontent.com;`.
- Hungarian and German language packs remain `1.0.0` and unchanged.
- French remains pending.
- Firmware remains `5.1.0-beta.3`.
- Direct API remains `1.1.0`.
