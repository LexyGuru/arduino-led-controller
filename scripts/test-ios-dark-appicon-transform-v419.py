#!/usr/bin/env python3
import json
import subprocess
import tempfile
from pathlib import Path

with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    appicon = tmp / "AppIcon.appiconset"
    appicon.mkdir()

    (appicon / "Contents.json").write_text(json.dumps({
        "images": [
            {
                "filename": "AppIcon-512@2x.png",
                "idiom": "ios-marketing",
                "scale": "1x",
                "size": "1024x1024"
            },
            {
                "filename": "AppIcon-60x60@3x.png",
                "idiom": "iphone",
                "scale": "3x",
                "size": "60x60"
            }
        ],
        "info": {"author": "xcode", "version": 1}
    }, indent=2) + "\n")

    light = tmp / "light.png"
    dark = tmp / "dark.png"
    light.write_bytes(b"LIGHT")
    dark.write_bytes(b"DARK")

    subprocess.run([
        "python3",
        "scripts/add-ios-dark-app-icon.py",
        str(appicon),
        str(light),
        str(dark),
    ], check=True)

    data = json.loads((appicon / "Contents.json").read_text())
    images = data["images"]

    assert any(
        x.get("idiom") == "ios-marketing"
        and x.get("filename") == "AppIcon-512@2x.png"
        for x in images
    )

    assert any(
        x.get("idiom") == "universal"
        and x.get("platform") == "ios"
        and x.get("size") == "1024x1024"
        and x.get("filename") == "V5-AppIcon-1024-Light.png"
        and "appearances" not in x
        for x in images
    )

    assert any(
        x.get("idiom") == "universal"
        and x.get("platform") == "ios"
        and x.get("size") == "1024x1024"
        and x.get("filename") == "V5-AppIcon-1024-Dark.png"
        and x.get("appearances") == [{"appearance": "luminosity", "value": "dark"}]
        for x in images
    )

print("TAURI_LEGACY_IOS_ICON_ENTRIES=PRESERVED")
print("IOS_UNIVERSAL_LIGHT_1024=PASSED")
print("IOS_UNIVERSAL_DARK_1024=PASSED")
print("V419_IOS_DARK_APPICON_TRANSFORM=PASSED")
