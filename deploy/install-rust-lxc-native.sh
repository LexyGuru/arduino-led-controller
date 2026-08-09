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
  python3 \
  nodejs \
  npm \
  git \
  util-linux

export HOME="${HOME:-/root}"
export CARGO_HOME="${CARGO_HOME:-/root/.cargo}"
export RUSTUP_HOME="${RUSTUP_HOME:-/root/.rustup}"
export PATH="${CARGO_HOME}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

if ! command -v cargo >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
    sh -s -- -y --profile minimal --default-toolchain stable
fi

command -v cargo >/dev/null 2>&1 || {
  echo "cargo nem található a Rust telepítés után." >&2
  exit 1
}
command -v rustc >/dev/null 2>&1 || {
  echo "rustc nem található a Rust telepítés után." >&2
  exit 1
}

rustc --version
cargo --version
node --version
npm --version

test -f "${SOURCE_ROOT}/web-lxc/package.json"
(
  # BETA9_SHARED_FRONTEND_DEPENDENCIES
  echo '[shared-frontend] Canonical desktop-tauri dependency-k telepítése.'
  npm --prefix "${SOURCE_ROOT}/desktop-tauri" ci
  cd "${SOURCE_ROOT}/web-lxc"
  npm ci
  npm run build
)
test -f "${SOURCE_ROOT}/web-lxc/dist/index.html"
echo "WEB_LXC_BUILD=SUCCESS"

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

python3 - "${SOURCE_ROOT}/release-versions.json" "${STATE}/firmware-catalog.json" <<'PYCAT'
import json,sys
src,dst=sys.argv[1:3]
with open(src,encoding="utf-8") as f:
    v=json.load(f)
catalog={
    "schemaVersion":1,
    "channel":v.get("channel","beta"),
    "source":"release-versions.json",
    "available":True,
    "applicationVersion":v.get("application"),
    "firmwareVersion":v.get("firmware"),
    "directApiVersion":v.get("directApi"),
    "board":v.get("board"),
    "otaPort":v.get("otaPort"),
    "artifacts":[{
        "version":v.get("firmware"),
        "board":v.get("board"),
        "otaPort":v.get("otaPort"),
        "installMode":"native-rust-http",
        "downloadUrl":"https://github.com/LexyGuru/arduino-led-controller/releases/download/Arduino_LED_Controller_Firmware_BETA/Arduino_LED_Controller_Firmware_"+str(v.get("firmware"))+"_UNO_R4_WiFi.bin",
        "checksumUrl":"https://github.com/LexyGuru/arduino-led-controller/releases/download/Arduino_LED_Controller_Firmware_BETA/Arduino_LED_Controller_Firmware_"+str(v.get("firmware"))+"_UNO_R4_WiFi.bin.sha256"
    }]
}
with open(dst,"w",encoding="utf-8") as f:
    json.dump(catalog,f,indent=2,ensure_ascii=False)
    f.write("\n")
PYCAT
chown arduino-led:arduino-led "${STATE}/firmware-catalog.json"
chmod 0644 "${STATE}/firmware-catalog.json"
echo "FIRMWARE_CATALOG_INSTALL=SUCCESS"

rm -rf "$RELEASE"
install -d -m 0755 "$RELEASE" "$RELEASE/bin" "$RELEASE/web"
install -m 0755 "$BIN" "$RELEASE/bin/arduino-led-lxc-server"
cp -R "${SOURCE_ROOT}/web-lxc/dist/." "$RELEASE/web/"
find "$RELEASE/web" -type d -exec chmod 0755 {} +
find "$RELEASE/web" -type f -exec chmod 0644 {} +
test -f "$RELEASE/web/index.html"
runuser -u arduino-led -- test -r "$RELEASE/web/index.html" || {
  echo "A web/index.html nem olvasható az arduino-led service user számára." >&2
  exit 1
}
runuser -u arduino-led -- test -x "$RELEASE/web" || {
  echo "A web root nem járható az arduino-led service user számára." >&2
  exit 1
}
echo "WEB_LXC_PERMISSIONS=SUCCESS"
echo "WEB_LXC_INSTALL=SUCCESS"

if [[ ! -f "$ETC/lxc.env" ]]; then
  install -m 0600 "${SOURCE_ROOT}/deploy/rust-lxc.env.example" "$ETC/lxc.env"
fi
grep -q '^ARDUINO_OTA_PORT=' "$ETC/lxc.env" || printf '\nARDUINO_OTA_PORT=65280\n' >> "$ETC/lxc.env"
grep -q '^ARDUINO_OTA_PASSWORD=' "$ETC/lxc.env" || printf 'ARDUINO_OTA_PASSWORD=CHANGE_ME\n' >> "$ETC/lxc.env"
if ! grep -q '^LXC_OTA_CONTROL_TOKEN=' "$ETC/lxc.env" || grep -q '^LXC_OTA_CONTROL_TOKEN=CHANGE_ME$' "$ETC/lxc.env"; then
  TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
  if grep -q '^LXC_OTA_CONTROL_TOKEN=' "$ETC/lxc.env"; then
    sed -i.bak "s|^LXC_OTA_CONTROL_TOKEN=.*$|LXC_OTA_CONTROL_TOKEN=${TOKEN}|" "$ETC/lxc.env"
    rm -f "$ETC/lxc.env.bak"
  else
    printf 'LXC_OTA_CONTROL_TOKEN=%s\n' "$TOKEN" >> "$ETC/lxc.env"
  fi
fi
chmod 0600 "$ETC/lxc.env"
echo "LXC_OTA_ENV_MIGRATION=SUCCESS"

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

install -m 0755 "${SOURCE_ROOT}/deploy/update-rust-lxc.sh"   /usr/local/sbin/arduino-led-controller-update
install -m 0644   "${SOURCE_ROOT}/deploy/systemd/arduino-led-controller-update.service"   /etc/systemd/system/arduino-led-controller-update.service
install -m 0644   "${SOURCE_ROOT}/deploy/systemd/arduino-led-controller-update.timer"   /etc/systemd/system/arduino-led-controller-update.timer

if [[ ! -f "$ETC/update.env" ]]; then
  install -m 0600 "${SOURCE_ROOT}/deploy/rust-lxc-update.env.example" "$ETC/update.env"
fi

# Az első telepítés commitját rögzítjük, hogy a timer ne buildelje újra ugyanazt.
if [[ -r /etc/arduino-led-branch ]]; then
  INSTALLED_BRANCH="$(tr -d '[:space:]' < /etc/arduino-led-branch)"
  INSTALLED_COMMIT="$(git ls-remote     https://github.com/LexyGuru/arduino-led-controller.git     "refs/heads/${INSTALLED_BRANCH}" | awk 'NR==1{print $1}')"
  if [[ "$INSTALLED_COMMIT" =~ ^[0-9a-f]{40}$ ]]; then
    printf '%s\n' "$INSTALLED_COMMIT" > "$STATE/installed-commit"
  fi
fi
printf '%s\n' "$VERSION" > "$STATE/installed-version"

systemctl daemon-reload
systemctl enable --now arduino-led-controller-update.timer
echo "LXC_SELF_UPDATE_TIMER=ENABLED"

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
