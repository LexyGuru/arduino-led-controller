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

VERSION="$(tr -d '[:space:]' < "${SRC}/VERSION")"

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
    "artifacts":[{"version":v.get("firmware"),"board":v.get("board"),"otaPort":v.get("otaPort"),"installMode":"desktop-system-ota"}]
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
  cd "${SRC}/web-lxc"
  npm ci
  npm run build
)
test -f "${SRC}/web-lxc/dist/index.html" || die "Web build sikertelen."

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

if [[ "$live" != "1" || "$web" != "1" ]]; then
  log "Az új release saját runtime gate-je hibás. LIVE=${live}/${live_http} WEB=${web}/${web_http}. Rollback..."
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
