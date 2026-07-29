#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read_version_file() -> str:
    path = ROOT / "VERSION"
    if not path.exists():
        raise RuntimeError("Hiányzik a VERSION fájl.")

    value = path.read_text(encoding="utf-8").strip()
    if not value:
        raise RuntimeError("A VERSION fájl üres.")

    return value


def read_json_version(relative_path: str) -> str:
    path = ROOT / relative_path
    data = json.loads(path.read_text(encoding="utf-8"))

    value = data.get("version")
    if not isinstance(value, str) or not value:
        raise RuntimeError(f"Hiányzó vagy hibás version mező: {relative_path}")

    return value


def read_openapi_version(relative_path: str) -> str:
    path = ROOT / relative_path
    data = json.loads(path.read_text(encoding="utf-8"))

    info = data.get("info")
    value = info.get("version") if isinstance(info, dict) else None

    if not isinstance(value, str) or not value:
        raise RuntimeError(
            f"Hiányzó vagy hibás info.version mező: {relative_path}"
        )

    return value


def read_cargo_version(relative_path: str) -> str:
    path = ROOT / relative_path
    text = path.read_text(encoding="utf-8")
    match = re.search(
        r'(?ms)^\[package\]\s*.*?^version\s*=\s*"([^"]+)"',
        text,
    )
    if not match:
        raise RuntimeError(f"Nem található [package] version: {relative_path}")

    return match.group(1)


def main() -> int:
    expected = read_version_file()
    versions = {
        "VERSION": expected,
        "package.json": read_json_version("package.json"),
        "desktop-tauri/package.json": read_json_version(
            "desktop-tauri/package.json"
        ),
        "desktop-tauri/src-tauri/Cargo.toml": read_cargo_version(
            "desktop-tauri/src-tauri/Cargo.toml"
        ),
        "desktop-tauri/src-tauri/tauri.conf.json": read_json_version(
            "desktop-tauri/src-tauri/tauri.conf.json"
        ),
        "docs/api/openapi-v2.json": read_openapi_version(
            "docs/api/openapi-v2.json"
        ),
    }
    mismatches = {
        path: value
        for path, value in versions.items()
        if value != expected
    }

    print(f"Elvárt projektverzió: {expected}")
    for path, value in versions.items():
        status = "OK" if value == expected else "ELTÉRÉS"
        print(f"{status:8} {path}: {value}")

    if mismatches:
        print("\nHIBA: a projekt verziófájljai nem egyeznek.", file=sys.stderr)
        return 1

    print("\nMinden projektverzió egyezik.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"HIBA: {exc}", file=sys.stderr)
        raise SystemExit(1)
