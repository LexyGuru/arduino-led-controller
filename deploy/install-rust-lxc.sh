#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/opt/arduino-led-controller"
ETC="/etc/arduino-led-controller"
STATE="/var/lib/arduino-led-controller"
LOG="/var/log/arduino-led-controller"
VERSION="${1:-}"
SOURCE="${2:-}"

[[ -n "$VERSION" ]] || { echo "usage: $0 <version> <bundle-directory>" >&2; exit 2; }
[[ -d "$SOURCE" ]] || { echo "bundle directory missing: $SOURCE" >&2; exit 2; }

if ! id arduino-led >/dev/null 2>&1; then
  useradd --system --home "$STATE" --shell /usr/sbin/nologin arduino-led
fi

install -d -o arduino-led -g arduino-led "$ROOT/releases" "$STATE" "$LOG"
install -d -m 0750 "$ETC"

RELEASE="$ROOT/releases/$VERSION"
rm -rf "$RELEASE"
install -d "$RELEASE/bin"
install -m 0755 "$SOURCE/bin/arduino-led-lxc-server" "$RELEASE/bin/arduino-led-lxc-server"

if [[ ! -f "$ETC/lxc.env" ]]; then
  install -m 0600 "$SOURCE/config/lxc.env.example" "$ETC/lxc.env"
  echo "FIGYELEM: állítsd be az ARDUINO_HOST és ARDUINO_DEVICE_KEY értékét: $ETC/lxc.env"
fi

install -m 0644 "$SOURCE/systemd/arduino-led-controller-rust.service" \
  /etc/systemd/system/arduino-led-controller-rust.service

if [[ -L "$ROOT/current" ]]; then
  CURRENT="$(readlink -f "$ROOT/current")"
  ln -sfn "$CURRENT" "$ROOT/previous"
fi

ln -sfn "$RELEASE" "$ROOT/current"
systemctl daemon-reload
systemctl enable arduino-led-controller-rust.service
systemctl restart arduino-led-controller-rust.service

sleep 2
systemctl --no-pager --full status arduino-led-controller-rust.service || true
echo "RUST_LXC_INSTALL=SUCCESS"
