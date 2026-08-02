# Arduino LED Controller 5.0.0-beta.4 telepítési útmutató

A Beta.4 GitHub prerelease tagje: `v5.0.0-beta.4`. Minden fájl ugyanabból a commitból készül. Telepítés előtt ellenőrizd a `SHA256SUMS` fájlt. A `RELEASE-MANIFEST.json`, `SBOM.cdx.json`, `PROVENANCE.json` és `SECRET-SCAN.json` a kiadás eredetét és integritását dokumentálja.

## Windows x86_64

1. Töltsd le az `Arduino_LED_Controller_5.0.0-beta.4_Windows_x86_64_Setup.exe` fájlt.
2. Ellenőrizd az SHA-256 értéket PowerShellben:

```powershell
Get-FileHash .\Arduino_LED_Controller_5.0.0-beta.4_Windows_x86_64_Setup.exe -Algorithm SHA256
```

3. Indítsd el a telepítőt.
4. Mivel a béta telepítő jelenleg nincs kereskedelmi kódtanúsítvánnyal aláírva, Windows SmartScreen figyelmeztethet. Csak a projekt hivatalos GitHub prerelease fájlját futtasd.

## macOS Apple Silicon

1. Töltsd le az `Arduino_LED_Controller_5.0.0-beta.4_macOS_Apple_Silicon.dmg` fájlt.
2. Ellenőrzés:

```bash
shasum -a 256 Arduino_LED_Controller_5.0.0-beta.4_macOS_Apple_Silicon.dmg
```

3. Nyisd meg a DMG-t, és másold az alkalmazást az Applications mappába.
4. A csomag jelenleg nincs notarizálva. Kizárólag a hivatalos prerelease fájlnál használható:

```bash
xattr -dr com.apple.quarantine "/Applications/Arduino LED Controller.app"
```

## macOS Intel

Az Intel Mac gépekhez külön `Arduino_LED_Controller_5.0.0-beta.4_macOS_Intel.dmg` készül. A telepítés és az ellenőrzés megegyezik az Apple Silicon lépéseivel.

## Linux x86_64 – AppImage

```bash
sha256sum Arduino_LED_Controller_5.0.0-beta.4_Linux_x86_64.AppImage
chmod +x Arduino_LED_Controller_5.0.0-beta.4_Linux_x86_64.AppImage
./Arduino_LED_Controller_5.0.0-beta.4_Linux_x86_64.AppImage
```

## Debian/Ubuntu x86_64 – DEB

```bash
sha256sum Arduino_LED_Controller_5.0.0-beta.4_Linux_x86_64.deb
sudo apt install ./Arduino_LED_Controller_5.0.0-beta.4_Linux_x86_64.deb
```

## Android

- Aláíró secretek esetén: `Arduino_LED_Controller_5.0.0-beta.4_Android.apk`.
- Aláíró secretek nélkül: `Arduino_LED_Controller_5.0.0-beta.4_Android_debug.apk`.
- Az APK telepíthető, ha az Android engedélyezi az adott böngészőből vagy fájlkezelőből származó ismeretlen alkalmazásokat.
- Az `.aab` fájl nem közvetlenül telepíthető; Play Console vagy bundletool szükséges hozzá.

## iPhone és iPad

A `Arduino_LED_Controller_5.0.0-beta.4_iOS_iPadOS_unsigned.ipa` nincs Apple tanúsítvánnyal aláírva. Telepítés előtt saját Apple ID/Developer aláírás vagy sideload eszköz szükséges. Ez nem App Store csomag.

## Debian 12 / Proxmox LXC szerver

### Előfeltételek

- Debian 12 vagy kompatibilis rendszer.
- Root jogosultság.
- Node.js 20 vagy újabb.
- `curl`, `tar`, `npm`, `systemd` és `sha256sum`.
- Alapértelmezett staging port: `3100`, bind cím: `127.0.0.1`.

### Izolált telepítés Arduino nélkül

```bash
curl -fLO https://github.com/LexyGuru/arduino-led-controller/releases/download/v5.0.0-beta.4/install-beta-lxc.sh
chmod +x install-beta-lxc.sh
sudo ./install-beta-lxc.sh
```

Az alapértelmezett konfiguráció loopbackre és nem létező portra mutat, ezért nem vezérel LAN-on lévő Arduino-t.

### Telepítés tartalék Arduino-val

1. Töltsd le a `beta-lxc.env.example` fájlt, és másold root-only konfigurációba.
2. Töltsd ki a tartalék Arduino IP-jét, privát API-útvonalát és kulcsát.
3. Futtasd:

```bash
chmod 600 /root/arduino-led-controller-beta.env
sudo BETA_CONFIG_FILE=/root/arduino-led-controller-beta.env ./install-beta-lxc.sh
```

A produkciós `10.0.0.123` cél alapból tiltott. A béta teszthez tartalék Arduino használata javasolt.

### Állapot és napló

```bash
systemctl status arduino-led-controller-staging --no-pager
journalctl -u arduino-led-controller-staging -n 100 --no-pager
curl -fsS http://127.0.0.1:3100/health/ready
```

### Rollback

```bash
sudo bash /opt/arduino-led-controller-staging/current/deploy/rollback-versioned-release.sh
```

## Arduino UNO R4 WiFi firmware

A kiadás tartalmazza az `Arduino_LED_Controller_Firmware_4.3.0-beta.4_UNO_R4_WiFi.bin` fájlt. Első telepítéshez USB-s, saját `secrets.h` konfigurációval fordított firmware ajánlott. A publikus bináris nem tartalmaz valódi Wi-Fi-, API- vagy OTA-titkot.

A produkciós Arduino firmware-jét csak külön, dokumentált telepítési kapu után frissítsd.


## Beta.4 schedule-szinkron ellenőrzése

1. Nyisd meg a Heti időzítés képernyőt.
2. Várd meg, amíg a teljes Arduino-snapshot betöltődik.
3. Ellenőrizd, hogy az Arduino rekordszáma és a betöltött szerkesztési lista egyezik.
4. Eltérés vagy revision-konfliktus esetén a Mentés és Törlés gombnak letiltva kell maradnia.
5. Egy tesztrekord módosítása után a kliensnek teljes readbacket kell végeznie, és csak ezután jelezhet sikert.

A Beta.4 schedule-kezeléséhez nem szükséges V5/Node/LXC szerver; az Arduino Direct API az elsődleges adatforrás.
