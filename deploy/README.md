# Proxmox LXC telepítés és frissítés

A `deploy/` mappa a Node.js alapú webes vezérlő Proxmox LXC telepítését, HTTPS proxyját, OTA segédeszközét és automatikus frissítését kezeli.

## Első telepítés

```bash
apt-get update && apt-get install -y git
git clone https://github.com/LexyGuru/arduino-led-controller.git /opt/arduino-led-controller
cd /opt/arduino-led-controller
ARDUINO_IP=10.0.0.123 bash deploy/install-lxc.sh
```

## Kézi frissítés

Ne csak `git pull` parancsot futtass, mert az nem telepíti az új vagy hiányzó npm-függőségeket, és nem frissíti az `/etc/systemd/system` alatt lévő unit fájlokat.

Használd ezt:

```bash
cd /opt/arduino-led-controller
bash deploy/update.sh
```

## Helyreállítás

Hiányzó `express`, sérült `node_modules`, elavult systemd unit vagy sikertelen szolgáltatásindítás esetén:

```bash
cd /opt/arduino-led-controller
bash deploy/update.sh --repair
```

A javítás:

1. újratelepíti a systemd unit fájlokat;
2. ellenőrzi a `package.json` lenyomatát;
3. ellenőrzi az összes szükséges Node.js modult;
4. szükség esetén újratelepíti a production függőségeket;
5. ellenőrzi a `server2_final.js` szintaxisát;
6. újraindítja és ellenőrzi a szolgáltatást.

## Hasznos parancsok

```bash
systemctl status arduino-led-controller --no-pager
journalctl -u arduino-led-controller -n 80 --no-pager
systemctl status arduino-led-controller-update.timer --no-pager
systemctl start arduino-led-controller-update.service
```
