#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require('${ROOT}/release-versions.json').application")"
OUT="${ROOT}/dist-lxc-rust"
STAGE="${OUT}/Arduino_LED_Controller_${VERSION}_LXC_Rust_Server"

rm -rf "$OUT"
mkdir -p "$STAGE/bin" "$STAGE/config" "$STAGE/systemd" "$STAGE/deploy" "$STAGE/docs"

RUSTFLAGS="-D warnings" cargo build \
  --locked \
  --release \
  --manifest-path "${ROOT}/rust/Cargo.toml" \
  -p arduino-led-lxc-server

cp "${ROOT}/rust/target/release/arduino-led-lxc-server" "$STAGE/bin/"
cp "${ROOT}/deploy/rust-lxc.env.example" "$STAGE/config/lxc.env.example"
cp "${ROOT}/deploy/systemd/arduino-led-controller-rust.service" "$STAGE/systemd/"
cp "${ROOT}/deploy/install-rust-lxc.sh" "$STAGE/deploy/"
cp "${ROOT}/deploy/rollback-rust-lxc.sh" "$STAGE/deploy/"
cp "${ROOT}/docs/v5/RUST_LXC_ARCHITECTURE.md" "$STAGE/docs/"

cat > "$STAGE/README.txt" <<EOT
Arduino LED Controller ${VERSION} – Rust LXC Server

Install:
  sudo ./deploy/install-rust-lxc.sh ${VERSION} "$(pwd)"

Health:
  GET /health/live
  GET /health/ready

Gateway:
  status, logs, LED, time, schedules, schedule transactions, OTA prepare/status

Server:
  GET /api/v1/server/firmware/catalog
  WS  /api/v1/events/ws
EOT

(
  cd "$OUT"
  ARCHIVE="Arduino_LED_Controller_${VERSION}_LXC_Rust_Server.tar.gz"
  tar -czf "$ARCHIVE" "Arduino_LED_Controller_${VERSION}_LXC_Rust_Server"
  shasum -a 256 "$ARCHIVE" > "${ARCHIVE}.sha256"
  shasum -a 256 -c "${ARCHIVE}.sha256"
)

echo "RUST_LXC_BUNDLE=SUCCESS"
