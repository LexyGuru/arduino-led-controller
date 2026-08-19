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
        versions["web-lxc/package-lock.json"] = read_lock_version("web-lxc/package-lock.json")

    mismatches = {k: v for k, v in versions.items() if v != expected}

    print(f"Kanonikus projektverzió (release-versions.json): {expected}")
    print(f"Kanonikus release channel: {channel}")
    for path, value in versions.items():
        print(f"{'OK' if value == expected else 'ELTÉRÉS':8} {path}: {value}")

    if mismatches:
        print("\nHIBA: a projekt verziófelületei nem egyeznek.", file=sys.stderr)
        return 1

    print("\nMinden kanonikus alkalmazásverzió egyezik.")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"HIBA: {exc}", file=sys.stderr)
        raise SystemExit(1)
