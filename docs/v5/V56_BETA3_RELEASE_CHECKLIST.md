# Arduino LED Controller 5.6.1-beta.3 — release checklist

## Version identity

- [ ] `release-versions.json.application` is `5.6.1-beta.3`
- [ ] `VERSION` and every canonical package/Tauri/Cargo/LXC/OpenAPI surface are `5.6.1-beta.3`
- [ ] branch is `next/v5-rearchitecture`, channel is Beta
- [ ] firmware remains `5.0.0-beta.10`
- [ ] Direct API remains `1.0.0`
- [ ] firmware source hash is unchanged
- [ ] `main` remains unchanged

## Mandatory documentation

- [ ] `RELEASE_NOTES_5.6.1-beta.3.md`
- [ ] `docs/v5/V56_BETA3_RELEASE_NOTES.md`
- [ ] `docs/v5/V56_BETA3_INSTALLATION_GUIDE.md`
- [ ] `docs/v5/V56_BETA3_RELEASE_CHECKLIST.md`
- [ ] README current release points to Beta.3
- [ ] `docs/v5/CURRENT_STATE.md` points to Beta.3
- [ ] CHANGELOG starts with `5.6.1-beta.3`
- [ ] P0 architecture documentation records Beta.3 release integration
- [ ] release versioning policy is present

## P0 architecture contracts

- [ ] Stable Device Key fix is forward-synced without Stable application identity
- [ ] Beta workflow version/branch/channel are sourced from `release-versions.json`
- [ ] current tests are channel-aware/version-driven
- [ ] historical tests remain outside default regression
- [ ] V623 workflow cleanup validates SSOT semantics
- [ ] P0 test contains no `5.6.1-beta.2` application-version hardcode

## Automated gates

- [ ] `python3 scripts/check-versions.py`
- [ ] `npm run test:architecture-preflight-v2`
- [ ] `npm run test:architecture-v2`
- [ ] `npm run test:release-version-policy`
- [ ] `npm test`
- [ ] `npm run validate`
- [ ] desktop frontend build
- [ ] Rust `cargo check --locked`
- [ ] Rust `cargo test --locked`
- [ ] `git diff --check`

## Manual Beta.3 runtime QA

- [ ] running build reports `5.6.1-beta.3` / Beta
- [ ] application update channel switches catalog only
- [ ] firmware Stable/Beta catalogs remain isolated
- [ ] `5.0.0-beta.10` is available in Beta firmware catalog
- [ ] local and remote/DDNS Direct API works with `X-Device-Key`
- [ ] startup diagnostics behave correctly
- [ ] Sidebar/Update Center shows newer application releases
- [ ] macOS OTA frozen contract passes
- [ ] shared desktop/mobile/LXC runtime smoke test passes

## Publication

- [ ] only after this TEST package passes, create a separate publish package
- [ ] publication commit/push carries `5.6.1-beta.3` and all matching documentation
- [ ] run `Application Beta release` from `next/v5-rearchitecture`
- [ ] GitHub release is prerelease and not latest Stable
