#!/usr/bin/env bash
set -Eeuo pipefail

ARCHIVE="${1:-}"

[[ -n "${ARCHIVE}" ]] || {
  echo 'Használat: deploy/install-versioned-release.sh <release.tar.gz>' >&2
  exit 2
}

ARCHIVE="$(
  cd "$(
    dirname "${ARCHIVE}"
  )" &&
  pwd
)/$(
  basename "${ARCHIVE}"
)"
CHECKSUM_FILE="${CHECKSUM_FILE:-${ARCHIVE}.sha256}"
INSTALL_ROOT="${INSTALL_ROOT:-/opt/arduino-led-controller-staging}"
RELEASES_DIR="${RELEASES_DIR:-${INSTALL_ROOT}/releases}"
CURRENT_LINK="${CURRENT_LINK:-${INSTALL_ROOT}/current}"
SERVICE_NAME="${SERVICE_NAME:-arduino-led-controller-staging}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3100/health/ready}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_DELAY_SECONDS="${HEALTH_DELAY_SECONDS:-2}"
INSTALL_DEPENDENCIES="${INSTALL_DEPENDENCIES:-1}"
SYSTEMCTL_COMMAND="${SYSTEMCTL_COMMAND:-systemctl}"
CURL_COMMAND="${CURL_COMMAND:-curl}"
NPM_COMMAND="${NPM_COMMAND:-npm}"
SCRIPT_ROOT="$(
  cd "$(
    dirname "${BASH_SOURCE[0]}"
  )/.." &&
  pwd
)"
VERIFY_SCRIPT="${VERIFY_SCRIPT:-${SCRIPT_ROOT}/deploy/verify-versioned-release.sh}"
EVIDENCE_VERIFY_SCRIPT="${EVIDENCE_VERIFY_SCRIPT:-${SCRIPT_ROOT}/deploy/verify-alpha2-release-bundle.sh}"
REQUIRE_RELEASE_EVIDENCE="${REQUIRE_RELEASE_EVIDENCE:-1}"
EVIDENCE_PHASE="${EVIDENCE_PHASE:-}"

log() {
  printf '[release-install] %s\n' "$*"
}

for command in tar node "${CURL_COMMAND}"; do
  command -v "${command}" >/dev/null 2>&1 || {
    log "HIBA: hiányzó parancs: ${command}"
    exit 1
  }
done

[[ -f "${ARCHIVE}" ]] || {
  log "HIBA: hiányzó release bundle: ${ARCHIVE}"
  exit 1
}

[[ -f "${CHECKSUM_FILE}" ]] || {
  log "HIBA: hiányzó checksum: ${CHECKSUM_FILE}"
  exit 1
}

CHECKSUM_FILE="${CHECKSUM_FILE}" \
  bash "${VERIFY_SCRIPT}" \
  "${ARCHIVE}"

if [[ "${REQUIRE_RELEASE_EVIDENCE}" == '1' ]]; then
  PHASE="${EVIDENCE_PHASE}" \
    bash \
    "${EVIDENCE_VERIFY_SCRIPT}" \
    "${ARCHIVE}"
fi

TEMP_DIR="$(
  mktemp -d
)"
HEALTH_RESPONSE_FILE="$(
  mktemp
)"

PREVIOUS_TARGET=""
NEW_TARGET=""
ACTIVATED=0
NEW_TARGET_CREATED=0
ROLLBACK_COMPLETED=0

cleanup() {
  rm -rf \
    "${TEMP_DIR}"
  rm -f \
    "${HEALTH_RESPONSE_FILE}"
}

cleanup_failed_target() {
  if [[ "${NEW_TARGET_CREATED}" -eq 1 ]] && \
    [[ -n "${NEW_TARGET}" ]]; then
    rm -rf \
      "${NEW_TARGET}"
    NEW_TARGET_CREATED=0
  fi
}

