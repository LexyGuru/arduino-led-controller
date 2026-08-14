#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_ROOT="${PROJECT_ROOT}/desktop-tauri"
VERSION="$(tr -d '[:space:]' < "${PROJECT_ROOT}/VERSION")"
if [[ "${VERSION}" == *"-beta."* ]]; then
  ICON_SOURCE="src-tauri/icons/runtime/v5-beta-light.png"
  CHANNEL="beta"
else
  ICON_SOURCE="src-tauri/icons/runtime/v5-stable-light.png"
  CHANNEL="stable"
fi
cd "${TAURI_ROOT}"
test -s "${ICON_SOURCE}"
npx tauri icon "${ICON_SOURCE}" --ios-color '#fff'
printf 'V5_MOBILE_ICON_CHANNEL=%s\n' "${CHANNEL}"
printf 'V5_MOBILE_ICON_SOURCE=%s\n' "${ICON_SOURCE}"
if [[ -d src-tauri/gen/android ]]; then
  test -s src-tauri/gen/android/app/src/main/res/mipmap-mdpi/ic_launcher.png
  test -s src-tauri/gen/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
  printf 'V5_ANDROID_LAUNCHER_ICONS=GENERATED\n'
fi
if [[ -d src-tauri/gen/apple ]]; then
  APPICON_DIR="$(find src-tauri/gen/apple -type d -name 'AppIcon.appiconset' -print | head -n 1)"
  test -n "${APPICON_DIR}"
  test -s "${APPICON_DIR}/AppIcon-512@2x.png"
  printf 'V5_IOS_APPICON=GENERATED\n'
fi
