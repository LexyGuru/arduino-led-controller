# V60 Beta.1 Release Checklist

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.1`
Current firmware: `5.1.0-beta.3`
Current Direct API: `1.1.0`
<!-- CURRENT_VERSION_SSOT_END -->

## Application / release SSOT
- [ ] Application is `6.0.0-beta.1`.
- [ ] Firmware remains `5.1.0-beta.3`.
- [ ] Direct API remains `1.1.0`.
- [ ] `next/v5-rearchitecture`, `main`, and `language-packs` remote guards pass.

## Canonical English
- [ ] English is the only embedded runtime dictionary.
- [ ] Whole-app visible UI audit is zero-or-allowlisted.
- [ ] All downloadable packs have exact canonical EN key parity.
- [ ] Placeholder parity passes for every key.

## Runtime hardening
- [ ] Manifest and pack raw JSON duplicate keys are rejected before `JSON.parse`.
- [ ] SHA-256 validation passes.
- [ ] Maximum pack size is enforced.
- [ ] Min/max application compatibility is enforced.
- [ ] Atomic staging / last-known-good rollback passes.
- [ ] Manifest cache TTL is 24 hours.
- [ ] Installed packs work offline.
- [ ] Central locale resolver has no page-local duplicate implementation.

## Settings UX
- [ ] Check-updates action is visible.
- [ ] Download is disabled offline and shows Internet required.
- [ ] Update is disabled offline and shows Internet required.
- [ ] Reinstall is available for installed downloadable packs.
- [ ] Remove works without network.
- [ ] English cannot be removed.

## Publication
- [ ] HU publication artifact passes SHA/key/placeholder/schema/app-range checks.
- [ ] DE publication artifact passes SHA/key/placeholder/schema/app-range checks.
- [ ] FR stays pending unless a complete real translation exists.
- [ ] No language-pack branch push occurs before explicit manual approval.

## Manual smoke test before publication
- [ ] Launch in English.
- [ ] Download HU online and switch to HU.
- [ ] Restart offline and verify HU still works.
- [ ] Switch back to English offline.
- [ ] Remove HU, reconnect, reinstall HU.
- [ ] Repeat core flow with DE.
- [ ] Verify an updated pack version produces Update available.
