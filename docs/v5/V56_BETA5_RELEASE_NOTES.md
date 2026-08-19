# Arduino LED Controller 5.6.1-beta.5

## Release identity

- Application: `5.6.1-beta.5`
- Channel: Beta
- Branch: `next/v5-rearchitecture`
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`

## P1 — Release Asset Contract

Beta.5 continues P1 after the Beta.4 runner-resilience runtime validation succeeded across the release gate and every platform build.

The Beta.4 publication failed only in the final GitHub prerelease job at `Verify expected release asset classes`.

### Root cause

Both Beta and Stable application release workflows compared `release-versions.json.application` with `process.env.VERIFIED_VERSION`, but the asset-verification step did not define `VERIFIED_VERSION`.

### Beta.5 fix

- Wires `VERIFIED_VERSION` from `needs.validate.outputs.version` into Beta asset verification.
- Applies the same fix to Stable before Stable promotion can hit the same failure.
- Replaces silent file-count assertions with named diagnostic asset-class checks.
- On mismatch, logs expected count, actual count, glob pattern and the complete asset inventory.
- Preserves application-only release rules and exact artifact classes.
- Adds a semantic Beta/Stable parity regression test.

Firmware source remains unchanged.
