# macOS OTA Beta.7 Immutable Contract

Canonical OTA source commit: `32fc43d786580b82f5700ca7453f4b73e77726d5`.

The macOS OTA implementation released in `5.5.1-beta.7` is frozen.

Do not modify, add, remove, reorder, simplify, refactor, replace, or extend its protected behavior.

Protected behavior:
- `auto` / `bundled` starts with native Rust OTA;
- zero-byte native local-connect failure triggers automatic Terminal fallback;
- Terminal runs `arduinoOTA`;
- Terminal fallback uses fresh Arduino Direct API `ipAddress:otaPort`;
- release firmware OTA and external `.bin` OTA share the same fallback;
- API confirmation runs only after successful transport completion;
- Direct API confirmation remains maximum 180 seconds;
- reboot / bootGeneration / Boot ID / firmware-version confirmation remains intact;
- schedule persistence validation remains intact.

Enforcement:
- protected functions are SHA-256 locked;
- semantic/state-machine markers are checked;
- Test Architecture V2 includes this as a permanent regression;
- `beta-release.yml` runs the immutable contract explicitly.

The baseline must not be changed by unrelated development, cleanup, refactoring,
Theme Engine work, UI work, release bumps, or platform-independent features.
