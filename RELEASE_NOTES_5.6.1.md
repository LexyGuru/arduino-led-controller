# Arduino LED Controller 5.6.1

## Stable release identity

- Application: `5.6.1`
- Firmware: `5.0.0`
- Direct API: `1.0.0`
- Channel: Stable
- Branch: `main`

## Final V5.6.1 release

This Stable candidate consolidates the current `main` Stable-only release fixes with the fully validated Beta.6 P0/P1 line.

Validated before promotion:
- Application updater worked from Beta.2 directly to Beta.6.
- Beta.6 Application Beta release completed successfully.
- Linux APT mirror recovery runtime gate passed.
- Release asset contract runtime gate passed.
- P0 release architecture consolidation is preserved.
- Stable signed updater and Stable release workflow remain part of the merged release tree.
- Device Key remains the primary Direct API authentication contract.

## Firmware

Firmware `5.0.0` promotes the validated `5.0.0-beta.10` code line to Stable identity without behavioral feature changes.

## Release closure

After the Stable application and firmware workflows are both green, the V5 architecture/release stabilization cycle is closed. Future UI/UX work starts from the Stable `5.6.1` baseline.
