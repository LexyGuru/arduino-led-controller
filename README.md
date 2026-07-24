# Arduino LED Controller – Proxmox LXC

Node.js alapú Arduino LED-vezérlő és heti időzítő webszerver. Az ütemezéseket
a szerver tárolja, ezért SD-kártya nélkül is működik.

## Windows, macOS és Linux alkalmazás

A `desktop/` Electron alkalmazás ugyanazt a kezelőfelületet használja, de a
saját gépen indít helyi szolgáltatást és közvetlenül az Arduinohoz kapcsolódik.
Így Proxmox nélkül is használható; az Arduino EEPROM-időzítője a számítógép
kikapcsolásakor is fut. Az első indításkor a **Konfiguráció** menüben add meg
az Arduino IP-címét.

Fejlesztői indítás:

```bash
npm install
npm run desktop:dev
```

Telepítőcsomagok készítése az adott rendszeren:

```bash
npm run desktop:dist
```

GitHubon egy `desktop-v1.0.0` formátumú tag létrehozása automatikusan legyártja
a Windows `.exe`, macOS `.dmg`, Linux `.AppImage` és `.deb` csomagokat a
**Actions** oldalon. A desktop alkalmazás az OTA-jelszót az operációs rendszer
titkosított tárhelyén tárolja. Windows és Linux kiadásban a hivatalos Arduino
OTA-feltöltő is a csomag része; az Apple Silicon OTA feltöltő natív
megvalósítása külön fejlesztési lépés, Intel/Rosetta binárist nem használunk.

## Proxmox LXC előkészítése

A Proxmox felületén hozz létre egy **Debian 12** LXC konténert az alábbi javasolt értékekkel:

- 1 CPU mag
- 512 MB RAM
- 4 GB lemez
- hálózat: ugyanazon a LAN-on, ahonnan az Arduino elérhető
- indítás automatikusan: bekapcsolva

## Telepítés a konténerben

```bash
apt-get update && apt-get install -y git
git clone https://github.com/LexyGuru/arduino-led-controller.git /opt/arduino-led-controller
cd /opt/arduino-led-controller
ARDUINO_IP=10.0.0.117 bash deploy/install-lxc.sh
```

Az `ARDUINO_IP` értékét az Arduino tényleges IP-címére cseréld.

Ezután a kezelőfelület címe:

```text
https://LXC_KONTENER_IP
```

Az első megnyitásnál minden eszközön fogadd el/telepítsd a Caddy helyi
tanúsítványát. A tanúsítvány a konténerben itt található:

```text
/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt
```

Letölthető a telepítés után erről a címről is:

```text
https://LXC_KONTENER_IP/caddy-root-ca.crt
```

Így a belépési és OTA-jelszavak HTTPS-en, titkosítva közlekednek a helyi
hálózaton. Az első látogatáskor a felület adminisztrátori fiók létrehozását
kéri; további felhasználókat és a szervernaplót a Konfiguráció menüben kezelhet
az adminisztrátor.

## Hasznos parancsok

```bash
systemctl status arduino-led-controller
journalctl -u arduino-led-controller -f
systemctl restart arduino-led-controller
```

## Automatikus frissítés GitHubról

A telepítő bekapcsol egy óránként futó frissítés-ellenőrzőt. Ha a GitHub `main`
ágán új verzió van, előbb külön munkakönyvtárban ellenőrzi a Node kódot és
telepíti a szükséges csomagokat. Csak sikeres ellenőrzés után frissíti az
alkalmazást és indítja újra a szolgáltatást.

Ellenőrzés és kézi indítás:

```bash
systemctl status arduino-led-controller-update.timer
systemctl start arduino-led-controller-update.service
journalctl -u arduino-led-controller-update.service -n 50
```

Ha a konténerben valaki kézzel módosította a program fájljait, a frissítő
biztonságból nem írja felül őket.

## Arduino firmware frissítése a webfelületről

A firmware fordítása GitHub Actionsben történik. Sikeres fordítás után a
bináris és az ellenőrzőösszege automatikusan a nyilvános `firmware-latest`
GitHub kiadásba kerül. A **Konfiguráció → Arduino firmware** részen a szerver
onnan tölti le, ellenőrzi, majd az Arduino saját, jelszavas OTA szolgáltatására
küldi. GitHub token nem szükséges.

Mielőtt az OTA gomb használható, USB-n egyszer fel kell tölteni a 3.1.0 vagy
újabb firmware-t a saját, nem GitHubra feltöltött `secrets.h` fájloddal. Ez az
Arduino EEPROM memóriájába menti a WiFi- és OTA-beállításokat; a későbbi
nyilvános GitHub-bináris ezeket használja, ezért nem választhatja le az
eszközt a WiFi-ről.

Egyszeri beállításként csak az Arduino `secrets.h` fájljában lévő OTA jelszót
add hozzá a Proxmox titkos környezeti fájljához:

```bash
nano /etc/arduino-led-controller.env
```

```text
OTA_PASSWORD=az_Arduino_secrets_h_fajljaban_levo_jelszo
```

Ezután indítsd újra a szolgáltatást:

```bash
systemctl restart arduino-led-controller
```

A jelszó csak a Proxmox konténerben marad; nem kerül GitHubra és a
webfelület sem jeleníti meg. Firmware-t csak a **Firmware telepítése** gomb
indít el, a szerver saját magától nem írja át az Arduino programját.

## Kézi frissítés GitHubról

```bash
cd /opt/arduino-led-controller
git pull
bash deploy/install-lxc.sh
```

## Tartós adatok

Az időzítések itt tárolódnak, ezért GitHub frissítéskor is megmaradnak:

```text
/opt/arduino-led-controller/schedules/weekly-led-schedules.json
```

Az alkalmazásnak folyamatosan futnia kell, hogy a heti időzítések a megadott időpontban végrehajtódjanak.
