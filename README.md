# Arduino LED Controller – Proxmox LXC

Arduino UNO R4 WiFi LED-vezérlő és heti időzítő. Az ütemezéseket a szerver tárolja, ezért SD-kártya nélkül is működik.

## Arduino Wi-Fi beállítás

A GitHubra nem kerül Wi-Fi jelszó. Az Arduino IDE-ben másold át a
`secrets.example.h` fájlt `secrets.h` néven, majd írd bele a saját Wi-Fi nevet
és jelszót. A helyi `secrets.h` fájl automatikusan kimarad a Gitből.

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
git clone https://github.com/SAJAT_FELHASZNALONEV/arduino-led-controller.git /opt/arduino-led-controller
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

## Frissítés GitHubról

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
