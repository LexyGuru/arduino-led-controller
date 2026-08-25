# Arduino LED Controller 6.0.0-beta.1

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.1`
Current firmware: `5.1.0-beta.3`
Current Direct API: `1.1.0`
<!-- CURRENT_VERSION_SSOT_END -->

## Language Pack Architecture 2.0

English is embedded and always available as the canonical fallback. Additional language packs are downloaded once, validated, and stored locally for offline use. The language catalog is hosted independently on the `language-packs` branch.

Published packs: Hungarian 1.0.0 and German 1.0.0. French remains pending.

Firmware: 5.1.0-beta.3 (unchanged)
Direct API: 1.1.0 (unchanged)

## Validation and offline behavior

Remote language packs are validated for raw JSON duplicate keys, schema,
language code, application compatibility, maximum size, SHA-256, canonical
English key parity, placeholder parity, and non-empty values before atomic
installation. Installed packs remain available offline and failed updates
preserve the last-known-good copy.

## Publication state

- English: embedded canonical fallback
- Hungarian (`hu`): `1.0.0` published
- German (`de`): `1.0.0` published
- French (`fr`): pending real translation
