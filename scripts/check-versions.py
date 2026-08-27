#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read_version_file() -> str:
    value = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if not value:
        raise RuntimeError("A VERSION fájl üres.")
    return value

def read_json_version(path: str) -> str:
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    value = data.get("version")
    if not isinstance(value, str) or not value:
        raise RuntimeError(f"Hiányzó version mező: {path}")
    return value

def read_lock_version(path: str) -> str:
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    value = data.get("version")
    root_value = data.get("packages", {}).get("", {}).get("version")
    if not isinstance(value, str) or not value or root_value != value:
        raise RuntimeError(f"Hibás lockfile verzió: {path}")
    return value

def read_openapi_version(path: str) -> str:
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    value = data.get("info", {}).get("version")
    if not isinstance(value, str) or not value:
        raise RuntimeError(f"Hiányzó OpenAPI version: {path}")
    return value

def read_cargo_version(path: str) -> str:
    text = (ROOT / path).read_text(encoding="utf-8")
    m = re.search(r'(?ms)^\[package\]\s*.*?^version\s*=\s*"([^"]+)"', text)
    if not m:
        raise RuntimeError(f"Nem található Cargo version: {path}")
    return m.group(1)

def read_cargo_lock_version(path: str, package_name: str) -> str:
    text = (ROOT / path).read_text(encoding="utf-8")
    m = re.search(
        rf'(?ms)^\[\[package\]\]\s*\nname\s*=\s*"{re.escape(package_name)}"\s*\nversion\s*=\s*"([^"]+)"',
        text,
    )
    if not m:
        raise RuntimeError(f"Nem található Cargo.lock version: {package_name}")
    return m.group(1)

def read_release_application(path: str) -> str:
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    value = data.get("application")
    if not isinstance(value, str) or not value:
        raise RuntimeError(f"Hiányzó application verzió: {path}")
    return value

def read_ts_app_version(path: str) -> str:
    text = (ROOT / path).read_text(encoding="utf-8")
    m = re.search(r"const\s+APP_VERSION\s*=\s*['\"]([^'\"]+)['\"]", text)
    if not m:
        raise RuntimeError(f"Nem található APP_VERSION: {path}")
    return m.group(1)

def read_env_value(path: str, key: str) -> str:
    text = (ROOT / path).read_text(encoding="utf-8")
    matches = re.findall(rf"(?m)^{re.escape(key)}=(.*)$", text)
    if len(matches) != 1:
        raise RuntimeError(
            f"{path}: {key} pontosan egyszer szerepeljen, jelenlegi darabszám: {len(matches)}"
        )
    value = matches[0].strip()
    if not value:
        raise RuntimeError(f"Üres {key}: {path}")
    return value

def expected_release_candidate(version: str, channel: str) -> str:
    if channel == "beta":
        m = re.fullmatch(r"\d+\.\d+\.\d+-beta\.(\d+)", version)
        if not m:
            raise RuntimeError(f"Beta RELEASE_CANDIDATE nem képezhető: {version}")
        return f"beta.{m.group(1)}-gate"
    return "stable-gate"

def read_firmware_release_metadata(path: str) -> dict:
    data = json.loads((ROOT / path).read_text(encoding="utf-8"))
    required = ["firmwareVersion", "channel", "board", "directApiVersion", "otaPort"]
    missing = [key for key in required if key not in data]
    if missing:
        raise RuntimeError(
            f"Hiányzó firmware release metadata mező(k): {path}: {', '.join(missing)}"
        )
    return data

def read_firmware_define(path: str, name: str) -> str:
    text = (ROOT / path).read_text(encoding="utf-8")
    m = re.search(rf'(?m)^#define\s+{re.escape(name)}\s+"([^"]+)"', text)
    if not m:
        raise RuntimeError(f"Nem található {name}: {path}")
    return m.group(1)

