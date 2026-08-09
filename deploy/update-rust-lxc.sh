#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP="arduino-led-controller"
ROOT="/opt/${APP}"
RELEASES="${ROOT}/releases"
CURRENT="${ROOT}/current"
STATE_DIR="/var/lib/${APP}"
UPDATE_ENV="/etc/${APP}/update.env"
SERVICE="arduino-led-controller-rust.service"
LOCK="/run/${APP}-update.lock"
UPDATER_BIN="/usr/local/sbin/arduino-led-controller-update"
RUNTIME_UNIT="/etc/systemd/system/arduino-led-controller-rust.service"
UPDATE_UNIT="/etc/systemd/system/arduino-led-controller-update.service"
UPDATE_TIMER="/etc/systemd/system/arduino-led-controller-update.timer"
REPO_URL="https://github.com/LexyGuru/arduino-led-controller.git"

# A native installer rustup-pal root alá telepíti a Rust toolchaint.
# A systemd service nem örökli az interaktív shell PATH-ját, ezért az updater
# önállóan is explicit toolchain környezetet állít be.
export HOME="${HOME:-/root}"
export CARGO_HOME="${CARGO_HOME:-/root/.cargo}"
export RUSTUP_HOME="${RUSTUP_HOME:-/root/.rustup}"
export PATH="${CARGO_HOME}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

log(){ printf '[lxc-update] %s\n' "$*"; }
die(){ log "HIBA: $*"; exit 1; }

exec 9>"$LOCK"
flock -n 9 || { log "Másik updater már fut; kilépés."; exit 0; }

[[ -r "$UPDATE_ENV" ]] || die "Hiányzik: $UPDATE_ENV"
# shellcheck disable=SC1090
source "$UPDATE_ENV"

: "${UPDATE_CHANNEL:?UPDATE_CHANNEL hiányzik}"
: "${UPDATE_BRANCH:?UPDATE_BRANCH hiányzik}"
: "${UPDATE_KEEP_RELEASES:=3}"

case "$UPDATE_CHANNEL" in
  beta) [[ "$UPDATE_BRANCH" == "next/v5-rearchitecture" ]] || die "Beta branch mismatch." ;;
  stable) [[ "$UPDATE_BRANCH" == "main" ]] || die "Stable branch mismatch." ;;
  *) die "Ismeretlen channel: $UPDATE_CHANNEL" ;;
esac

mkdir -p "$RELEASES" "$STATE_DIR"

command -v cargo >/dev/null 2>&1 ||
  die "Rust cargo nem található. Várt hely: ${CARGO_HOME}/bin/cargo"
command -v rustc >/dev/null 2>&1 ||
  die "Rust rustc nem található. Várt hely: ${CARGO_HOME}/bin/rustc"

log "cargo=$(command -v cargo)"
log "rustc=$(command -v rustc)"

CURRENT_COMMIT=""
[[ -r "${STATE_DIR}/installed-commit" ]] &&
  CURRENT_COMMIT="$(tr -d '[:space:]' < "${STATE_DIR}/installed-commit")"

REMOTE_COMMIT="$(git ls-remote "$REPO_URL" "refs/heads/${UPDATE_BRANCH}" | awk 'NR==1{print $1}')"
[[ "$REMOTE_COMMIT" =~ ^[0-9a-f]{40}$ ]] || die "Nem sikerült a remote HEAD lekérése."

log "channel=$UPDATE_CHANNEL"
log "branch=$UPDATE_BRANCH"
log "current=${CURRENT_COMMIT:-unknown}"
log "remote=$REMOTE_COMMIT"

if [[ "$CURRENT_COMMIT" == "$REMOTE_COMMIT" ]]; then
  log "Nincs új frissítés."
  exit 0
fi

WORK="$(mktemp -d /var/tmp/${APP}-update.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

log "Forrás letöltése..."
curl -fL --retry 3 --connect-timeout 20 \
  "https://github.com/LexyGuru/arduino-led-controller/archive/${REMOTE_COMMIT}.tar.gz" \
  -o "${WORK}/source.tar.gz"

mkdir -p "${WORK}/src"
tar -xzf "${WORK}/source.tar.gz" -C "${WORK}/src" --strip-components=1
SRC="${WORK}/src"

