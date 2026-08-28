# Arduino LED Controller 6.0.0-beta.8

Application: **6.0.0-beta.8**
Firmware: **5.1.0-beta.4**
Direct API: **1.2.0**

## OTA exact-version lookup hotfix

- Fixes desktop/Tauri OTA installation when a specific Beta firmware version is selected.
- Exact-version lookup now uses the dedicated channel-aware firmware release surface instead of the generic GitHub top-30 release list.
- Preserves Beta/Stable channel isolation.
- Adds permanent regression coverage for exact requested-version lookup.
- Migrates older V615/V695 contracts to the dedicated firmware-release architecture.

## Runtime verification

Verified with a real OTA update from `5.1.0-beta.3` to `5.1.0-beta.4`:
- dedicated GitHub firmware lookup succeeded;
- BIN + SHA-256 verification succeeded;
- 113288 bytes transferred with the built-in Rust OTA engine;
- bootGeneration changed 17 -> 18;
- Direct API confirmed `5.1.0-beta.4`;
- schedule persistence verification succeeded;
- final state: `OTA2_SUCCESS`.

Firmware and Direct API versions are unchanged from Beta.7.

## Language Pack Architecture 2.1

Catalog: 2.1.0
Total languages: 15
Downloadable: 14

- Hungarian (`hu`): 1.1.0
- German (`de`): 1.1.0
- French (`fr`): 1.0.0
- Spanish (`es`): 1.0.0
- Italian (`it`): 1.0.0
- Portuguese (`pt`): 1.0.0
- Ukrainian (`uk`): 1.0.0
- Polish (`pl`): 1.0.0
- Russian (`ru`): 1.0.0
- Czech (`cs`): 1.0.0
- Romanian (`ro`): 1.0.0
- Simplified Chinese (`zh-CN`): 1.0.0
- Japanese (`ja`): 1.0.0
- Korean (`ko`): 1.0.0
