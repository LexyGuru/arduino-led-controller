#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="Arduino LED Controller"
OS_NAME="Debian"
OS_VERSION="13"
OS_CODENAME="trixie"

DEFAULT_CORES="2"
DEFAULT_MEMORY="2048"
DEFAULT_SWAP="512"
DEFAULT_DISK="8"
DEFAULT_HOSTNAME="arduino-led-controller"
DEFAULT_BRIDGE="vmbr0"
DEFAULT_START_ON_BOOT="1"
DEFAULT_UNPRIVILEGED="1"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-${0}}")" 2>/dev/null && pwd || pwd)"
GITHUB_REPO="LexyGuru/arduino-led-controller"
PAYLOAD_ARCHIVE="${ARDUINO_LED_PAYLOAD_ARCHIVE:-}"

# ─────────────────────────────────────────────────────────────
# Arduino LED Controller V5 terminal visual system
# ─────────────────────────────────────────────────────────────
if [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]]; then
  bold="$(printf '\033[1m')"
  dim="$(printf '\033[2m')"
  cyan="$(printf '\033[38;5;51m')"
  blue="$(printf '\033[38;5;39m')"
  violet="$(printf '\033[38;5;141m')"
  green="$(printf '\033[38;5;82m')"
  yellow="$(printf '\033[38;5;220m')"
  red="$(printf '\033[38;5;203m')"
  white="$(printf '\033[38;5;255m')"
  slate="$(printf '\033[38;5;245m')"
  reset="$(printf '\033[0m')"
else
  bold=""; dim=""; cyan=""; blue=""; violet=""
  green=""; yellow=""; red=""; white=""; slate=""; reset=""
fi

say(){ printf '%b\n' "$*"; }
hr(){ printf '%b\n' "${slate}────────────────────────────────────────────────────────────────${reset}"; }

ui_logo() {
  say
  say "${cyan}${bold}        ╭──────────────────────────────────────────────╮${reset}"
  say "${cyan}${bold}        │${reset}                                              ${cyan}${bold}│${reset}"
  say "${cyan}${bold}        │${reset}       ${white}${bold}ARDUINO LED CONTROLLER V5${reset}              ${cyan}${bold}│${reset}"
  say "${cyan}${bold}        │${reset}       ${blue}PROXMOX • DEBIAN 13 • RUST${reset}             ${cyan}${bold}│${reset}"
  say "${cyan}${bold}        │${reset}                                              ${cyan}${bold}│${reset}"
  say "${cyan}${bold}        ╰──────────────────────────────────────────────╯${reset}"
  say "${dim}          Direct API v1 • React/Vite • Self Update${reset}"
  say
}

ui_section() {
  say
  say "${violet}${bold}◆ $*${reset}"
  say "${slate}────────────────────────────────────────────────────────────────${reset}"
}

ui_step() { say "${blue}${bold}➜${reset} ${white}$*${reset}"; }
ui_ok()   { say "${green}${bold}✔${reset} $*"; }
ui_warn() { say "${yellow}${bold}⚠${reset} $*"; }
ui_info() { say "${cyan}${bold}●${reset} $*"; }
ui_error(){ say "${red}${bold}✖${reset} $*" >&2; }
die(){ ui_error "$*"; exit 1; }

ui_key_value() {
  local key="$1" value="$2"
  printf '  %b%-18s%b %b%s%b\n' "$dim" "$key" "$reset" "$white" "$value" "$reset"
}

ui_choice() {
  local number="$1" title="$2" detail="${3:-}"
  say "  ${cyan}${bold}${number})${reset} ${white}${title}${reset}"
  [[ -n "$detail" ]] && say "     ${dim}${detail}${reset}"
}

ui_complete_box() {
  say
  say "${green}${bold}╔════════════════════════════════════════════════════════════════╗${reset}"
  say "${green}${bold}║${reset}                 ${white}${bold}INSTALLATION COMPLETE${reset}                    ${green}${bold}║${reset}"
  say "${green}${bold}╚════════════════════════════════════════════════════════════════╝${reset}"
  say
}

