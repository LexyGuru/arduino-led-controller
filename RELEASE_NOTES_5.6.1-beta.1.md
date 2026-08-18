# Arduino LED Controller 5.6.1-beta.1

## Release identity

- Application: `5.6.1-beta.1`
- Branch: `next/v5-rearchitecture`
- Channel: Beta
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Stable `main` is not modified by this Beta candidate.

## Channel identity

This release separates the running build identity from the selected update channel.
A Beta build can intentionally monitor the Stable channel, and the UI reports both values explicitly.

## Update System 2.0

Application and firmware update channels remain independent.
The GitHub firmware catalog shows only the selected Stable or Beta channel.

## Theme Engine 2.0 compatibility

Theme Engine 2.0 compatibility assets and migration behavior remain preserved under the current theme implementation.

## Firmware and OTA

The Beta firmware remains `5.0.0-beta.10`.
The immutable macOS OTA Beta.7 contract is preserved.

## LXC

The shared LXC/web frontend remains version-aligned with the desktop application.
