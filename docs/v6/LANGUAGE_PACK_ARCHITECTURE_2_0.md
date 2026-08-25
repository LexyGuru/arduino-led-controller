# Language Pack Architecture 2.0

## Canonical model

`en.json` is the single embedded canonical master. Every visible translatable UI
surface resolves through an i18n key. Downloadable language packs must match the
canonical English keyset exactly.

## Remote catalog and persistence

The manifest lives independently on the `language-packs` branch. Manifest schema is
version 1. Architecture version 2.0 and manifest schema version are independent.

Downloaded packs are stored locally. Startup is offline-safe; embedded English and
last-known-good installed packs do not depend on GitHub availability.

## Validation pipeline

Before a remote manifest or pack payload is trusted:
- raw JSON is checked for duplicate object keys, including escaped-equivalent keys;
- manifest / pack schema and language metadata are validated;
- pack size is limited to 1 MiB;
- SHA-256 is checked over the exact downloaded bytes;
- min/max application compatibility is enforced;
- keyset must exactly match embedded English;
- placeholders must match per key;
- empty translation values are rejected;
- pack install uses staging + verification + atomic commit;
- previous last-known-good data is restored on failure.

## Locale handling

Locale resolution is centralized in the i18n layer. Known languages may receive a
preferred regional locale while any valid BCP-47 language tag is canonicalized
dynamically. Page-local fixed language unions are not permitted.

## UX states

The Settings language-pack manager exposes Built-in, Download, Installed, Current,
Update available, Update, Reinstall, Remove, Pending, Check updates, Working, and
Internet required states.

## Independent publishing

Language packs have their own versions and can be updated without an application
release. Adding a new language to the manifest does not require rebuilding the app.

Current published packs: HU 1.0.0 and DE 1.0.0. FR is pending real translation.
