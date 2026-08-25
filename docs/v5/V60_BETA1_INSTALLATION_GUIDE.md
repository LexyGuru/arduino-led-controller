# V60 Beta.1 Installation Guide

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.1`
Current firmware: `5.1.0-beta.3`
Current Direct API: `1.1.0`
<!-- CURRENT_VERSION_SSOT_END -->

Application: `6.0.0-beta.1`
Firmware: `5.1.0-beta.3` (unchanged)
Direct API: `1.1.0` (unchanged)

## Language Pack Architecture 2.0

English is embedded in the application and is always available offline. It is the
canonical translation key master and the permanent fallback.

Additional languages are discovered through the remote `language-packs` manifest.
A language pack is downloaded only when the user requests it. A successful pack is
stored locally and remains usable offline after application restart.

## Language-pack lifecycle

1. Open Settings → Language packs.
2. Use “Check for language-pack updates” to refresh the remote catalog.
3. Download an available language.
4. The application validates raw JSON duplicate keys, schema, language code,
   application compatibility, maximum size, SHA-256, canonical key parity,
   placeholder parity, and non-empty values.
5. The pack is staged and atomically committed. A failed install preserves the
   previous last-known-good pack.
6. Installed packs can be selected offline.
7. Update, reinstall, and fresh download require internet access.
8. Remove deletes only the selected downloaded pack; English cannot be removed.

## Offline behavior

Startup never requires the network. Installed packs and embedded English continue
to work without internet. The manifest cache uses a 24-hour TTL and stale cached
catalog data may still be shown offline. Network-required actions are explicitly
disabled and marked “Internet required”.

## Current publication state

Hungarian (`hu`) `1.0.0` and German (`de`) `1.0.0` are published on the
`language-packs` branch and can be downloaded by the application. French (`fr`)
remains pending until a complete real translation is available.

## Safety

Language packs are data only. They cannot alter firmware, Direct API behavior, or
application executable code. Firmware source is unchanged by this migration.
