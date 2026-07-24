#!/usr/bin/env bash
# Telepíti az Arduino hivatalos arduinoOTA feltöltőeszközét. Az eszköz az
# UNO R4 WiFi-n futó ArduinoOTA szolgáltatáshoz küldi a már lefordított .bin
# firmware-t; a fordítás továbbra is GitHub Actionsben történik.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/arduino-led-controller}"
TOOL_DIR="${APP_DIR}/tools/arduinoOTA"
TOOL_PATH="${TOOL_DIR}/arduinoOTA"

if [[ -x "${TOOL_PATH}" ]]; then
  exit 0
fi

case "$(dpkg --print-architecture)" in
  amd64)
    ARCHIVE="arduinoOTA-1.3.0-linux_amd64.tar.bz2"
    CHECKSUM="aa45ee2441ffc3a122daec5802941d1fa2ac47adf5c5c481b5e0daa4dc259ffa"
    ;;
  arm64)
    ARCHIVE="arduinoOTA-1.3.0-linux_arm64.tar.bz2"
    CHECKSUM="835ed8f37cffac37e979d1b0f6041559592d3d98be52f0e8611b76c4858e4113"
    ;;
  armhf)
    ARCHIVE="arduinoOTA-1.3.0-linux_arm.tar.bz2"
    CHECKSUM="1888587409b56aef4ba0ab0e6703b3dccba7cc3a022756ba9b908247e5d5a656"
    ;;
  *)
    echo "Nem támogatott LXC architektúra: $(dpkg --print-architecture)" >&2
    exit 1
    ;;
esac

WORK_DIR="$(mktemp -d /tmp/arduino-ota-tool.XXXXXX)"
cleanup() { rm -rf "${WORK_DIR}"; }
trap cleanup EXIT

curl -fsSL "https://downloads.arduino.cc/tools/${ARCHIVE}" -o "${WORK_DIR}/${ARCHIVE}"
echo "${CHECKSUM}  ${WORK_DIR}/${ARCHIVE}" | sha256sum -c -
tar -xjf "${WORK_DIR}/${ARCHIVE}" -C "${WORK_DIR}"

SOURCE_TOOL="$(find "${WORK_DIR}" -type f -name arduinoOTA -perm -u+x | head -n 1)"
[[ -n "${SOURCE_TOOL}" ]] || { echo "Az arduinoOTA program nem található a letöltött csomagban." >&2; exit 1; }
mkdir -p "${TOOL_DIR}"
install -m 755 "${SOURCE_TOOL}" "${TOOL_PATH}"
echo "Arduino OTA feltöltőeszköz telepítve: ${TOOL_PATH}"