test -f "${SRC}/VERSION" || die "VERSION hiányzik."
test -f "${SRC}/web-lxc/package.json" || die "web-lxc hiányzik."
test -f "${SRC}/rust/Cargo.toml" || die "Rust workspace hiányzik."
test -f "${SRC}/deploy/update-rust-lxc.sh" || die "Updater source hiányzik."
test -f "${SRC}/deploy/systemd/arduino-led-controller-rust.service" || die "Rust service unit source hiányzik."
test -f "${SRC}/deploy/systemd/arduino-led-controller-update.service" || die "Update service unit source hiányzik."
test -f "${SRC}/deploy/systemd/arduino-led-controller-update.timer" || die "Update timer source hiányzik."

VERSION="$(tr -d '[:space:]' < "${SRC}/VERSION")"
LXC_ENV="/etc/${APP}/lxc.env"
if [[ -f "$LXC_ENV" ]]; then
  grep -q '^ARDUINO_OTA_PORT=' "$LXC_ENV" || printf '\nARDUINO_OTA_PORT=65280\n' >> "$LXC_ENV"
  grep -q '^ARDUINO_OTA_PASSWORD=' "$LXC_ENV" || printf 'ARDUINO_OTA_PASSWORD=CHANGE_ME\n' >> "$LXC_ENV"
  if ! grep -q '^LXC_OTA_CONTROL_TOKEN=' "$LXC_ENV"; then
    TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
    printf 'LXC_OTA_CONTROL_TOKEN=%s\n' "$TOKEN" >> "$LXC_ENV"
  fi
  chmod 0600 "$LXC_ENV"
  log "LXC_OTA_ENV_MIGRATION=SUCCESS"
fi

python3 - "${SRC}/release-versions.json" "${STATE_DIR}/firmware-catalog.json.new" <<'PYCAT'
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
mv -f "${STATE_DIR}/firmware-catalog.json.new" "${STATE_DIR}/firmware-catalog.json"
chmod 0644 "${STATE_DIR}/firmware-catalog.json"
log "FIRMWARE_CATALOG=REFRESHED"

RELEASE="${RELEASES}/${VERSION}-${REMOTE_COMMIT:0:12}"
rm -rf "$RELEASE"

log "React/Vite build..."
(
  # BETA9_SHARED_FRONTEND_DEPENDENCIES
  echo '[shared-frontend] Canonical desktop-tauri dependency-k telepítése.'
  npm --prefix "${SRC}/desktop-tauri" ci
  cd "${SRC}/web-lxc"
  npm ci
  npm run build
)
test -f "${SRC}/web-lxc/dist/index.html" || die "Web build sikertelen."
test -f "${SRC}/web-lxc/dist/v5-icon.png" || die "Web buildből hiányzik: v5-icon.png."

log "Rust test/build..."
RUSTFLAGS="-D warnings" cargo test --locked \
  --manifest-path "${SRC}/rust/Cargo.toml" --workspace

RUSTFLAGS="-D warnings" cargo build --locked --release \
  --manifest-path "${SRC}/rust/Cargo.toml" \
  -p arduino-led-lxc-server

BIN="${SRC}/rust/target/release/arduino-led-lxc-server"
test -x "$BIN" || die "Rust bináris hiányzik."

install -d -m 0755 "${RELEASE}" "${RELEASE}/bin" "${RELEASE}/web"
install -m 0755 "$BIN" "${RELEASE}/bin/arduino-led-lxc-server"
cp -R "${SRC}/web-lxc/dist/." "${RELEASE}/web/"

find "${RELEASE}/web" -type d -exec chmod 0755 {} +
find "${RELEASE}/web" -type f -exec chmod 0644 {} +
test -r "${RELEASE}/web/index.html"
test -r "${RELEASE}/web/v5-icon.png" || die "Release webrootból hiányzik: v5-icon.png."
runuser -u arduino-led -- test -r "${RELEASE}/web/v5-icon.png" ||
  die "Az új web/v5-icon.png nem olvasható az arduino-led service user számára."
runuser -u arduino-led -- test -r "${RELEASE}/web/index.html" ||
  die "Az új web/index.html nem olvasható az arduino-led service user számára."
runuser -u arduino-led -- test -x "${RELEASE}/web" ||
  die "Az új web root nem járható az arduino-led service user számára."

printf '%s\n' "$REMOTE_COMMIT" > "${RELEASE}/SOURCE_COMMIT"
printf '%s\n' "$VERSION" > "${RELEASE}/VERSION"
chmod 0644 "${RELEASE}/SOURCE_COMMIT" "${RELEASE}/VERSION"
log "WEB_ASSET_PERMISSIONS=OK"

