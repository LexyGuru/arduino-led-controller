#!/usr/bin/env bash
set -Eeuo pipefail

[[ "$(id -u)" -eq 0 ]] || { echo "Root szükséges." >&2; exit 1; }
ROOT="/opt/arduino-led-controller"

[[ -L "$ROOT/current" ]] || { echo "current symlink hiányzik" >&2; exit 1; }

if [[ ! -L "$ROOT/previous" ]]; then
  echo "ROLLBACK_TEST=SKIPPED_NO_PREVIOUS_RELEASE"
  exit 0
fi

CURRENT_BEFORE="$(readlink -f "$ROOT/current")"
PREVIOUS_BEFORE="$(readlink -f "$ROOT/previous")"

bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/rollback-rust-lxc.sh"

CURRENT_AFTER="$(readlink -f "$ROOT/current")"
[[ "$CURRENT_AFTER" == "$PREVIOUS_BEFORE" ]] || {
  echo "Rollback current mismatch" >&2
  exit 1
}

systemctl is-active --quiet arduino-led-controller-rust.service
curl -fsS --max-time 10 http://127.0.0.1:3000/health/live >/dev/null

# Visszaállítjuk a teszt előtti current release-t.
ln -sfn "$CURRENT_BEFORE" "$ROOT/current"
ln -sfn "$PREVIOUS_BEFORE" "$ROOT/previous"
systemctl restart arduino-led-controller-rust.service
sleep 2
systemctl is-active --quiet arduino-led-controller-rust.service

echo "ROLLBACK_TEST=PASSED"
