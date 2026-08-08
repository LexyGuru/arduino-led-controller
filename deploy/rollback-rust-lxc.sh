#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/opt/arduino-led-controller"

[[ -L "$ROOT/previous" ]] || { echo "Nincs previous release." >&2; exit 1; }
PREVIOUS="$(readlink -f "$ROOT/previous")"
[[ -x "$PREVIOUS/bin/arduino-led-lxc-server" ]] || { echo "Previous release invalid." >&2; exit 1; }

CURRENT=""
if [[ -L "$ROOT/current" ]]; then CURRENT="$(readlink -f "$ROOT/current")"; fi
ln -sfn "$PREVIOUS" "$ROOT/current"
if [[ -n "$CURRENT" ]]; then ln -sfn "$CURRENT" "$ROOT/previous"; fi

systemctl restart arduino-led-controller-rust.service
echo "RUST_LXC_ROLLBACK=SUCCESS"