rollback() {
  if [[ "${ACTIVATED}" -ne 1 ]] || \
    [[ "${ROLLBACK_COMPLETED}" -eq 1 ]]; then
    return
  fi

  ROLLBACK_COMPLETED=1

  if [[ -n "${PREVIOUS_TARGET}" ]]; then
    log "Rollback az előző release-re: ${PREVIOUS_TARGET}"
    ln -sfn \
      "${PREVIOUS_TARGET}" \
      "${CURRENT_LINK}"
  else
    log 'Rollback: az új current symlink eltávolítása.'
    rm -f \
      "${CURRENT_LINK}"
  fi

  if [[ -n "${SERVICE_NAME}" ]]; then
    if [[ -n "${PREVIOUS_TARGET}" ]]; then
      "${SYSTEMCTL_COMMAND}" \
        restart \
        "${SERVICE_NAME}" ||
        true
    else
      # Első staging telepítésnél nincs mire visszaállni. A hibás candidate
      # szolgáltatását leállítjuk, hogy ne maradjon aktív, nem-ready folyamat.
      "${SYSTEMCTL_COMMAND}" \
        stop \
        "${SERVICE_NAME}" ||
        true
    fi
  fi

  cleanup_failed_target

  ACTIVATED=0
}

handle_error() {
  if [[ "${ACTIVATED}" -eq 1 ]]; then
    rollback
  else
    # A függőségtelepítés vagy más aktiválás előtti lépés hibája se hagyjon
    # félkész candidate könyvtárat a staging releases könyvtárban.
    cleanup_failed_target
  fi
}

fail_after_activation() {
  local message="$1"

  log "HIBA: ${message}"
  rollback
  exit 1
}

on_exit() {
  local status="$?"

  # Az EXIT trap minden Bash-verzión lefut, akkor is, ha egy subshellben
  # (például npm ci közben) történik a hiba. Így a pre-activation candidate
  # takarítása nem függ az ERR trap öröklődési szabályaitól.
  trap - EXIT

  if [[ "${status}" -ne 0 ]]; then
    handle_error || true
  fi

  cleanup || true
  exit "${status}"
}

trap on_exit EXIT

tar -xzf \
  "${ARCHIVE}" \
  -C "${TEMP_DIR}"

TOP_LEVEL="$(
  find "${TEMP_DIR}" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d |
  head -n 1
)"

[[ -n "${TOP_LEVEL}" ]] || {
  log 'HIBA: a release bundle nem tartalmaz gyökérkönyvtárat.'
  exit 1
}

METADATA_FILE="${TOP_LEVEL}/RELEASE-METADATA.json"

[[ -f "${METADATA_FILE}" ]] || {
  log 'HIBA: hiányzik a RELEASE-METADATA.json.'
  exit 1
}

METADATA=()
while IFS= read -r metadata_value; do
  METADATA+=("${metadata_value}")
done < <(
  node - \
    "${METADATA_FILE}" \
    <<'NODE'
const fs = require('fs');
const data = JSON.parse(
  fs.readFileSync(
    process.argv[2],
    'utf8'
  )
);

for (
  const value
  of [
    data.name,
    data.version,
    data.commit
  ]
) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    process.exit(1);
  }

  console.log(
    value.trim()
  );
}
NODE
)

if [[ "${#METADATA[@]}" -ne 3 ]]; then
  log 'HIBA: a RELEASE-METADATA.json hiányos vagy érvénytelen.'
  exit 1
fi

NAME="${METADATA[0]:-}"
VERSION="${METADATA[1]:-}"
COMMIT="${METADATA[2]:-}"

[[ "${NAME}" =~ ^arduino-led-controller-[A-Za-z0-9._+-]+-(staging|promotion)-[a-f0-9]{12}$ ]] || {
  log "HIBA: érvénytelen release név: ${NAME}"
  exit 1
}

EXPECTED_SUFFIX="-${COMMIT:0:12}"

