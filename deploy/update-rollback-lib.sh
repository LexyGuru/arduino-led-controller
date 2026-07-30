#!/usr/bin/env bash

rollback_git() {
  local app_dir="$1"
  shift

  git \
    -c safe.directory="${app_dir}" \
    -C "${app_dir}" \
    "$@"
}

validate_rollback_commit() {
  local app_dir="$1"
  local commit="$2"

  [[ -n "${commit}" ]] || return 1

  rollback_git \
    "${app_dir}" \
    cat-file \
    -e \
    "${commit}^{commit}" \
    >/dev/null 2>&1
}

write_last_known_good() {
  local state_dir="$1"
  local commit="$2"
  local target_file="${state_dir}/last-known-good-commit"

  [[ -n "${commit}" ]] || return 1

  install -d \
    -m 0750 \
    "${state_dir}"

  printf '%s\n' \
    "${commit}" \
    > "${target_file}.tmp"

  chmod 0640 \
    "${target_file}.tmp"

  mv -f \
    "${target_file}.tmp" \
    "${target_file}"
}

read_last_known_good() {
  local state_dir="$1"
  local target_file="${state_dir}/last-known-good-commit"

  [[ -r "${target_file}" ]] || return 1

  tr -d \
    '[:space:]' \
    < "${target_file}"
}

rollback_repository() {
  local app_dir="$1"
  local commit="$2"

  validate_rollback_commit \
    "${app_dir}" \
    "${commit}" ||
    return 1

  rollback_git \
    "${app_dir}" \
    reset \
    --hard \
    "${commit}"
}
