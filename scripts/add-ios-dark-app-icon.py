#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path


def fail(message: str) -> None:
    raise SystemExit(f"HIBA: {message}")


if len(sys.argv) != 4:
    fail("használat: add-ios-dark-app-icon.py <appiconset-dir> <light-master> <dark-master>")

appicon_dir = Path(sys.argv[1]).resolve()
light_master = Path(sys.argv[2]).resolve()
dark_master = Path(sys.argv[3]).resolve()
contents_path = appicon_dir / "Contents.json"

for required in (appicon_dir, light_master, dark_master, contents_path):
    if not required.exists():
        fail(f"hiányzik: {required}")

data = json.loads(contents_path.read_text(encoding="utf-8"))
images = data.get("images")
if not isinstance(images, list):
    fail("Contents.json images tömb hiányzik")

light_name = "V5-AppIcon-1024-Light.png"
dark_name = "V5-AppIcon-1024-Dark.png"

shutil.copyfile(light_master, appicon_dir / light_name)
shutil.copyfile(dark_master, appicon_dir / dark_name)


def is_ios_universal_1024(entry: dict) -> bool:
    return (
        entry.get("idiom") == "universal"
        and entry.get("platform") == "ios"
        and entry.get("size") == "1024x1024"
    )


def dark_appearance(entry: dict) -> bool:
    appearances = entry.get("appearances")
    if not isinstance(appearances, list):
        return False
    return any(
        isinstance(item, dict)
        and item.get("appearance") == "luminosity"
        and item.get("value") == "dark"
        for item in appearances
    )


light_entry = next(
    (
        entry
        for entry in images
        if isinstance(entry, dict)
        and is_ios_universal_1024(entry)
        and not entry.get("appearances")
    ),
    None,
)

if light_entry is None:
    light_entry = {
        "filename": light_name,
        "idiom": "universal",
        "platform": "ios",
        "size": "1024x1024",
    }
    images.insert(0, light_entry)
else:
    light_entry["filename"] = light_name

dark_entry = next(
    (
        entry
        for entry in images
        if isinstance(entry, dict)
        and is_ios_universal_1024(entry)
        and dark_appearance(entry)
    ),
    None,
)

if dark_entry is None:
    dark_entry = {
        "appearances": [{"appearance": "luminosity", "value": "dark"}],
        "filename": dark_name,
        "idiom": "universal",
        "platform": "ios",
        "size": "1024x1024",
    }
    images.insert(images.index(light_entry) + 1, dark_entry)
else:
    dark_entry["filename"] = dark_name
    dark_entry["appearances"] = [{"appearance": "luminosity", "value": "dark"}]

data["images"] = images
contents_path.write_text(
    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

reloaded = json.loads(contents_path.read_text(encoding="utf-8"))
ios_entries = [
    entry
    for entry in reloaded.get("images", [])
    if isinstance(entry, dict) and is_ios_universal_1024(entry)
]

light_ok = any(
    entry.get("filename") == light_name and not entry.get("appearances")
    for entry in ios_entries
)
dark_ok = any(
    entry.get("filename") == dark_name and dark_appearance(entry)
    for entry in ios_entries
)

if not light_ok:
    fail("iOS universal Light 1024 entry nem jött létre")
if not dark_ok:
    fail("iOS universal Dark 1024 appearance entry nem jött létre")

print(f"IOS_APPICONSET={appicon_dir}")
print(f"IOS_LIGHT_APPICON={light_name}")
print(f"IOS_DARK_APPICON={dark_name}")
print("IOS_DARK_APPEARANCE=luminosity:dark")
print("V419_IOS_DARK_APPICON_CATALOG=PASSED")
