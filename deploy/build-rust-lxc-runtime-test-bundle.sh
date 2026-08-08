#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "${ROOT}/VERSION")"

OUT="${ROOT}/dist-lxc-runtime-test"
STAGE="${OUT}/Arduino_LED_Controller_${VERSION}_LXC_Runtime_Test"

rm -rf "$OUT"
mkdir -p "$STAGE"

cp "${ROOT}/VERSION" "$STAGE/"
cp "${ROOT}/release-versions.json" "$STAGE/"
cp -R "${ROOT}/rust" "$STAGE/rust"
rm -rf "$STAGE/rust/target"

mkdir -p "$STAGE/deploy/systemd" "$STAGE/docs"
cp "${ROOT}/deploy/rust-lxc.env.example" "$STAGE/deploy/"
cp "${ROOT}/deploy/install-rust-lxc-native.sh" "$STAGE/deploy/"
cp "${ROOT}/deploy/rollback-rust-lxc.sh" "$STAGE/deploy/"
cp "${ROOT}/deploy/test-rust-lxc-runtime.sh" "$STAGE/deploy/"
cp "${ROOT}/deploy/test-rust-lxc-service.sh" "$STAGE/deploy/"
cp "${ROOT}/deploy/test-rust-lxc-rollback.sh" "$STAGE/deploy/"
cp "${ROOT}/deploy/systemd/arduino-led-controller-rust.service" "$STAGE/deploy/systemd/"
cp "${ROOT}/docs/v5/RUST_LXC_ARCHITECTURE.md" "$STAGE/docs/"

cat > "$STAGE/README_LXC_TEST.txt" <<EOT
Arduino LED Controller ${VERSION} – Rust LXC Runtime Test

1. Másold ezt a teljes könyvtárat Debian/Proxmox LXC-be.
2. Rootként:
   ./deploy/install-rust-lxc-native.sh

3. Ha CONFIG_REQUIRED=YES:
   nano /etc/arduino-led-controller/lxc.env
   állítsd be ARDUINO_HOST és ARDUINO_DEVICE_KEY értékét
   majd:
   systemctl restart arduino-led-controller-rust.service

4. Runtime teszt:
   ./deploy/test-rust-lxc-runtime.sh

5. Service teszt:
   ./deploy/test-rust-lxc-service.sh

6. Rollback teszt, ha van previous release:
   ./deploy/test-rust-lxc-rollback.sh

A bináris a konténerben, Linuxon natívan fordul.
EOT

(
  cd "$OUT"
  ARCHIVE="Arduino_LED_Controller_${VERSION}_LXC_Runtime_Test_Source.tar.gz"
  tar -czf "$ARCHIVE" "Arduino_LED_Controller_${VERSION}_LXC_Runtime_Test"
  shasum -a 256 "$ARCHIVE" > "${ARCHIVE}.sha256"
  shasum -a 256 -c "${ARCHIVE}.sha256"
)

echo "LXC_RUNTIME_TEST_BUNDLE=SUCCESS"
