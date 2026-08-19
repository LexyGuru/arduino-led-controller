#!/usr/bin/env bash
set -Eeuo pipefail

ATTEMPTS="${CI_APT_ATTEMPTS:-2}"
UPDATE_TIMEOUT="${CI_APT_UPDATE_TIMEOUT_SECONDS:-180}"
INSTALL_TIMEOUT="${CI_APT_INSTALL_TIMEOUT_SECONDS:-480}"
LOCK_TIMEOUT="${CI_APT_LOCK_TIMEOUT_SECONDS:-120}"
RETRY_SLEEP="${CI_APT_RETRY_SLEEP_SECONDS:-10}"
KILL_AFTER="${CI_APT_KILL_AFTER_SECONDS:-15}"

case "${ATTEMPTS}" in ''|*[!0-9]*) echo "HIBA: CI_APT_ATTEMPTS csak pozitív egész lehet." >&2; exit 2 ;; esac
test "${ATTEMPTS}" -ge 1 || { echo "HIBA: CI_APT_ATTEMPTS legalább 1." >&2; exit 2; }

for cmd in apt-get timeout sudo sed grep pkill dpkg-query; do
  command -v "${cmd}" >/dev/null 2>&1 || { echo "HIBA: ${cmd} nem található." >&2; exit 2; }
done
sudo -n true || { echo "HIBA: passwordless sudo nem érhető el." >&2; exit 2; }

export DEBIAN_FRONTEND=noninteractive

normalize_ubuntu_mirrors() {
  echo "CI_APT_MIRROR_NORMALIZATION=START"

  if [ -f /etc/apt/apt-mirrors.txt ]; then
    echo "CI_APT_MIRROR_FILE=/etc/apt/apt-mirrors.txt"
    sudo cp /etc/apt/apt-mirrors.txt /tmp/apt-mirrors.txt.before-v664
    sudo sed -i       -e 's#http://azure\.archive\.ubuntu\.com/ubuntu#https://archive.ubuntu.com/ubuntu#g'       -e 's#https://azure\.archive\.ubuntu\.com/ubuntu#https://archive.ubuntu.com/ubuntu#g'       /etc/apt/apt-mirrors.txt
  fi

  for f in /etc/apt/sources.list /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources; do
    [ -f "${f}" ] || continue
    if grep -q 'azure\.archive\.ubuntu\.com' "${f}"; then
      echo "CI_APT_MIRROR_REWRITE=${f}"
      sudo sed -i         -e 's#http://azure\.archive\.ubuntu\.com/ubuntu#https://archive.ubuntu.com/ubuntu#g'         -e 's#https://azure\.archive\.ubuntu\.com/ubuntu#https://archive.ubuntu.com/ubuntu#g'         "${f}"
    fi
  done

  if grep -Rqs 'azure\.archive\.ubuntu\.com' /etc/apt/sources.list /etc/apt/sources.list.d /etc/apt/apt-mirrors.txt 2>/dev/null; then
    echo "::error::Azure Ubuntu mirror residue remained after normalization"
    grep -Rs 'azure\.archive\.ubuntu\.com' /etc/apt/sources.list /etc/apt/sources.list.d /etc/apt/apt-mirrors.txt 2>/dev/null || true
    exit 3
  fi

  echo "CI_APT_PRIMARY_MIRROR=https://archive.ubuntu.com/ubuntu"
  echo "CI_APT_MIRROR_NORMALIZATION=PASSED"
}

run_bounded() {
  label="$1"
  timeout_seconds="$2"
  shift 2

  attempt=1
  while [ "${attempt}" -le "${ATTEMPTS}" ]; do
    echo "CI_APT_PHASE=${label} attempt=${attempt}/${ATTEMPTS} timeout=${timeout_seconds}s kill_after=${KILL_AFTER}s"

    if sudo -n timeout --foreground --kill-after="${KILL_AFTER}" "${timeout_seconds}"       env DEBIAN_FRONTEND=noninteractive "$@"; then
      echo "CI_APT_PHASE=${label} result=success attempt=${attempt}"
      return 0
    else
      rc=$?
    fi

    echo "::warning::${label} failed/timed out (attempt ${attempt}/${ATTEMPTS}, rc=${rc})"
    sudo -n pkill -TERM -x apt-get 2>/dev/null || true
    sudo -n pkill -TERM -x apt 2>/dev/null || true
    sleep 2
    sudo -n pkill -KILL -x apt-get 2>/dev/null || true
    sudo -n pkill -KILL -x apt 2>/dev/null || true

    if [ "${attempt}" -ge "${ATTEMPTS}" ]; then
      echo "::error::${label} exhausted ${ATTEMPTS} attempts"
      return "${rc}"
    fi

    sleep "${RETRY_SLEEP}"
    attempt=$((attempt + 1))
  done
}

normalize_ubuntu_mirrors

APT_OPTS=(
  -o Acquire::Retries=2
  -o Acquire::http::Timeout=20
  -o Acquire::https::Timeout=20
  -o Acquire::ForceIPv4=true
  -o DPkg::Lock::Timeout="${LOCK_TIMEOUT}"
)

run_bounded "apt-update" "${UPDATE_TIMEOUT}"   apt-get "${APT_OPTS[@]}" update

run_bounded "apt-install-tauri" "${INSTALL_TIMEOUT}"   apt-get "${APT_OPTS[@]}" install -y --no-install-recommends     libwebkit2gtk-4.1-dev     libappindicator3-dev     librsvg2-dev     patchelf

for pkg in libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf; do
  dpkg-query -W -f='${Status}\n' "${pkg}" 2>/dev/null | grep -qx 'install ok installed' || {
    echo "::error::Required Tauri dependency is not installed: ${pkg}"
    exit 4
  }
done

echo "LINUX_TAURI_SYSTEM_DEPENDENCIES=READY"
