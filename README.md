# Arduino LED Controller – Proxmox LXC

Node.js alapú Arduino LED-vezérlő és heti időzítő webszerver. Az ütemezéseket
a szerver tárolja, ezért SD-kártya nélkül is működik.

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
http://LXC_KONTENER_IP:3000
```

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

A firmware fordítása GitHub Actionsben történik. A **Konfiguráció → Arduino
firmware** részen a szerver letölti a legutóbbi sikeresen lefordított csomagot,
ellenőrzi azt, majd az Arduino saját, jelszavas OTA szolgáltatására küldi.

Egyszeri beállításként hozz létre GitHubon egy finomhangolt, csak olvasási
hozzáférési kulcsot a `LexyGuru/arduino-led-controller` tárolóhoz. Az
**Actions: Read-only** jogosultság szükséges. A Proxmox konténerben add hozzá
ezt, valamint az Arduino `secrets.h` fájljában lévő OTA jelszót a titkos
környezeti fájlhoz:

```bash
nano /etc/arduino-led-controller.env
```

```text
OTA_PASSWORD=az_Arduino_secrets_h_fajljaban_levo_jelszo
GITHUB_TOKEN=github_pat_...
```

Ezután indítsd újra a szolgáltatást:

```bash
systemctl restart arduino-led-controller
```

A két titok csak a Proxmox konténerben marad; nem kerül GitHubra és a
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
