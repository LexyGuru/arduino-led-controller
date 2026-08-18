# Beta.3 Update Center shared refresh orchestration

V498 adds the common Check both orchestration engine.

Logical sources:
- application
- firmware catalog
- device / Arduino
- OTA readiness

Application, device and OTA share one underlying status refresh. Firmware catalog
remains independent. The existing Update Center core keeps per-source status,
partial failure isolation, errors and last-good data.

V498 proves the orchestration engine only. FirmwarePage JSX binding is the next
incremental step after this contract passes.

No version bump. Firmware source unchanged. No commit/push.
