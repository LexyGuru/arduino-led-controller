# Arduino LED Controller 5.6.1-beta.6

## Release identity
- Application: `5.6.1-beta.6`
- Firmware: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Channel: Beta
- Branch: `next/v5-rearchitecture`

## P1 — GitHub-hosted Ubuntu APT mirror recovery

Beta.5 proved that the outer 15 minute GitHub Actions timeout works, but the shared dependency installer could still remain stuck inside `apt-get update`.

The failed runtime log showed repeated access problems against `azure.archive.ubuntu.com` on the GitHub-hosted Ubuntu runner.

### Beta.6 recovery
- Normalize Azure Ubuntu mirror references to `https://archive.ubuntu.com/ubuntu` before APT starts.
- Scan `apt-mirrors.txt` and standard `.list` / `.sources` files.
- Fail immediately if Azure mirror residue remains.
- Use bounded `timeout --kill-after` execution.
- Kill residual APT processes after failed attempts.
- Force IPv4 for APT network fetches.
- Tighten network timeouts and retries.
- Install only required Tauri packages with `--no-install-recommends`.
- Verify required packages with `dpkg-query`.

The Beta.5 release-asset contract fix remains intact.
Firmware source remains unchanged.
