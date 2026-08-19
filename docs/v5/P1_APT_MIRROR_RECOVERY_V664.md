# P1 APT Mirror Recovery — V664

Runtime evidence from Beta.5 showed `apt-get update` stalling while contacting
`azure.archive.ubuntu.com` on the GitHub-hosted Ubuntu image.

V664 normalizes Ubuntu archive access to HTTPS archive.ubuntu.com before APT,
adds kill-after enforcement, residual apt cleanup, IPv4 forcing,
shorter network bounds and installed-package verification.

Application: `5.6.1-beta.6`
Firmware: `5.0.0-beta.10`
Direct API: `1.0.0`
