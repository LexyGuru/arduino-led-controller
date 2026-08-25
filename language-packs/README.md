# Arduino LED Controller Language Packs

This branch is the independent hosting source for downloadable Arduino LED Controller language packs.

## Runtime model

- English (`en`) is embedded in every application build and is the canonical fallback.
- Additional languages are downloaded only when the user chooses them.
- Downloaded packs are cached locally and remain available offline.
- A pack is downloaded again only when the catalog reports a newer pack version or the user requests reinstall/update.
- Missing keys always fall back to embedded English.
- Language packs can be expanded and corrected without publishing a new application version.

## Structure

```text
language-packs/
├── manifest.json
├── schemas/
│   └── locale-v1.schema.json
├── hu/
│   ├── locale.json
│   └── changelog.json
├── de/
│   ├── locale.json
│   └── changelog.json
└── fr/
    ├── locale.json
    └── changelog.json
```

Only validated, complete packs are marked `available` in `manifest.json`. Placeholder translations must never be published as completed packs.

## Validation contract

Every published pack must pass:

- valid JSON
- supported schema version
- exact language-code match
- canonical-key validation against embedded English
- placeholder parity (`{{name}}`, `{{version}}`, etc.)
- no unknown or duplicate keys
- no empty translation values
- SHA-256 verification against the manifest
- application compatibility check

## Versioning

Application and language-pack versions are independent. Example:

- Application: `6.0.0-beta.1`
- Hungarian pack: `1.0.3`
- German pack: `1.0.2`
- French pack: `1.1.0`

A translation update therefore does not require an application release.