cleanup_on_error=0
CTID=""

on_error() {
  local rc=$?
  if [[ "$cleanup_on_error" == "1" && -n "${CTID:-}" ]] && pct status "$CTID" >/dev/null 2>&1; then
    say "${red}A telepítés megszakadt.${reset}"
    read -r -t 60 -p "Töröljem a félkész CT ${CTID} konténert? [Y/n]: " ans || ans="y"
    case "${ans:-y}" in
      n|N|no|NO) ;;
      *)
        pct stop "$CTID" >/dev/null 2>&1 || true
        pct destroy "$CTID" --purge >/dev/null 2>&1 || true
        say "CT ${CTID} eltávolítva."
        ;;
    esac
  fi
  exit "$rc"
}
trap on_error ERR

need(){ command -v "$1" >/dev/null 2>&1 || die "Hiányzó Proxmox parancs: $1"; }

prompt_default() {
  local label="$1" default="$2" value
  read -r -p "${label} [${default}]: " value
  printf '%s' "${value:-$default}"
}

yes_no() {
  local label="$1" default="${2:-y}" ans suffix
  if [[ "$default" == "y" ]]; then suffix="[Y/n]"; else suffix="[y/N]"; fi
  read -r -p "${label} ${suffix}: " ans
  ans="${ans:-$default}"
  [[ "$ans" =~ ^[Yy]$ ]]
}

choose_from_lines() {
  local title="$1"; shift
  local -a items=("$@")
  ((${#items[@]} > 0)) || return 1
  say "${bold}${title}${reset}"
  local i
  for i in "${!items[@]}"; do printf '  %d) %s\n' "$((i+1))" "${items[$i]}"; done
  local n
  while true; do
    read -r -p "Választás [1]: " n
    n="${n:-1}"
    if [[ "$n" =~ ^[0-9]+$ ]] && ((n >= 1 && n <= ${#items[@]})); then
      printf '%s' "${items[$((n-1))]}"
      return
    fi
    say "${yellow}Érvénytelen választás.${reset}"
  done
}

ui_logo

[[ "$(id -u)" -eq 0 ]] || die "A scriptet a Proxmox hoston rootként futtasd."
need pveversion
need pct
need pveam
need pvesm
need pvesh

PVE_VERSION="$(pveversion | head -n1)"
say "${dim}${PVE_VERSION}${reset}"

say
ui_section "RELEASE CHANNEL"
say "${white}${bold}Melyik frissítési csatornát szeretnéd?${reset}"
say "${dim}A kiválasztott csatornát az automatikus updater is megőrzi.${reset}"
say
ui_choice "1" "Stable / main" "Stabil kiadások; Rust LXC csak publikált stable állapotban."
ui_choice "2" "Beta / next/v5-rearchitecture" "Aktuális V5 fejlesztési csatorna • ajánlott."
say
read -r -p "  Választás [2]: " CHANNEL_CHOICE
CHANNEL_CHOICE="${CHANNEL_CHOICE:-2}"
case "$CHANNEL_CHOICE" in
  1)
    CHANNEL="stable"
    BRANCH="main"
    ;;
  2)
    CHANNEL="beta"
    BRANCH="next/v5-rearchitecture"
    ;;
  *) die "Érvénytelen csatorna." ;;
esac

prepare_github_payload() {
  if [[ -n "${PAYLOAD_ARCHIVE:-}" && -s "$PAYLOAD_ARCHIVE" ]]; then
    say "${dim}Runtime source: local payload${reset}"
    return
  fi

  need curl
  need tar
  local tmp source_url source_root builder version built
  tmp="$(mktemp -d)"
  source_url="https://github.com/${GITHUB_REPO}/archive/refs/heads/${BRANCH}.tar.gz"

  say
  say "${bold}GitHub source letöltése:${reset} ${GITHUB_REPO}@${BRANCH}"
  curl -fL --retry 3 --connect-timeout 10 "$source_url" -o "${tmp}/source.tar.gz"
  tar -xzf "${tmp}/source.tar.gz" -C "$tmp"
  source_root="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -n1)"
  [[ -n "$source_root" ]] || die "A GitHub source archive üres."

  if [[ ! -f "${source_root}/rust/Cargo.toml" || ! -f "${source_root}/deploy/build-rust-lxc-runtime-test-bundle.sh" ]]; then
    if [[ "$CHANNEL" == "stable" ]]; then
      die "A Stable/main ágon a Rust LXC kiadás még nincs publikálva. Válaszd a Beta csatornát, vagy várd meg a stable merge-et."
    fi
    die "A kiválasztott ágon hiányzik a Rust LXC source."
  fi

  builder="${source_root}/deploy/build-rust-lxc-runtime-test-bundle.sh"
  chmod +x "$builder"
  ( cd "$source_root" && bash "$builder" )

  version="$(tr -d '[:space:]' < "${source_root}/VERSION")"
  built="${source_root}/dist-lxc-runtime-test/Arduino_LED_Controller_${version}_LXC_Runtime_Test_Source.tar.gz"
  [[ -s "$built" ]] || die "A GitHub runtime payload build nem készült el."

  PAYLOAD_ARCHIVE="${tmp}/Arduino_LED_Controller_LXC_Runtime_Source.tar.gz"
  cp "$built" "$PAYLOAD_ARCHIVE"
  ui_ok "GitHub runtime payload elkészült"
    say "${green}GITHUB_RUNTIME_PAYLOAD=READY${reset}"
}

say
ui_section "INSTALLATION MODE"
say "${white}${bold}Telepítési profil${reset}"
say "${dim}A Default profil a legtöbb otthoni Proxmox rendszerhez megfelelő.${reset}"
say
ui_choice "1" "Default Settings" "2 CPU • 2048 MiB RAM • 512 MiB swap • 8 GB • DHCP"
ui_choice "2" "Advanced Settings" "CTID • CPU • RAM • storage • bridge • VLAN • static IPv4"
say
read -r -p "  Választás [1]: " MODE_CHOICE
MODE_CHOICE="${MODE_CHOICE:-1}"
case "$MODE_CHOICE" in
  1) MODE="default" ;;
  2) MODE="advanced" ;;
  *) die "Érvénytelen telepítési mód." ;;
