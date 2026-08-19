# Application Release Versioning Policy

## Mandatory rule

Every GitHub publication of application source is a new application version.

No application commit/push intended for publication may reuse the currently published application version, including refactors, tests, workflow changes or documentation changes.

A publication requires, in the same release preparation:
- application version bump;
- synchronization of every canonical version surface;
- root release notes;
- matching `docs/v5` release notes, installation guide and release checklist;
- README current-release update;
- `docs/v5/CURRENT_STATE.md` update;
- CHANGELOG entry;
- full current/regression/repository validation before commit/push.

Firmware has an independent version. It is bumped only when firmware source or firmware release behavior changes.

Commit/push happens only after the user has locally tested the release-prep package and explicitly approved publication.

## Stable promotion

A Stable promotion is a source publication and must carry the final Stable application
identity across VERSION, package/Cargo/Tauri/OpenAPI surfaces, release metadata and
mandatory release documentation. Firmware source identity changes only when firmware
is intentionally promoted or otherwise changed.
