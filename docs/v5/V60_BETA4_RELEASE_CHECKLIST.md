# V60 Beta.4 Release Checklist

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.4`
Current firmware: `5.1.0-beta.3`
Current Direct API: `1.1.0`
<!-- CURRENT_VERSION_SSOT_END -->

## Application
- [x] Application version is `6.0.0-beta.4`.
- [x] Firmware remains `5.1.0-beta.3`.
- [x] Direct API remains `1.1.0`.
- [x] Searchable, region-filtered responsive language UI is enabled.
- [x] `zh-CN` BCP-47 language-code support is enabled.
- [x] Desktop and LXC/LXD share the same language runtime.

## Language Pack 2.1
- [x] English remains the embedded canonical fallback.
- [x] 14 downloadable languages are represented by real locale files.
- [x] Every published pack has exact canonical key parity.
- [x] Every published pack has placeholder parity.
- [x] Every published pack has SHA-256 metadata.
- [x] Hungarian and German are pack `1.1.0`.
- [x] New language packs start at `1.0.0`.

## Safety
- [x] Full npm regression passes.
- [x] Desktop production build passes.
- [x] Rust `cargo check` passes.
- [x] Firmware source is unchanged.
- [x] `main` is unchanged.
