#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." &&
  pwd
)"

source "${ROOT_DIR}/deploy/update-rollback-lib.sh"

TEST_ROOT="$(
  mktemp -d \
    /tmp/arduino-led-rollback-test.XXXXXX
)"

cleanup() {
  rm -rf "${TEST_ROOT}"
}

trap cleanup EXIT

REPO_DIR="${TEST_ROOT}/repo"
STATE_DIR="${TEST_ROOT}/state"

git init -q "${REPO_DIR}"

git -C "${REPO_DIR}" \
  config user.name \
  "Rollback Test"

git -C "${REPO_DIR}" \
  config user.email \
  "rollback-test@example.invalid"

printf 'stable\n' \
  > "${REPO_DIR}/state.txt"

git -C "${REPO_DIR}" \
  add state.txt

git -C "${REPO_DIR}" \
  commit -q \
  -m "stable"

STABLE_COMMIT="$(
  git -C "${REPO_DIR}" \
    rev-parse HEAD
)"

printf 'broken\n' \
  > "${REPO_DIR}/state.txt"

git -C "${REPO_DIR}" \
  add state.txt

git -C "${REPO_DIR}" \
  commit -q \
  -m "broken"

BROKEN_COMMIT="$(
  git -C "${REPO_DIR}" \
    rev-parse HEAD
)"

[[ "${STABLE_COMMIT}" != "${BROKEN_COMMIT}" ]]

write_last_known_good \
  "${STATE_DIR}" \
  "${STABLE_COMMIT}"

[[ "$(
  read_last_known_good \
    "${STATE_DIR}"
)" == "${STABLE_COMMIT}" ]]

rollback_repository \
  "${REPO_DIR}" \
  "${STABLE_COMMIT}" \
  >/dev/null

[[ "$(
  git -C "${REPO_DIR}" \
    rev-parse HEAD
)" == "${STABLE_COMMIT}" ]]

[[ "$(
  cat "${REPO_DIR}/state.txt"
)" == "stable" ]]

echo "OK: last-known-good commit tárolás"
echo "OK: Git repository visszaállítás"
echo "OK: rollback nem törli a repositoryt"