def main() -> int:
    release_data = json.loads(
        (ROOT / "release-versions.json").read_text(encoding="utf-8")
    )

    expected = release_data.get("application")
    if not isinstance(expected, str) or not expected:
        raise RuntimeError("Hiányzó kanonikus application verzió: release-versions.json")

    application_release = release_data.get("applicationRelease", {})
    if application_release.get("version") != expected:
        raise RuntimeError(
            "release-versions.json applicationRelease.version eltér a kanonikus application mezőtől"
        )

    channel = release_data.get("channel")
    if channel not in {"beta", "stable"}:
        raise RuntimeError(f"Nem támogatott release channel: {channel}")

    if application_release.get("channel") != channel:
        raise RuntimeError(
            "release-versions.json applicationRelease.channel eltér a kanonikus channeltől"
        )

    if channel == "beta" and not re.fullmatch(r"\d+\.\d+\.\d+-beta\.\d+", expected):
        raise RuntimeError(f"Beta application verzióformátum hibás: {expected}")
    if channel == "stable" and not re.fullmatch(r"\d+\.\d+\.\d+", expected):
        raise RuntimeError(f"Stable application verzióformátum hibás: {expected}")

    canonical_firmware = release_data.get("firmware")
    canonical_direct_api = release_data.get("directApi")
    firmware_release = release_data.get("firmwareRelease", {})
    direct_api_release = release_data.get("directApiRelease", {})

    if not isinstance(canonical_firmware, str) or not canonical_firmware:
        raise RuntimeError("Hiányzó kanonikus firmware verzió: release-versions.json")
    if not isinstance(canonical_direct_api, str) or not canonical_direct_api:
        raise RuntimeError("Hiányzó kanonikus Direct API verzió: release-versions.json")

    if firmware_release.get("recommendedVersion") != canonical_firmware:
        raise RuntimeError(
            "release-versions.json firmwareRelease.recommendedVersion eltér a kanonikus firmware mezőtől"
        )
    if direct_api_release.get("version") != canonical_direct_api:
        raise RuntimeError(
            "release-versions.json directApiRelease.version eltér a kanonikus Direct API mezőtől"
        )

    firmware_channel = firmware_release.get("channel")
    if firmware_channel not in {"beta", "stable"}:
        raise RuntimeError(f"Nem támogatott firmware release channel: {firmware_channel}")

    firmware_meta = read_firmware_release_metadata("firmware/firmware-release.json")
    firmware_source_version = read_firmware_define(
        "firmware/ArduinoLedController/ArduinoLedController.ino", "FIRMWARE_VERSION"
    )
    firmware_source_direct_api = read_firmware_define(
        "firmware/ArduinoLedController/ArduinoLedController.ino", "DIRECT_API_VERSION"
    )

    if firmware_meta.get("channel") != firmware_channel:
        raise RuntimeError(
            "firmware/firmware-release.json channel eltér a firmware release channeltől"
        )
    if firmware_meta.get("board") != release_data.get("board"):
        raise RuntimeError(
            "firmware/firmware-release.json board eltér a release-versions.json board mezőtől"
        )
    if firmware_meta.get("otaPort") != release_data.get("otaPort"):
        raise RuntimeError(
            "firmware/firmware-release.json otaPort eltér a release-versions.json otaPort mezőtől"
        )

    staging_expected_candidate = expected_release_candidate(expected, channel)
    staging_surfaces = {
        "deploy/staging.env.example.RELEASE_TARGET_VERSION":
            read_env_value("deploy/staging.env.example", "RELEASE_TARGET_VERSION"),
        "deploy/staging.env.example.RELEASE_CANDIDATE":
            read_env_value("deploy/staging.env.example", "RELEASE_CANDIDATE"),
    }
    staging_expected = {
        "deploy/staging.env.example.RELEASE_TARGET_VERSION": expected,
        "deploy/staging.env.example.RELEASE_CANDIDATE": staging_expected_candidate,
    }

    version_file = read_version_file()

    versions = {
        "VERSION": version_file,
        "package.json": read_json_version("package.json"),
        "package-lock.json": read_lock_version("package-lock.json"),
        "desktop-tauri/package.json": read_json_version("desktop-tauri/package.json"),
        "desktop-tauri/package-lock.json": read_lock_version("desktop-tauri/package-lock.json"),
        "desktop-tauri/src-tauri/Cargo.toml": read_cargo_version("desktop-tauri/src-tauri/Cargo.toml"),
        "desktop-tauri/src-tauri/Cargo.lock": read_cargo_lock_version(
            "desktop-tauri/src-tauri/Cargo.lock", "arduino-led-controller"
        ),
        "desktop-tauri/src-tauri/tauri.conf.json": read_json_version(
            "desktop-tauri/src-tauri/tauri.conf.json"
        ),
        "web-lxc/package.json": read_json_version("web-lxc/package.json"),
        "docs/api/openapi-v2.json": read_openapi_version("docs/api/openapi-v2.json"),
        "release-versions.json.application": read_release_application("release-versions.json"),
        "desktop-tauri/src/services/tauriApi.ts.APP_VERSION": read_ts_app_version(
            "desktop-tauri/src/services/tauriApi.ts"
        ),
    }

    web_lock = ROOT / "web-lxc/package-lock.json"
    if web_lock.exists():
        versions["web-lxc/package-lock.json"] = read_lock_version(
            "web-lxc/package-lock.json"
        )

    firmware_surfaces = {
        "release-versions.json.firmware": canonical_firmware,
        "release-versions.json.firmwareRelease.recommendedVersion":
            firmware_release.get("recommendedVersion"),
        "firmware/firmware-release.json.firmwareVersion":
            firmware_meta.get("firmwareVersion"),
        "firmware/ArduinoLedController.ino.FIRMWARE_VERSION":
            firmware_source_version,
    }

    direct_api_surfaces = {
        "release-versions.json.directApi": canonical_direct_api,
        "release-versions.json.directApiRelease.version":
            direct_api_release.get("version"),
        "firmware/firmware-release.json.directApiVersion":
            firmware_meta.get("directApiVersion"),
        "firmware/ArduinoLedController.ino.DIRECT_API_VERSION":
            firmware_source_direct_api,
    }

    app_mismatches = {k: v for k, v in versions.items() if v != expected}
    firmware_mismatches = {
        k: v for k, v in firmware_surfaces.items() if v != canonical_firmware
    }
    direct_api_mismatches = {
        k: v for k, v in direct_api_surfaces.items() if v != canonical_direct_api
    }

    staging_mismatches = {
        key: value
        for key, value in staging_surfaces.items()
        if value != staging_expected[key]
    }

    print(f"Kanonikus projektverzió (release-versions.json): {expected}")
    print(f"Kanonikus release channel: {channel}")
    for path, value in versions.items():
        print(f"{'OK' if value == expected else 'ELTÉRÉS':8} {path}: {value}")

    print(f"\nKanonikus firmware verzió: {canonical_firmware}")
    print(f"Kanonikus firmware channel: {firmware_channel}")
    for path, value in firmware_surfaces.items():
        print(f"{'OK' if value == canonical_firmware else 'ELTÉRÉS':8} {path}: {value}")

    print(f"\nKanonikus Direct API verzió: {canonical_direct_api}")
    for path, value in direct_api_surfaces.items():
        print(f"{'OK' if value == canonical_direct_api else 'ELTÉRÉS':8} {path}: {value}")

    print(f"\nKanonikus staging RELEASE_TARGET_VERSION: {expected}")
    print(f"Kanonikus staging RELEASE_CANDIDATE: {staging_expected_candidate}")
    for path, value in staging_surfaces.items():
        expected_value = staging_expected[path]
        print(f"{'OK' if value == expected_value else 'ELTÉRÉS':8} {path}: {value}")

    if app_mismatches or firmware_mismatches or direct_api_mismatches or staging_mismatches:
        print(
            "\nHIBA: az application / firmware / Direct API / staging SSOT felületek nem egyeznek.",
            file=sys.stderr,
        )
        return 1

    print("\nMinden kanonikus application / firmware / Direct API / staging SSOT felület egyezik.")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"HIBA: {exc}", file=sys.stderr)
        raise SystemExit(1)
