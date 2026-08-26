# Arduino LED Controller 6.0.0-beta.2

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.2`
Current firmware: `5.1.0-beta.3`
Current Direct API: `1.1.0`
<!-- CURRENT_VERSION_SSOT_END -->

## Language Pack Architecture 2.0

English is embedded and always available as the canonical fallback. Additional
language packs are downloaded, validated, and stored locally for offline use.

## Beta.2 hotfix

The desktop Tauri CSP now permits the canonical language-pack origin through
`connect-src 'self' https://raw.githubusercontent.com;`. This fixes the released
Beta.1 `Language pack error: Load failed` runtime issue.

## Publication state

- English: embedded canonical fallback
- Hungarian (`hu`): `1.0.0` published
- German (`de`): `1.0.0` published
- French (`fr`): pending real translation

Firmware: `5.1.0-beta.3` (unchanged)
Direct API: `1.1.0` (unchanged)