[[ "${NAME}" == *"${EXPECTED_SUFFIX}" ]] || {
  log "HIBA: a release név és commit rövid hash eltér: ${NAME}"
  exit 1
}

NEW_TARGET="${RELEASES_DIR}/${NAME}"

install -d \
  -m 0755 \
  "${RELEASES_DIR}"

if [[ -e "${NEW_TARGET}" ]]; then
  log "A release már telepítve van: ${NEW_TARGET}"
else
  mv \
    "${TOP_LEVEL}" \
    "${NEW_TARGET}"
  NEW_TARGET_CREATED=1
fi

if [[ "${INSTALL_DEPENDENCIES}" == '1' ]]; then
  log 'Produkciós Node-függőségek telepítése.'

  (
    cd "${NEW_TARGET}"

    "${NPM_COMMAND}" \
      ci \
      --omit=dev \
      --no-audit \
      --no-fund
  )
fi

if [[ -L "${CURRENT_LINK}" ]]; then
  PREVIOUS_TARGET="$(
    readlink "${CURRENT_LINK}"
  )"
fi

ln -sfn \
  "${NEW_TARGET}" \
  "${CURRENT_LINK}"

ACTIVATED=1

if [[ -n "${SERVICE_NAME}" ]]; then
  log "Szolgáltatás újraindítása: ${SERVICE_NAME}"

  "${SYSTEMCTL_COMMAND}" \
    restart \
    "${SERVICE_NAME}"
fi

log "Health ellenőrzés: ${HEALTH_URL}"

READY=0
LAST_HTTP_CODE="000"

for ((
  attempt = 1;
  attempt <= HEALTH_RETRIES;
  attempt += 1
)); do
  : >"${HEALTH_RESPONSE_FILE}"

  LAST_HTTP_CODE="$(
    "${CURL_COMMAND}" \
      --silent \
      --show-error \
      --max-time 3 \
      --output "${HEALTH_RESPONSE_FILE}" \
      --write-out '%{http_code}' \
      "${HEALTH_URL}" ||
      true
  )"

  if [[ "${LAST_HTTP_CODE}" =~ ^2[0-9][0-9]$ ]]; then
    READY=1
    break
  fi

  log "Health próba ${attempt}/${HEALTH_RETRIES}: HTTP ${LAST_HTTP_CODE}"

  if [[ "${attempt}" -lt "${HEALTH_RETRIES}" ]]; then
    sleep \
      "${HEALTH_DELAY_SECONDS}"
  fi
done

if [[ "${READY}" -ne 1 ]]; then
  log "Utolsó health válasz: HTTP ${LAST_HTTP_CODE}"

  if [[ -s "${HEALTH_RESPONSE_FILE}" ]]; then
    # A readiness JSON nem tartalmaz nyers titkokat; a konkrét hibakódok
    # nélkül a staging gate diagnosztikája használhatatlan lenne.
    sed 's/^/[release-install] health-body: /' \
      "${HEALTH_RESPONSE_FILE}"
  fi

  fail_after_activation \
    'a staging release nem lett ready állapotú.'
fi

install -d \
  -m 0755 \
  "${INSTALL_ROOT}"

node - \
  "${INSTALL_ROOT}/installed-release.json" \
  "${NAME}" \
  "${VERSION}" \
  "${COMMIT}" \
  "${NEW_TARGET}" \
  <<'NODE'
const fs = require('fs');

const [
  file,
  name,
  version,
  commit,
  target
] =
  process.argv.slice(2);

fs.writeFileSync(
  file,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      name,
      version,
      commit,
      target,
      installedAt:
        new Date()
          .toISOString()
    },
    null,
    2
  )}\n`,
  {
    mode: 0o644
  }
);
NODE

ACTIVATED=0
NEW_TARGET_CREATED=0

log "Staging release aktív: ${VERSION} (${COMMIT:0:12})"
