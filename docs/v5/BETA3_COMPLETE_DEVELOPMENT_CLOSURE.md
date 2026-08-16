# Beta.3 Complete Development Closure

Canonical Beta.3 implementation commit: `f9aeac3a2436823bb834f95ae6fe6a89089facf2`.

## Historical identity

Beta.3 was functionally finalized and published by:

`feat(beta3): finalize OTA2 and redesign foundation`

The implementation commit was `f9aeac3a2436823bb834f95ae6fe6a89089facf2`.

The application version sources were not advanced at that time and remained
`5.5.1-beta.2`. That was a release-bookkeeping defect, not a functional
rollback. Beta.4 closes this historical debt while adopting the current
`5.5.1-beta.4` application identity.

## Beta.3 functional scope

### Update Center
- application and firmware update relation model
- Stable/Beta channel awareness
- installed vs available version comparison
- downgrade protection
- Arduino / OTA / backup readiness

### OTA2 pipeline
- CHECK
- DOWNLOAD
- VERIFY
- BACKUP
- CONNECT
- UPLOAD
- reboot / POST-VERIFY

### OTA2 integrity and safety
- firmware artifact URL handling
- SHA-256 verification
- Arduino preflight
- native Rust OTA bridge
- post-upload verification
- Boot ID handling
- bounded read retry
- no write-stage retry
- single-flight execution
- automatic schedule backup
- backup before native install
- schedule preservation and recovery
- diagnostic secret scrubbing
- safe cancellation before critical stages
- critical-stage cancellation lock
- operation progress / blockers / result codes / history
- readiness model

### Desktop architecture
- non-React i18n runtime split
- React-boundary translation layer preserved
- Vite Fast Refresh compatibility
- regression consolidation

## Beta.4 handoff

Beta.4 must preserve all Beta.3 OTA2, update-center, backup, recovery, Direct API,
i18n-runtime and firmware-integrity behavior. Beta.4 is a UI/UX modernization
and release-readiness continuation, not a replacement of the Beta.3 functional
foundation.

## Version closure

The historical Beta.3 implementation remains attributed to `f9aeac3a2436823bb834f95ae6fe6a89089facf2`.
The current development identity is advanced directly to `5.5.1-beta.4` because
the repository is already in Beta.4 development. No artificial intermediate
Beta.3 build is produced.
