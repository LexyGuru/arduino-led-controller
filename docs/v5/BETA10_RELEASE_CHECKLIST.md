# Beta.10 release checklist

## Verziók
- [x] Alkalmazás `5.0.0-beta.10`.
- [x] Firmware `5.0.0-beta.7`.
- [x] Direct API `1.0.0`.
- [x] Beta prerelease.
- [x] `Neon Panel UI Stabilization`.

## Dokumentáció
- [x] `BETA10_RELEASE_TEST_ARCHITECTURE.md`.
- [x] `BETA10_INSTALLATION_GUIDE.md`.
- [x] `BETA10_RELEASE_NOTES.md`.
- [x] `BETA10_RELEASE_CHECKLIST.md`.

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
- [ ] `v5.0.0-beta.10` prerelease.
- [ ] `main` ág változatlan.
- [ ] Firmware source változatlan.
- [ ] `npm run check`.
- [ ] `npm run test:rust-lxc`.
- [ ] `bash scripts/validate-repository.sh`.
- [ ] `python3 scripts/check-versions.py`.
- [ ] `prerelease: true`.
- [ ] `make_latest: false`.

## Canonical Beta.10 verziócontract

- Alkalmazás: `5.0.0-beta.10`.
- Firmware: `5.0.0-beta.7`.
- Direct API: `1.0.0`.

## UNO R4 OTA + idő hardveres kapu

- [x] Beta.7 USB boot/API A/B teszt.
- [x] Renesas OTA: `-username arduino`.
- [x] Renesas OTA port: `65280`.
- [x] Renesas OTA endpoint: `/sketch`.
- [x] Renesas OTA apply/boot flag: `-b`.
- [x] Renesas OTA flash timeout: `-t 120`.
- [x] OTA utáni protected API recovery.
- [x] `timesynced=true`.
- [x] `timezoneId=Europe/Vienna`.
- [x] Aktuális DST offset hardveresen egyezik a Europe/Vienna referenciával.
- [x] Arduino epoch vs host: 0 s eltérés a méréskor.
- [x] 60 s uptime drift gate: PASS.
- [x] 60 s clockEpoch drift gate: PASS.
- [x] Matrix: nincs véletlen csillogás.
- [x] Wi-Fi/API normálisan visszaáll.
- [x] Kézi időellenőrzés: **nem tapasztalható** gyorsuló/lassuló óra vagy
      feltűnő időeltérés.
