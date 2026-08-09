# Beta.9 release checklist

## Verziók
- [x] Alkalmazás `5.0.0-beta.9`.
- [x] Firmware `5.0.0-beta.6`.
- [x] Direct API `1.0.0`.
- [x] Beta prerelease.
- [x] `Neon Panel UI Stabilization`.

## Dokumentáció
- [x] `BETA9_RELEASE_TEST_ARCHITECTURE.md`.
- [x] `BETA9_INSTALLATION_GUIDE.md`.
- [x] `BETA9_RELEASE_NOTES.md`.
- [x] `BETA9_RELEASE_CHECKLIST.md`.

## Platformartifactok és smoke tesztek
- [ ] Windows x86_64.
- [ ] macOS Apple Silicon.
- [ ] macOS Intel.
- [ ] Linux x86_64.
- [ ] Android.
- [ ] iPhone és iPad.
- [ ] LXC / Debian szerver.
- [ ] Arduino UNO R4 WiFi firmware – dedikált firmware workflow.
- [ ] Teljes alkalmazási staging.

## Kötelező kapuk
- [ ] `npm test`.
- [ ] repository validation.
- [ ] frontend build.
- [ ] Rust check/test.
- [ ] supply-chain evidence.
- [ ] `v5.0.0-beta.9` prerelease.
- [ ] `main` ág változatlan.
- [ ] Firmware source változatlan.
- [ ] `npm run check`.
- [ ] `npm run test:rust-lxc`.
- [ ] `bash scripts/validate-repository.sh`.
- [ ] `python3 scripts/check-versions.py`.
- [ ] `prerelease: true`.
- [ ] `make_latest: false`.

## Canonical Beta.9 verziócontract

- Alkalmazás: `5.0.0-beta.9`.
- Firmware: `5.0.0-beta.6`.
- Direct API: `1.0.0`.
