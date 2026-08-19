# Arduino LED Controller 5.6.1-beta.3 — installation guide

## Release identity

- Application: `5.6.1-beta.3` (Beta)
- Firmware Beta: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Source branch: `next/v5-rearchitecture`

## Install the Beta application

Use only assets attached to the `5.6.1-beta.3` GitHub prerelease.

Supported application targets:
- macOS Apple Silicon
- macOS Intel
- Windows x86_64
- Linux x86_64
- Android
- unsigned iOS/iPadOS artifact where applicable
- Debian 13 Rust LXC/shared web runtime

## Update behavior

Application Update Channel selects the future update catalog; it does not rewrite installed build identity.
A running `5.6.1-beta.3` binary remains a Beta build while checking either Beta or Stable catalog data.

Because every GitHub application publication receives a new version, an existing Beta installation can detect `5.6.1-beta.3` as an update when its installed version is older.

## Firmware channel

Firmware remains `5.0.0-beta.10`.
Stable mode must never fall back to Beta firmware artifacts. Beta mode may list `5.0.0-beta.10`.

## Device Key / Direct API

- `X-Device-Key` is the primary private API authentication header.
- Query-string Device Key fallback is disabled.
- Valid printable-ASCII Device Keys remain accepted according to the shared credential/transport contract.
- Verify both local HTTP and remote HTTPS/DDNS configured targets.

## Firmware OTA

Firmware source is unchanged in Beta.3.
The frozen macOS OTA production contract remains required: native uploader first, Terminal fallback, LAN targeting and post-flash Direct API verification.

## Post-install verification

1. Confirm application version `5.6.1-beta.3` and Beta build identity.
2. Confirm Update Center channel switching does not change installed identity.
3. Confirm firmware channel isolation.
4. Confirm `5.0.0-beta.10` appears only in Beta firmware catalog.
5. Confirm local and remote Direct API status works with `X-Device-Key`.
6. Restart and verify saved settings.
7. Verify startup has no false warning and real errors remain visible.
8. Verify desktop/mobile/LXC shared runtime identity.
9. Verify macOS OTA before release acceptance.

## Release separation

Application and firmware releases are separate manual workflows.
Publishing `5.6.1-beta.3` does not publish firmware and does not modify `main`.
