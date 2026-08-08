#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "${SOURCE_ROOT}/VERSION")"

ROOT="/opt/arduino-led-controller"
ETC="/etc/arduino-led-controller"
STATE="/var/lib/arduino-led-controller"
LOG="/var/log/arduino-led-controller"
SERVICE="arduino-led-controller-rust.service"
RELEASE="${ROOT}/releases/${VERSION}"

[[ "$(id -u)" -eq 0 ]] || {
  echo "Root jogosultság szükséges." >&2
  exit 1
}

[[ "$(uname -s)" == "Linux" ]] || {
  echo "Ez a telepítő kizárólag Linux/LXC környezethez készült." >&2
  exit 2
}

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|aarch64|arm64) ;;
  *)
    echo "Nem támogatott architektúra: $ARCH" >&2
    exit 2
    ;;
esac

command -v apt-get >/dev/null 2>&1 || {
  echo "Jelenleg Debian/Ubuntu alapú LXC támogatott." >&2
  exit 2
}

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  curl \
  build-essential \
  pkg-config \
  file \
  python3

if ! command -v cargo >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
    sh -s -- -y --profile minimal --default-toolchain stable
  export PATH="${HOME}/.cargo/bin:${PATH}"
fi

rustc --version
cargo --version

RUSTFLAGS="-D warnings" cargo test \
  --locked \
  --manifest-path "${SOURCE_ROOT}/rust/Cargo.toml" \
  --workspace

RUSTFLAGS="-D warnings" cargo build \
  --locked \
  --release \
  --manifest-path "${SOURCE_ROOT}/rust/Cargo.toml" \
  -p arduino-led-lxc-server

BIN="${SOURCE_ROOT}/rust/target/release/arduino-led-lxc-server"
test -x "$BIN"
file "$BIN" | grep -q 'ELF' || {
  echo "A build eredménye nem Linux ELF bináris." >&2
  exit 1
}

if ! id arduino-led >/dev/null 2>&1; then
  useradd --system --home "$STATE" --shell /usr/sbin/nologin arduino-led
fi

install -d -o arduino-led -g arduino-led "$ROOT/releases" "$STATE" "$LOG"
install -d -m 0750 "$ETC"

rm -rf "$RELEASE"
install -d "$RELEASE/bin"
install -m 0755 "$BIN" "$RELEASE/bin/arduino-led-lxc-server"

if [[ ! -f "$ETC/lxc.env" ]]; then
  install -m 0600 "${SOURCE_ROOT}/deploy/rust-lxc.env.example" "$ETC/lxc.env"
fi

install -m 0644 \
  "${SOURCE_ROOT}/deploy/systemd/arduino-led-controller-rust.service" \
  "/etc/systemd/system/${SERVICE}"

CURRENT_OLD=""
if [[ -L "$ROOT/current" ]]; then
  CURRENT_OLD="$(readlink -f "$ROOT/current")"
fi

if [[ -n "$CURRENT_OLD" && "$CURRENT_OLD" != "$RELEASE" ]]; then
  ln -sfn "$CURRENT_OLD" "$ROOT/previous"
fi
ln -sfn "$RELEASE" "$ROOT/current"

systemctl daemon-reload
systemctl enable "$SERVICE"

if grep -q '^ARDUINO_DEVICE_KEY=CHANGE_ME$' "$ETC/lxc.env"; then
  echo "CONFIG_REQUIRED=YES"
  echo "CONFIG_PATH=$ETC/lxc.env"
  echo "SERVICE_START=SKIPPED_CONFIG_REQUIRED"
  exit 0
fi

systemctl restart "$SERVICE"
sleep 2
systemctl is-active --quiet "$SERVICE"

echo "RUST_LXC_NATIVE_INSTALL=SUCCESS"
echo "VERSION=$VERSION"
echo "ARCH=$ARCH"
