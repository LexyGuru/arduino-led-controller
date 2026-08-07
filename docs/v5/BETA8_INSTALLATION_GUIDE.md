# Arduino LED Controller 5.0.0-beta.8 telepítési útmutató

A Beta.8 GitHub prerelease tagje: `v5.0.0-beta.8`.
A kiadás neve: **Neon Panel UI Stabilization**.

Minden alkalmazásartifact ugyanabból a Beta.8 release commitból készül. Telepítés előtt ellenőrizd a `SHA256SUMS` fájlt. A `RELEASE-MANIFEST.json`, `SBOM.cdx.json`, `PROVENANCE.json` és `SECRET-SCAN.json` a kiadás eredetét és integritását dokumentálja.

## Windows x86_64

`Arduino_LED_Controller_5.0.0-beta.8_Windows_x86_64_Setup.exe`

```powershell
Get-FileHash .\Arduino_LED_Controller_5.0.0-beta.8_Windows_x86_64_Setup.exe -Algorithm SHA256
```

A béta telepítő nincs kereskedelmi kódtanúsítvánnyal aláírva, ezért a Windows SmartScreen figyelmeztethet.

## macOS Apple Silicon

`Arduino_LED_Controller_5.0.0-beta.8_macOS_Apple_Silicon.dmg`

```bash
shasum -a 256 Arduino_LED_Controller_5.0.0-beta.8_macOS_Apple_Silicon.dmg
```

A csomag jelenleg nincs notarizálva.

## macOS Intel

`Arduino_LED_Controller_5.0.0-beta.8_macOS_Intel.dmg`.

## Linux x86_64 – AppImage

```bash
sha256sum Arduino_LED_Controller_5.0.0-beta.8_Linux_x86_64.AppImage
chmod +x Arduino_LED_Controller_5.0.0-beta.8_Linux_x86_64.AppImage
```

## Debian/Ubuntu x86_64 – DEB

```bash
sha256sum Arduino_LED_Controller_5.0.0-beta.8_Linux_x86_64.deb
sudo apt install ./Arduino_LED_Controller_5.0.0-beta.8_Linux_x86_64.deb
```

## Android

A workflow aláírt release secret esetén APK-t, egyébként debug APK-t és unsigned AAB-t készít.

## iPhone és iPad

A `Arduino_LED_Controller_5.0.0-beta.8_iOS_iPadOS_unsigned.ipa` nincs Apple tanúsítvánnyal aláírva; saját aláírás vagy sideload szükséges.

## Debian 12 / Proxmox LXC szerver

Előfeltételek: root, Node.js 20+, `curl`, `tar`, `npm`, `systemd`, `sha256sum`.

```bash
curl -fLO https://github.com/LexyGuru/arduino-led-controller/releases/download/v5.0.0-beta.8/install-beta-lxc.sh
chmod +x install-beta-lxc.sh
sudo ./install-beta-lxc.sh
```

A staging alapból loopback Arduino-célt használ; a produkciós `10.0.0.123` cél alapból tiltott.

## Arduino UNO R4 WiFi firmware

Az alkalmazásrelease nem tartalmaz firmware BIN-t. A kompatibilis firmware a dedikált `Arduino_LED_Controller_Firmware_BETA` prerelease-ben jelenik meg.

- alkalmazás: `5.0.0-beta.8`
- firmware: `5.0.0-beta.6`
- Direct API: `1.0.0`

## Supply-chain ellenőrzés

- `SHA256SUMS`
- `RELEASE-MANIFEST.json`
- `SBOM.cdx.json`
- `PROVENANCE.json`
- `SECRET-SCAN.json`
