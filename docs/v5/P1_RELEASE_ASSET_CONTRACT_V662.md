# P1 Release Asset Contract — V662

Both application release channels consumed `process.env.VERIFIED_VERSION` without defining it in the asset verification step.

V662 wires the validated application version explicitly and makes all asset cardinality checks diagnostic.

Application: `5.6.1-beta.5`. Firmware: `5.0.0-beta.10` unchanged.
