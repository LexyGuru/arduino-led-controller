# V5.5 Beta.3 Installation Guide — 5.5.0-beta.3

Application: `5.5.0-beta.3`
Firmware: `5.0.0-beta.8`
Direct API: `1.0.0`

## Release platforms

- Windows x86_64
- macOS Apple Silicon
- macOS Intel
- Linux x86_64
- Android
- iPhone és iPad
- Debian 13 / Proxmox LXC

The Arduino UNO R4 WiFi firmware remains a separately versioned prerelease artifact.

## Windows x86_64

Use the versioned NSIS installer. Windows SmartScreen may show a warning for a Beta build.

## macOS Apple Silicon

Use the Apple Silicon DMG. The Beta build nincs notarizálva unless a dedicated signed/notarized build is published.

## macOS Intel

Use the Intel DMG. The Beta build nincs notarizálva unless a dedicated signed/notarized build is published.

## Linux x86_64

Use the AppImage or `.deb` artifact.

## Android

The release workflow publishes signed packages when signing secrets are available; otherwise the debug/unsigned state is explicit in artifact names.

## iPhone és iPad

The workflow publishes an `unsigned.ipa`; it nincs aláírva and requires an external signing/sideloading workflow.

## Debian 13 / Proxmox LXC

```bash
bash -c "$(curl -fsSL 'https://raw.githubusercontent.com/LexyGuru/arduino-led-controller/next/v5-rearchitecture/deploy/proxmox/install-proxmox-lxc.sh')"
```

Default UI/API endpoint:

```text
http://LXC_IP:3000/
```

Health/status endpoints:

```text
/health/live
/health/ready
/api/v1/status
```

The shared React frontend keeps native Tauri APIs behind the V5.5 browser runtime isolation guard.

## Arduino UNO R4 WiFi firmware

Paired firmware: `5.0.0-beta.8`. Firmware release remains separate from the application prerelease.

## Integrity and supply-chain evidence

- `SHA256SUMS`
- `RELEASE-MANIFEST.json`
- `SBOM.cdx.json`
- `PROVENANCE.json`
- `SECRET-SCAN.json`
- `release-versions.json`

## Staging and safety

The release gate uses isolated staging. The production Arduino target `10.0.0.123` is blocked by default unless `ALLOW_PRODUCTION_ARDUINO=1` is explicitly supplied. The Beta workflow does not modify `main`.

## Beta.3 kiegészítés

- Multi-platform persistent diagnostics logging és redaction/rotation contract.
- Firmware 5.0.0-beta.8 bootGeneration-alapú OTA megerősítés.
- Same-version reinstall helyes klasszifikáció.
- A `main` stabil ág nem módosul / not modified.
- Theme Engine 2.0, App Update Center 1.0 és LXC támogatás megmarad.
