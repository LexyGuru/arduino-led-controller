# 5.6.1-beta.1 release checklist

- [ ] VERSION and package versions are `5.6.1-beta.1`
- [ ] app-beta-release.yml EXPECTED_VERSION is `5.6.1-beta.1`
- [ ] beta-release.yml legacy EXPECTED_VERSION is `5.6.1-beta.1`
- [ ] release-versions.json application is `5.6.1-beta.1`
- [ ] firmware remains `5.0.0-beta.10`
- [ ] Update System 2.0 channel identity contract passes
- [ ] Theme Engine 2.0 compatibility contract passes
- [ ] LXC shared frontend version contract passes
- [ ] immutable macOS OTA contract passes
- [ ] Stable main is not modified

## V619 live channel runtime correction

The running application build identity and the selected update channel are independent.

Expected behavior:
- `5.6.1-beta.1` always reports its running application build as **BETA**.
- Selecting Application Update Channel = **STABLE** immediately changes the application catalog/check target to Stable.
- Selecting Firmware Update Channel = **STABLE** immediately changes the firmware catalog heading and query to Stable.
- Stable firmware view must never show Beta firmware artifacts.
- Beta firmware view must never show Stable firmware artifacts.
- Until firmware `5.0.0` is actually promoted/published, the Stable firmware catalog may correctly be empty.
- The loading screen uses warning icons only for actual degraded/error states; ordinary background continuation is informational.

Manual pre-release QA:
1. Start `5.6.1-beta.1`.
2. Switch app channel Beta -> Stable -> Beta and verify the selected channel changes immediately.
3. Switch firmware channel Beta -> Stable and verify the heading becomes `Stable visszaállítási verziók`.
4. Confirm no `*-beta.*` firmware appears in Stable mode.
5. Switch back to Beta and verify the Beta catalog returns.
6. Restart the app after saving and repeat the channel checks.
7. Do not start a GitHub release until these UI checks pass.

## V621 startup diagnostics and global update visibility

- Startup warnings that represent real degraded/error states persist on the Dashboard after the loading screen closes.
- A recovered macOS first-run credential/Keychain bootstrap header error is not shown as the latest system error once the connection is healthy.
- The macOS exception does not apply while the connection remains unhealthy and does not apply to Windows, Linux, LXC, iOS/iPadOS, or Android.
- When an application update is available, a persistent sidebar update card shows the target version and opens Settings.
- The existing Settings navigation dot remains as a secondary indicator.

Manual QA:
1. Verify a real startup warning remains visible on Dashboard.
2. Verify normal startup produces no startup issue card.
3. On macOS, authorize Keychain access and verify the recovered bootstrap credential message is not shown as the latest error.
4. Verify a persistent real connection error still appears.
5. Simulate/observe an available app update and verify the sidebar update card is visible from every desktop page.

## V623 canonical workflow architecture

Canonical GitHub Actions set:
- app-build.yml — application CI/build engine
- app-staging-build.yml — non-release staging artifacts
- app-beta-release.yml — explicit Beta application publisher
- app-stable-release.yml — explicit Stable application publisher
- firmware-build.yml — shared UNO R4 WiFi compile engine
- firmware-beta-release.yml — Beta firmware catalog publisher using firmware-build.yml
- firmware-stable-release.yml — Stable firmware catalog publisher using firmware-build.yml

Removed legacy/overlapping workflows:
- beta-release.yml
- tauri-desktop.yml
- tauri-artifact-build.yml (renamed to app-staging-build.yml)

Release workflows remain workflow_dispatch-only. No release is dispatched by this cleanup.
