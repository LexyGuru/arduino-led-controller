# Beta.9 canonical Rust LXC

<!-- BEGIN BETA9 CANONICAL RUST LXC -->

Alkalmazás: `5.0.0-beta.10`
Firmware-katalógus: `5.0.0-beta.7`
Direct API: `1.0.0`
Backend: Rust + Axum
Frontend: shared React + Vite
HTTP port: `3000`

Canonical systemd control-plane:

- `arduino-led-controller-rust.service`
- `arduino-led-controller-update.service`
- `arduino-led-controller-update.timer`

Canonical updater: `/usr/local/sbin/arduino-led-controller-update`

A shared frontend canonical forrása `desktop-tauri/src`; az LXC bootstrap
`web-lxc/src/main.tsx`. A `/v5-icon.png` a
`desktop-tauri/public/v5-icon.png` canonical assetből származik.

A Beta csatorna a `next/v5-rearchitecture` ágat követi.

## Legacy Node LXC

A korábbi Node-alapú deploy fájlok történeti/legacy kompatibilitási útvonalat jelentenek.
A legacy service neve `arduino-led-controller.service`; ezt nem szabad globálisan
`arduino-led-controller-rust.service` névre cserélni.

<!-- END BETA9 CANONICAL RUST LXC -->

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