PREVIOUS=""
[[ -L "$CURRENT" ]] && PREVIOUS="$(readlink -f "$CURRENT" || true)"

log "Release aktiválása..."
ln -sfn "$RELEASE" "${ROOT}/current.new"
mv -Tf "${ROOT}/current.new" "$CURRENT"
systemctl restart "$SERVICE"

live=0
live_http="000"
for _ in $(seq 1 30); do
  live_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/health/live || true)"
  if [[ "$live_http" == "200" ]]; then
    live=1
    break
  fi
  sleep 1
done
log "RUNTIME_GATE_LIVE=${live} HTTP=${live_http}"

web=0
web_http="000"
if [[ "$live" == "1" ]]; then
  for _ in $(seq 1 15); do
    web_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)"
    if [[ "$web_http" == "200" ]]; then
      web=1
      break
    fi
    sleep 1
  done
fi
log "RUNTIME_GATE_WEB=${web} HTTP=${web_http}"
asset=0
asset_http="000"
if [[ "$live" == "1" && "$web" == "1" ]]; then
  for _ in $(seq 1 15); do
    asset_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/v5-icon.png || true)"
    if [[ "$asset_http" == "200" ]]; then
      asset=1
      break
    fi
    sleep 1
  done
fi
log "RUNTIME_GATE_V5_ICON=${asset} HTTP=${asset_http}"

if [[ "$live" != "1" || "$web" != "1" || "$asset" != "1" ]]; then
  log "Az új release saját runtime gate-je hibás. LIVE=${live}/${live_http} WEB=${web}/${web_http} V5_ICON=${asset}/${asset_http}. Rollback..."
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" "${ROOT}/current.rollback"
    mv -Tf "${ROOT}/current.rollback" "$CURRENT"
    systemctl restart "$SERVICE"
    sleep 2
    curl -fsS http://127.0.0.1:3000/health/live >/dev/null ||
      die "Rollback után sem él a service."
    log "ROLLBACK=SUCCESS"
  else
    die "Nincs előző release rollbackhoz."
  fi
  exit 1
fi
# Tranzakciós control-plane propagáció csak a sikeres első alkalmazás runtime gate után.
CONTROL_BACKUP="${WORK}/control-plane-backup"
mkdir -p "$CONTROL_BACKUP"

test -f "$RUNTIME_UNIT" || die "Telepített runtime unit hiányzik: $RUNTIME_UNIT"
test -f "$UPDATE_UNIT" || die "Telepített update unit hiányzik: $UPDATE_UNIT"
test -f "$UPDATE_TIMER" || die "Telepített update timer hiányzik: $UPDATE_TIMER"
test -x "$UPDATER_BIN" || die "Telepített updater hiányzik vagy nem futtatható: $UPDATER_BIN"

cp -a "$RUNTIME_UNIT" "${CONTROL_BACKUP}/runtime.service"
cp -a "$UPDATE_UNIT" "${CONTROL_BACKUP}/update.service"
cp -a "$UPDATE_TIMER" "${CONTROL_BACKUP}/update.timer"
cp -a "$UPDATER_BIN" "${CONTROL_BACKUP}/updater"

restore_control_plane(){
  log "CONTROL_PLANE_ROLLBACK=START"
  install -m 0644 "${CONTROL_BACKUP}/runtime.service" "$RUNTIME_UNIT"
  install -m 0644 "${CONTROL_BACKUP}/update.service" "$UPDATE_UNIT"
  install -m 0644 "${CONTROL_BACKUP}/update.timer" "$UPDATE_TIMER"
  install -m 0755 "${CONTROL_BACKUP}/updater" "$UPDATER_BIN"
  systemctl daemon-reload || true
  log "CONTROL_PLANE_ROLLBACK=DONE"
}

restore_previous_release(){
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" "${ROOT}/current.control-plane-rollback"
    mv -Tf "${ROOT}/current.control-plane-rollback" "$CURRENT"
    systemctl restart "$SERVICE" || true
    sleep 2
    curl -fsS http://127.0.0.1:3000/health/live >/dev/null ||
      die "Control-plane rollback után sem él a service."
    log "CONTROL_PLANE_RELEASE_ROLLBACK=SUCCESS"
  else
    die "Control-plane rollbackhoz nincs előző release."
  fi
}

control_plane_fail(){
  log "CONTROL_PLANE_TRANSACTION=FAILED: $*"
  restore_control_plane
  restore_previous_release
  exit 1
}

