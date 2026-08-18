# V5.5 Beta.4 Installation Guide

Application version: `5.5.1-beta.4`
Firmware version: `5.0.0-beta.9`

## Desktop
Use the normal Beta release artifacts for the target platform. Existing Direct
API and OTA configuration is preserved by the application settings model.

## Arduino
This Beta.4 application closure does not modify the firmware source. Existing
firmware `5.0.0-beta.9` remains the paired firmware identity.

## LXC
LXC/web package metadata is aligned with `5.5.1-beta.4`. Existing deployment and
runtime procedures remain unchanged.

## Validation
Before publishing, require repository validation, npm regression, Rust tests,
Cargo check, version parity, firmware SHA preservation and clean release docs.