esac

CTID="$(pvesh get /cluster/nextid 2>/dev/null | tr -d '[:space:]')"
[[ "$CTID" =~ ^[0-9]+$ ]] || die "Nem sikerült automatikus CT ID-t lekérni."

HOSTNAME="$DEFAULT_HOSTNAME"
CORES="$DEFAULT_CORES"
MEMORY="$DEFAULT_MEMORY"
SWAP="$DEFAULT_SWAP"
DISK="$DEFAULT_DISK"
BRIDGE="$DEFAULT_BRIDGE"
ONBOOT="$DEFAULT_START_ON_BOOT"
UNPRIVILEGED="$DEFAULT_UNPRIVILEGED"
NET_MODE="dhcp"
STATIC_IP=""
GATEWAY=""
VLAN_TAG=""

mapfile -t ROOT_STORAGES < <(pvesm status -content rootdir 2>/dev/null | awk 'NR>1 && $3=="active"{print $1}')
mapfile -t TEMPLATE_STORAGES < <(pvesm status -content vztmpl 2>/dev/null | awk 'NR>1 && $3=="active"{print $1}')

((${#ROOT_STORAGES[@]} > 0)) || die "Nem található aktív rootdir storage."
((${#TEMPLATE_STORAGES[@]} > 0)) || die "Nem található aktív vztmpl template storage."

ROOT_STORAGE="${ROOT_STORAGES[0]}"
TEMPLATE_STORAGE="${TEMPLATE_STORAGES[0]}"

if [[ "$MODE" == "advanced" ]]; then
  ui_section "ADVANCED SETTINGS"
  CTID="$(prompt_default "Container ID" "$CTID")"
  HOSTNAME="$(prompt_default "Hostname" "$HOSTNAME")"
  CORES="$(prompt_default "CPU cores" "$CORES")"
  MEMORY="$(prompt_default "Memory MiB" "$MEMORY")"
  SWAP="$(prompt_default "Swap MiB" "$SWAP")"
  DISK="$(prompt_default "Disk GB" "$DISK")"

  say
  ROOT_STORAGE="$(choose_from_lines "Container storage:" "${ROOT_STORAGES[@]}")"
  say
  TEMPLATE_STORAGE="$(choose_from_lines "Template storage:" "${TEMPLATE_STORAGES[@]}")"

  BRIDGE="$(prompt_default "Network bridge" "$BRIDGE")"
  read -r -p "VLAN tag [none]: " VLAN_TAG

  say
  say "Network:"
  say "  1) DHCP"
  say "  2) Static IPv4"
  read -r -p "Választás [1]: " NET_CHOICE
  NET_CHOICE="${NET_CHOICE:-1}"
  case "$NET_CHOICE" in
    1) NET_MODE="dhcp" ;;
    2)
      NET_MODE="static"
      read -r -p "IPv4/CIDR (pl. 10.0.0.50/24): " STATIC_IP
      read -r -p "Gateway (pl. 10.0.0.1): " GATEWAY
      [[ -n "$STATIC_IP" && -n "$GATEWAY" ]] || die "Static módhoz IP/CIDR és gateway szükséges."
      ;;
    *) die "Érvénytelen network mód." ;;
  esac

  if yes_no "Unprivileged LXC?" y; then UNPRIVILEGED=1; else UNPRIVILEGED=0; fi
  if yes_no "Start at boot?" y; then ONBOOT=1; else ONBOOT=0; fi
fi

[[ "$CTID" =~ ^[0-9]+$ ]] || die "Érvénytelen CT ID."
[[ "$CORES" =~ ^[0-9]+$ && "$CORES" -ge 1 ]] || die "Érvénytelen CPU."
[[ "$MEMORY" =~ ^[0-9]+$ && "$MEMORY" -ge 512 ]] || die "Minimum 512 MiB RAM."
[[ "$SWAP" =~ ^[0-9]+$ ]] || die "Érvénytelen swap."
[[ "$DISK" =~ ^[0-9]+$ && "$DISK" -ge 4 ]] || die "Minimum 4 GB disk."
pct status "$CTID" >/dev/null 2>&1 && die "A CT ID már létezik: $CTID"

pvesm status | awk 'NR>1 {print $1}' | grep -qxF "$ROOT_STORAGE" || die "Ismeretlen root storage."
pvesm status | awk 'NR>1 {print $1}' | grep -qxF "$TEMPLATE_STORAGE" || die "Ismeretlen template storage."

ui_section "DEBIAN 13 TEMPLATE"
ui_step "Debian 13 / Trixie template ellenőrzése"
pveam update >/dev/null

find_local_template() {
  pveam list "$TEMPLATE_STORAGE" 2>/dev/null |
    awk 'NR>1 {print $1}' |
    grep -E '/debian-13-standard_[^/]+_(amd64|arm64)\.tar\.(zst|gz|xz)$' |
    sort -V |
    tail -n1 || true
}

TEMPLATE_VOL="$(find_local_template)"

if [[ -z "$TEMPLATE_VOL" ]]; then
  ONLINE_TEMPLATE="$(pveam available --section system 2>/dev/null |
    awk '{print $2}' |
    grep -E '^debian-13-standard_[^ ]+_(amd64|arm64)\.tar\.(zst|gz|xz)$' |
    sort -V |
    tail -n1 || true)"
  [[ -n "$ONLINE_TEMPLATE" ]] || die "Debian 13 standard template nem található. Nem váltunk vissza más Debian verzióra."
  ui_info "Template letöltése: ${ONLINE_TEMPLATE}"
  pveam download "$TEMPLATE_STORAGE" "$ONLINE_TEMPLATE"
  TEMPLATE_VOL="${TEMPLATE_STORAGE}:vztmpl/${ONLINE_TEMPLATE}"
fi

[[ "$TEMPLATE_VOL" == *debian-13-standard_* ]] || die "Debian 13 template lock sérült."

NET0="name=eth0,bridge=${BRIDGE}"
if [[ "$NET_MODE" == "dhcp" ]]; then
  NET0+=",ip=dhcp"
else
  NET0+=",ip=${STATIC_IP},gw=${GATEWAY}"
fi
if [[ -n "$VLAN_TAG" ]]; then
  [[ "$VLAN_TAG" =~ ^[0-9]+$ ]] || die "Érvénytelen VLAN tag."
  NET0+=",tag=${VLAN_TAG}"
fi

ui_section "INSTALLATION SUMMARY"
ui_key_value "Channel" "${CHANNEL}"
ui_key_value "Git branch" "${BRANCH}"
ui_key_value "OS" "Debian 13 (${OS_CODENAME})"
ui_key_value "CT ID" "${CTID}"
ui_key_value "Hostname" "${HOSTNAME}"
ui_key_value "CPU" "${CORES} core"
ui_key_value "RAM" "${MEMORY} MiB"
ui_key_value "Swap" "${SWAP} MiB"
ui_key_value "Disk" "${DISK} GB"
ui_key_value "Storage" "${ROOT_STORAGE}"
ui_key_value "Template store" "${TEMPLATE_STORAGE}"
ui_key_value "Template" "${TEMPLATE_VOL}"
ui_key_value "Bridge" "${BRIDGE}"
ui_key_value "Network" "${NET_MODE}"
ui_key_value "Unprivileged" "${UNPRIVILEGED}"
ui_key_value "Start at boot" "${ONBOOT}"
ui_key_value "Auto update" "enabled • every 6h"
say
yes_no "  Elindítsam a telepítést?" y || exit 0

ui_section "ARDUINO DIRECT API"
ui_info "A private path mezőbe csak a privát prefix kell, /api/v1 nélkül."
ARDUINO_HOST_INPUT="$(prompt_default "Arduino helyi IP / host" "10.0.0.117")"
ARDUINO_PORT_INPUT="$(prompt_default "Arduino HTTP port" "80")"
read -r -p "Arduino private path prefix (csak a prefix, /api/v1 nélkül): " ARDUINO_PRIVATE_PATH
read -r -s -p "Arduino Device Key: " ARDUINO_DEVICE_KEY_INPUT
printf '\n'
[[ -n "$ARDUINO_HOST_INPUT" && "$ARDUINO_HOST_INPUT" != *"://"* && "$ARDUINO_HOST_INPUT" != *"/"* ]] || die "Érvénytelen Arduino host."
[[ "$ARDUINO_PORT_INPUT" =~ ^[0-9]+$ ]] || die "Érvénytelen Arduino port."
[[ "$ARDUINO_PRIVATE_PATH" == /* ]] || die "A private path / jellel kezdődjön."
[[ "$ARDUINO_PRIVATE_PATH" != */api/v1 ]] || die "Csak a private prefixet add meg, /api/v1 nélkül."
[[ ${#ARDUINO_DEVICE_KEY_INPUT} -ge 24 ]] || die "A Device Key túl rövid."
say "${green}ARDUINO_CONFIG_INPUT=READY${reset}"

ui_section "RUNTIME SOURCE"
ui_step "Runtime payload előkészítése a ${BRANCH} ágról"
prepare_github_payload
[[ -s "$PAYLOAD_ARCHIVE" ]] || die "Runtime payload hiányzik."

cleanup_on_error=1

ui_section "CONTAINER"
ui_step "LXC konténer létrehozása"
pct create "$CTID" "$TEMPLATE_VOL" \
  --hostname "$HOSTNAME" \
  --cores "$CORES" \
  --memory "$MEMORY" \
  --swap "$SWAP" \
  --rootfs "${ROOT_STORAGE}:${DISK}" \
  --net0 "$NET0" \
  --unprivileged "$UNPRIVILEGED" \
  --onboot "$ONBOOT" \
  --features nesting=1 \
  --start 0

ui_ok "LXC konténer létrehozva"
ui_step "LXC indítása"
pct start "$CTID"

say
ui_ok "LXC elindult"
ui_section "ROOT ACCESS"
say "${white}${bold}Root jelszó beállítása${reset}"
say "A Debian 13 konzolhoz most kötelező root jelszót megadni."
say "Írd be kétszer ugyanazt a jelszót:"
pct exec "$CTID" -- passwd root
ui_ok "Root jelszó beállítva"
say "${green}ROOT_PASSWORD=CONFIGURED${reset}"
say

ui_section "NETWORK"
ui_step "Debian 13 hálózat indulására várunk"
network_ok=0
for _ in $(seq 1 60); do
  if pct exec "$CTID" -- bash -lc 'getent hosts deb.debian.org >/dev/null 2>&1'; then
    network_ok=1
    break
  fi
  sleep 2
done
[[ "$network_ok" == "1" ]] || die "A Debian 13 LXC hálózata nem állt fel időben."

pct exec "$CTID" -- bash -lc '
  set -Eeuo pipefail
  . /etc/os-release
  [[ "${ID}" == "debian" ]]
  [[ "${VERSION_ID}" == "13" ]]
  echo "DEBIAN_13_RUNTIME=PASSED"
'

pct exec "$CTID" -- mkdir -p /root/arduino-led-installer
pct push "$CTID" "$PAYLOAD_ARCHIVE" \
  /root/arduino-led-installer/Arduino_LED_Controller_LXC_Runtime_Source.tar.gz

pct exec "$CTID" -- bash -lc '
  set -Eeuo pipefail
  cd /root/arduino-led-installer
  tar -xzf Arduino_LED_Controller_LXC_Runtime_Source.tar.gz
  ROOT="$(find . -mindepth 1 -maxdepth 1 -type d | head -n1)"
  [[ -n "$ROOT" ]]
  cd "$ROOT"
  chmod +x deploy/*.sh
  printf "%s\n" "'"$CHANNEL"'" > /etc/arduino-led-channel
  printf "%s\n" "'"$BRANCH"'" > /etc/arduino-led-branch
  ./deploy/install-rust-lxc-native.sh
'
ui_ok "Debian 13 runtime + Rust backend + React/Vite web UI telepítve"

pct exec "$CTID" -- env ALC_CHANNEL="$CHANNEL" ALC_BRANCH="$BRANCH" bash -lc '
set -Eeuo pipefail
install -d -m 0755 /etc/arduino-led-controller
cat > /etc/arduino-led-controller/update.env <<EOFUPDATE
UPDATE_CHANNEL=${ALC_CHANNEL}
UPDATE_BRANCH=${ALC_BRANCH}
UPDATE_KEEP_RELEASES=3
EOFUPDATE
chmod 0600 /etc/arduino-led-controller/update.env
systemctl daemon-reload
systemctl enable --now arduino-led-controller-update.timer
'
ui_ok "Automatikus frissítési csatorna: ${CHANNEL} → ${BRANCH}"
say "${green}UPDATE_CHANNEL_SELECTED=${CHANNEL}:${BRANCH}${reset}"

pct exec "$CTID" -- env ALC_HOST="$ARDUINO_HOST_INPUT" ALC_PORT="$ARDUINO_PORT_INPUT" ALC_PATH="$ARDUINO_PRIVATE_PATH" ALC_KEY="$ARDUINO_DEVICE_KEY_INPUT" bash -lc '
set -Eeuo pipefail
python3 - <<"PYCFG"
from pathlib import Path
import os
p=Path("/etc/arduino-led-controller/lxc.env")
s=p.read_text()
vals={
 "ARDUINO_PROTOCOL":"http",
 "ARDUINO_HOST":os.environ["ALC_HOST"],
 "ARDUINO_PORT":os.environ["ALC_PORT"],
 "ARDUINO_API_PATH":os.environ["ALC_PATH"],
 "ARDUINO_DEVICE_KEY":os.environ["ALC_KEY"],
}
out=[]; seen=set()
for line in s.splitlines():
    k=line.split("=",1)[0] if "=" in line else ""
    if k in vals:
        out.append(f"{k}={vals[k]}")
        seen.add(k)
    else:
        out.append(line)
for k,v in vals.items():
    if k not in seen:
        out.append(f"{k}={v}")
p.write_text("\n".join(out)+"\n")
PYCFG
chmod 0600 /etc/arduino-led-controller/lxc.env
systemctl restart arduino-led-controller-rust.service
'

service_ready=0
for _ in $(seq 1 30); do
  if pct exec "$CTID" -- curl -fsS http://127.0.0.1:3000/health/live >/dev/null 2>&1; then
    service_ready=1
    break
  fi
  sleep 1
done
[[ "$service_ready" == "1" ]] || die "A Rust LXC service nem állt fel 30 másodpercen belül."
ui_ok "Rust/Axum service online"
say "${green}LXC_SERVICE_LIVE=PASSED${reset}"

CONFIG_STATUS="$(pct exec "$CTID" -- bash -lc \
  "grep -q '^ARDUINO_DEVICE_KEY=CHANGE_ME$' /etc/arduino-led-controller/lxc.env && echo required || echo ready")"

cleanup_on_error=0

CT_IP="$(pct exec "$CTID" -- bash -lc \
  "ip -4 -o addr show dev eth0 | awk '{print \$4}' | cut -d/ -f1 | head -n1" 2>/dev/null || true)"

say
ui_complete_box
ui_ok "Arduino LED Controller V5 készen áll"
say
ui_key_value "CT ID" "${CTID}"
ui_key_value "Hostname" "${HOSTNAME}"
ui_key_value "Channel" "${CHANNEL} (${BRANCH})"
ui_key_value "OS" "Debian 13 / Trixie"
ui_key_value "Root login" "configured"
ui_key_value "Auto Update" "enabled • 6h • rollback protected"
[[ -n "$CT_IP" ]] && ui_key_value "IP" "${CT_IP}"
[[ -n "$CT_IP" ]] && ui_key_value "Web UI" "http://${CT_IP}:3000/"

if [[ "$CONFIG_STATUS" == "required" ]]; then
  say
  say "${yellow}Arduino konfiguráció még szükséges.${reset}"
  say "Nyisd meg a shellt:"
  say "  pct enter ${CTID}"
  say
  say "Majd:"
  say "  nano /etc/arduino-led-controller/lxc.env"
  say "  systemctl restart arduino-led-controller-rust.service"
  say "  /root/arduino-led-installer/*/deploy/test-rust-lxc-runtime.sh"
else
  pct exec "$CTID" -- bash -lc '
    systemctl is-active --quiet arduino-led-controller-rust.service
    curl -fsS http://127.0.0.1:3000/health/live >/dev/null
  '
  ui_ok "Runtime health check sikeres"
say "${green}SERVICE_HEALTH=PASSED${reset}"
fi

say
ui_section "INSTALLED CHANNEL"
ui_key_value "/etc/arduino-led-channel" "${CHANNEL}"
ui_key_value "/etc/arduino-led-branch" "${BRANCH}"
say
ui_ok "Proxmox LXC telepítés sikeresen befejezve"
say "${dim}A kezelőfelület megnyitásához használd a fenti Web UI címet.${reset}"
say
say "PROXMOX_LXC_INSTALL=SUCCESS"
