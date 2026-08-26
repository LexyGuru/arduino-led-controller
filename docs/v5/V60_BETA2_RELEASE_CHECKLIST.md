# V60 Beta.2 Release Checklist

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.2`
Current firmware: `5.1.0-beta.3`
Current Direct API: `1.1.0`
<!-- CURRENT_VERSION_SSOT_END -->

## Application / release SSOT
- [x] Application is `6.0.0-beta.2`.
- [x] Firmware remains `5.1.0-beta.3`.
- [x] Direct API remains `1.1.0`.
- [x] `next/v5-rearchitecture`, `main`, and `language-packs` remote guards pass.

## Canonical English
- [x] English is the only embedded runtime dictionary.
- [x] Whole-app visible UI audit is zero-or-allowlisted.
- [x] All downloadable packs have exact canonical EN key parity.
- [x] Placeholder parity passes for every key.

## Runtime hardening
- [x] Manifest and pack raw JSON duplicate keys are rejected before `JSON.parse`.
- [x] SHA-256 validation passes.
- [x] Maximum pack size is enforced.
- [x] Min/max application compatibility is enforced.
- [x] Atomic staging / last-known-good rollback passes.
- [x] Manifest cache TTL is 24 hours.
- [x] Installed packs work offline.
- [x] Central locale resolver has no page-local duplicate implementation.

## Settings UX
- [x] Check-updates action is visible.
- [x] Download is disabled offline and shows Internet required.
- [x] Update is disabled offline and shows Internet required.
- [x] Reinstall is available for installed downloadable packs.
- [x] Remove works without network.
- [x] English cannot be removed.

## Publication
- [x] HU publication artifact passes SHA/key/placeholder/schema/app-range checks.
- [x] DE publication artifact passes SHA/key/placeholder/schema/app-range checks.
- [x] FR stays pending unless a complete real translation exists.
- [x] Language-pack branch publication occurred after explicit manual approval.

## Manual smoke test after publication
- [ ] Launch in English.
- [ ] Download HU online and switch to HU.
- [ ] Restart offline and verify HU still works.
- [ ] Switch back to English offline.
- [ ] Remove HU, reconnect, reinstall HU.
- [ ] Repeat core flow with DE.
- [ ] Verify an updated pack version produces Update available.
