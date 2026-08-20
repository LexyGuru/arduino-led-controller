# Current development state — 5.7.0-beta.3

- Application: `5.7.0-beta.3` Beta
- Theme Engine: `2.0`
- Core UI: `3.0`
- Firmware: `5.0.0` Stable
- Direct API: `1.0.0`
- Base: final Stable 5.6.1 main

# Arduino LED Controller – Current Stable State

## Current versions
- Application: `5.6.1`
- Firmware Stable: `5.0.0`
- Direct API: `1.0.0`
- Stable branch: `main`
- Next development line starts only after this Stable release is fully published and verified.

## Final release status
- Beta.6 application release runtime gate passed.
- Application updater was verified from Beta.2 directly to Beta.6.
- P0 release architecture consolidation is preserved.
- P1 release asset contract is runtime verified.
- P1 Linux APT mirror recovery is runtime verified.
- Current MAIN Stable-only fixes and current NEXT Beta.6 fixes are consolidated into this candidate.
- macOS OTA protected contract remains unchanged except for firmware release identity.
- Application Stable and Firmware Stable remain separate publication workflows.

## Stable promotion target
- Application GitHub release: `v5.6.1`
- Stable updater alias: `updater-stable`
- Firmware Stable release: `5.0.0`

After both Stable workflows pass and runtime installation is verified, the current
V5 architecture/release stabilization cycle is complete. UI/UX work can then start
from this Stable baseline.