log "Control-plane systemd unitok tranzakciós frissítése..."
install -m 0644 "${SRC}/deploy/systemd/arduino-led-controller-rust.service" "${RUNTIME_UNIT}.new" || control_plane_fail "runtime unit staging"
install -m 0644 "${SRC}/deploy/systemd/arduino-led-controller-update.service" "${UPDATE_UNIT}.new" || control_plane_fail "update service staging"
install -m 0644 "${SRC}/deploy/systemd/arduino-led-controller-update.timer" "${UPDATE_TIMER}.new" || control_plane_fail "update timer staging"
mv -f "${RUNTIME_UNIT}.new" "$RUNTIME_UNIT" || control_plane_fail "runtime unit activation"
mv -f "${UPDATE_UNIT}.new" "$UPDATE_UNIT" || control_plane_fail "update service activation"
mv -f "${UPDATE_TIMER}.new" "$UPDATE_TIMER" || control_plane_fail "update timer activation"
systemctl daemon-reload || control_plane_fail "systemd daemon-reload"
log "CONTROL_PLANE_UNITS=UPDATED"

systemctl restart "$SERVICE" || control_plane_fail "runtime restart with new unit"
cp_live=0
cp_web=0
cp_asset=0
cp_live_http="000"
cp_web_http="000"
cp_asset_http="000"
for _ in $(seq 1 30); do
  cp_live_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/health/live || true)"
  if [[ "$cp_live_http" == "200" ]]; then
    cp_live=1
    break
  fi
  sleep 1
done
if [[ "$cp_live" == "1" ]]; then
  for _ in $(seq 1 15); do
    cp_web_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)"
    if [[ "$cp_web_http" == "200" ]]; then
      cp_web=1
      break
    fi
    sleep 1
  done
fi
if [[ "$cp_live" == "1" && "$cp_web" == "1" ]]; then
  for _ in $(seq 1 15); do
    cp_asset_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/v5-icon.png || true)"
    if [[ "$cp_asset_http" == "200" ]]; then
      cp_asset=1
      break
    fi
    sleep 1
  done
fi
log "CONTROL_PLANE_RUNTIME_GATE_LIVE=${cp_live} HTTP=${cp_live_http}"
log "CONTROL_PLANE_RUNTIME_GATE_WEB=${cp_web} HTTP=${cp_web_http}"
log "CONTROL_PLANE_RUNTIME_GATE_V5_ICON=${cp_asset} HTTP=${cp_asset_http}"

if [[ "$cp_live" != "1" || "$cp_web" != "1" || "$cp_asset" != "1" ]]; then
  control_plane_fail "second runtime gate LIVE=${cp_live}/${cp_live_http} WEB=${cp_web}/${cp_web_http} V5_ICON=${cp_asset}/${cp_asset_http}"
fi

install -m 0755 "${SRC}/deploy/update-rust-lxc.sh" "${UPDATER_BIN}.new" || control_plane_fail "updater staging"
mv -f "${UPDATER_BIN}.new" "$UPDATER_BIN" || control_plane_fail "updater activation"
systemctl enable --now arduino-led-controller-update.timer >/dev/null 2>&1 || control_plane_fail "update timer enable"
log "CONTROL_PLANE_UPDATER=UPDATED"
log "CONTROL_PLANE_TIMER=ENABLED"
log "CONTROL_PLANE_TRANSACTION=SUCCESS"
# Arduino readiness diagnosztika: nem rollback gate.
if curl -fsS http://127.0.0.1:3000/health/ready >/dev/null 2>&1; then
  log "ARDUINO_READY=YES"
else
  log "ARDUINO_READY=NO (a frissítés ettől még érvényes)"
fi

printf '%s\n' "$REMOTE_COMMIT" > "${STATE_DIR}/installed-commit"
printf '%s\n' "$VERSION" > "${STATE_DIR}/installed-version"
date -u +'%Y-%m-%dT%H:%M:%SZ' > "${STATE_DIR}/last-update-success"

log "UPDATE=SUCCESS"
log "VERSION=$VERSION"
log "COMMIT=$REMOTE_COMMIT"

mapfile -t OLD < <(
  find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' |
    sort -nr | awk '{print $2}'
)

i=0
for dir in "${OLD[@]}"; do
  i=$((i+1))
  [[ "$i" -le "$UPDATE_KEEP_RELEASES" ]] && continue
  [[ "$(readlink -f "$CURRENT")" == "$dir" ]] && continue
  rm -rf "$dir"
done
