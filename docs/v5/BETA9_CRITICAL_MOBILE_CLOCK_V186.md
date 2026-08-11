# Beta.9 critical mobile + clock hardening V186

## Scope

This consolidation builds on the already staged/local V150/V158 work instead
of replacing it.

### Firmware clock and scheduler

- keeps the local-epoch and force-reconciliation scheduler hotfix;
- reduces successful NTP refresh cadence from 6 hours to 10 minutes;
- every successful NTP refresh remains an authoritative clock correction;
- scheduler reconciliation is required after a successful clock refresh;
- existing Vienna CET/CEST and reboot/last-effective schedule contracts remain.

### Mobile credentials

- keeps the native iOS Protected Data credential backend;
- keeps the Android Keystore/encrypted native credential backend;
- does not move secrets into browser localStorage;
- startup restore remains part of the mobile credential contract.

### Shared mobile theme

The mobile app continues to use the same shared ThemeProvider and
AppearanceSettings implementation as desktop/LXC. V186 additionally guarantees
that the Settings navigation item cannot be clipped away by the narrow-screen
navigation layout.

### Regression policy

The existing scheduler and mobile credential/theme tests are strengthened and a
new umbrella contract is wired into the canonical npm test chain.

No commit or push is performed by the test package.
