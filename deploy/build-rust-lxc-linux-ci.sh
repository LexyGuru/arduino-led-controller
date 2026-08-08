#!/usr/bin/env bash
set -Eeuo pipefail

[[ "$(uname -s)" == "Linux" ]] || {
  echo "Ez a script kizárólag Linux CI runneren futtatható." >&2
  exit 2
}

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "${ROOT}/VERSION")"

OUTPUT_DIR="${OUTPUT_DIR:-${ROOT}/artifacts}"
BASENAME="${OUTPUT_BASENAME:-Arduino_LED_Controller_${VERSION}_LXC_Rust_Server}"

RUSTFLAGS="-D warnings" cargo test \
  --locked \
  --manifest-path "${ROOT}/rust/Cargo.toml" \
  --workspace

RUSTFLAGS="-D warnings" cargo build \
  --locked \
  --release \
  --manifest-path "${ROOT}/rust/Cargo.toml" \
  -p arduino-led-lxc-server

BIN="${ROOT}/rust/target/release/arduino-led-lxc-server"
test -x "$BIN"
file "$BIN" | grep -q 'ELF'

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
STAGE="${TMP}/${BASENAME}"

mkdir -p "$STAGE/bin" "$STAGE/config" "$STAGE/systemd" "$STAGE/deploy" "$STAGE/docs"
cp "$BIN" "$STAGE/bin/"
cp "${ROOT}/deploy/rust-lxc.env.example" "$STAGE/config/lxc.env.example"
cp "${ROOT}/deploy/systemd/arduino-led-controller-rust.service" "$STAGE/systemd/"
cp "${ROOT}/deploy/install-rust-lxc.sh" "$STAGE/deploy/"
cp "${ROOT}/deploy/rollback-rust-lxc.sh" "$STAGE/deploy/"
cp "${ROOT}/deploy/test-rust-lxc-runtime.sh" "$STAGE/deploy/"
cp "${ROOT}/deploy/docs-placeholder" "$STAGE/docs/" 2>/dev/null || true
cp "${ROOT}/docs/v5/RUST_LXC_ARCHITECTURE.md" "$STAGE/docs/"

mkdir -p "$OUTPUT_DIR"
tar -C "$TMP" -czf "${OUTPUT_DIR}/${BASENAME}.tar.gz" "$BASENAME"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${OUTPUT_DIR}/${BASENAME}.tar.gz" > "${OUTPUT_DIR}/${BASENAME}.tar.gz.sha256"
else
  shasum -a 256 "${OUTPUT_DIR}/${BASENAME}.tar.gz" > "${OUTPUT_DIR}/${BASENAME}.tar.gz.sha256"
fi

echo "LINUX_LXC_CI_ARTIFACT=SUCCESS"
