#!/usr/bin/env bash
set -Eeuo pipefail
ATTEMPTS="${CI_APT_ATTEMPTS:-3}"
UPDATE_TIMEOUT="${CI_APT_UPDATE_TIMEOUT_SECONDS:-300}"
INSTALL_TIMEOUT="${CI_APT_INSTALL_TIMEOUT_SECONDS:-600}"
LOCK_TIMEOUT="${CI_APT_LOCK_TIMEOUT_SECONDS:-120}"
RETRY_SLEEP="${CI_APT_RETRY_SLEEP_SECONDS:-15}"
case "${ATTEMPTS}" in ''|*[!0-9]*) echo "HIBA: CI_APT_ATTEMPTS csak pozitív egész lehet." >&2; exit 2 ;; esac
test "${ATTEMPTS}" -ge 1 || { echo "HIBA: CI_APT_ATTEMPTS legalább 1." >&2; exit 2; }
command -v apt-get >/dev/null 2>&1 || { echo "HIBA: apt-get nem található." >&2; exit 2; }
command -v timeout >/dev/null 2>&1 || { echo "HIBA: GNU timeout nem található." >&2; exit 2; }
command -v sudo >/dev/null 2>&1 || { echo "HIBA: sudo nem található." >&2; exit 2; }
sudo -n true || { echo "HIBA: passwordless sudo nem érhető el." >&2; exit 2; }
export DEBIAN_FRONTEND=noninteractive
retry_command() {
  label="$1"; timeout_seconds="$2"; shift 2; attempt=1
  while [ "${attempt}" -le "${ATTEMPTS}" ]; do
    echo "CI_APT_PHASE=${label} attempt=${attempt}/${ATTEMPTS} timeout=${timeout_seconds}s"
    if timeout --foreground "${timeout_seconds}" "$@"; then
      echo "CI_APT_PHASE=${label} result=success attempt=${attempt}"
      return 0
    else
      rc=$?
    fi
    echo "::warning::${label} failed/timed out (attempt ${attempt}/${ATTEMPTS}, rc=${rc})"
    if [ "${attempt}" -ge "${ATTEMPTS}" ]; then echo "::error::${label} exhausted ${ATTEMPTS} attempts"; return "${rc}"; fi
    sleep "${RETRY_SLEEP}"; attempt=$((attempt + 1))
  done
}
APT_COMMON_OPTS="-o Acquire::Retries=3 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30 -o DPkg::Lock::Timeout=${LOCK_TIMEOUT}"
# shellcheck disable=SC2086
retry_command "apt-update" "${UPDATE_TIMEOUT}" sudo -E apt-get ${APT_COMMON_OPTS} update
# shellcheck disable=SC2086
retry_command "apt-install-tauri" "${INSTALL_TIMEOUT}" sudo -E apt-get ${APT_COMMON_OPTS} install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
echo "LINUX_TAURI_SYSTEM_DEPENDENCIES=READY"
