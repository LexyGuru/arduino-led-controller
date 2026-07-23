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
