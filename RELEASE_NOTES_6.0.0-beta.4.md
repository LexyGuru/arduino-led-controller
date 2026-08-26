# V6.0 Beta.4 Release Notes

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.4`
Current firmware: `5.1.0-beta.3`
Current Direct API: `1.1.0`
<!-- CURRENT_VERSION_SSOT_END -->

## Language Pack Architecture 2.1

Beta.4 expands the language system to 15 target languages while keeping English
embedded as the canonical offline fallback.

### Catalog

- English (`en`) — embedded
- German (`de`) — downloadable
- French (`fr`) — downloadable
- Spanish (`es`) — downloadable
- Italian (`it`) — downloadable
- Portuguese (`pt`) — downloadable
- Hungarian (`hu`) — downloadable
- Ukrainian (`uk`) — downloadable
- Polish (`pl`) — downloadable
- Russian (`ru`) — downloadable
- Czech (`cs`) — downloadable
- Romanian (`ro`) — downloadable
- Simplified Chinese (`zh-CN`) — downloadable
- Japanese (`ja`) — downloadable
- Korean (`ko`) — downloadable

The language browser now provides search, regional filters and a responsive card
grid. BCP-47 region language identifiers such as `zh-CN` are supported.

All downloadable packs are validated for schema, complete canonical English key
parity, placeholder parity, non-empty values, size and SHA-256 before install.

Hungarian and German move to pack `1.1.0`. Newly published languages start at
pack `1.0.0`.

Firmware remains `5.1.0-beta.3`.
Direct API remains `1.1.0`.

<!-- LANGUAGE_PACK_2_1_BEGIN -->
## Language Pack Architecture 2.1

Language Pack catalog: 2.1.0. English is embedded; 14 additional downloadable language packs are available.

| Language | Pack |
| --- | --- |
| English | embedded |
| Hungarian | 1.1.0 |
| German | 1.1.0 |
| French | 1.0.0 |
| Spanish | 1.0.0 |
| Italian | 1.0.0 |
| Portuguese | 1.0.0 |
| Ukrainian | 1.0.0 |
| Polish | 1.0.0 |
| Russian | 1.0.0 |
| Czech | 1.0.0 |
| Romanian | 1.0.0 |
| Simplified Chinese | 1.0.0 |
| Japanese | 1.0.0 |
| Korean | 1.0.0 |
<!-- LANGUAGE_PACK_2_1_END -->

## Beta.4 language and diagnostics fixes

- Factory profile title follows the active language; legacy "Arduino vezérlő" factory values are migrated.
- Language-pack freshness is SHA-aware and stale active packs auto-repair.
- Scheduler peaks below 20 ms are telemetry only; 20–50 ms warns; 50 ms+ is critical.
- Firmware stays 5.1.0-beta.3; Direct API stays 1.1.0.
