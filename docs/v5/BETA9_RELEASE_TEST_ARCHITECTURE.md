# Beta.9 current vs historical release test architecture

## Current release

Application: `5.0.0-beta.9`
Firmware: `5.0.0-beta.6`

The normal `npm test` chain protects the current application regression and the
canonical Beta.9 release surface, including current deploy installers and staging env metadata.

Current release contracts use preserve-first migration: the latest complete historical installation guide, release notes and release checklist are retained structurally and only current-generation facts are migrated.

Current release contracts include:

- `.github/workflows/beta-release.yml`
- `scripts/test-beta-release-workflow.js`
- `scripts/test-beta-installation-assets.js`
- `scripts/test-v5-documentation-status.js`
- `scripts/test-beta9-documentation-release-readiness.js`
- `scripts/test-beta9-release-surface-sweep.js`
- every current `deploy/...` asset directly referenced by `test-beta-installation-assets.js` (shell, env, systemd unit, templates)

## Historical release snapshots

Beta.1–Beta.8 tests that inspect a historical release workflow or historical
release-assets are preserved but separated into:

`npm run test:release-history`

They are not rewritten to Beta.9 because their purpose is historical verification.
They must not force the current Beta.9 workflow back to an older release state.

## Release gate

The Beta.9 GitHub workflow runs the current `npm test` suite and explicit current
distribution contracts before publishing the prerelease.
