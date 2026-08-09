# Rust LXC – üzemeltetés és konfiguráció

## Aktuális komponensek

- Debian 13 / Trixie
- Rust + Axum backend
- React + Vite web UI
- Arduino Direct API v1
- systemd self-update + automatikus rollback

## Arduino kapcsolat módosítása

```bash
nano /etc/arduino-led-controller/lxc.env
```

Fontos mezők:

```text
ARDUINO_PROTOCOL=http
ARDUINO_HOST=10.0.0.117
ARDUINO_PORT=80
ARDUINO_API_PATH=/PRIVATE_PREFIX
ARDUINO_DEVICE_KEY=...
```

Az `ARDUINO_API_PATH` mezőbe **csak a privát prefix** kerül. Az `/api/v1`
részt a shared Rust core maga fűzi hozzá.

Módosítás után:

```bash
systemctl restart arduino-led-controller-rust.service
systemctl status arduino-led-controller-rust.service --no-pager
curl -i http://127.0.0.1:3000/health/ready
```

## Fő fájlok

```text
/etc/arduino-led-controller/lxc.env
/etc/arduino-led-controller/update.env
/etc/arduino-led-channel
/etc/arduino-led-branch
/opt/arduino-led-controller/current/
/opt/arduino-led-controller/releases/
/var/lib/arduino-led-controller/firmware-catalog.json
/var/lib/arduino-led-controller/installed-version
/var/lib/arduino-led-controller/installed-commit
```

## Service

```bash
systemctl status arduino-led-controller-rust.service --no-pager
systemctl restart arduino-led-controller-rust.service
journalctl -u arduino-led-controller-rust.service --no-pager -n 200
```

## Automatikus updater

```bash
systemctl status arduino-led-controller-update.timer --no-pager
systemctl list-timers arduino-led-controller-update.timer
systemctl start arduino-led-controller-update.service
journalctl -u arduino-led-controller-update.service --no-pager -n 200
```

A Beta csatorna a `next/v5-rearchitecture`, a Stable csatorna a `main` ágat
követi. Az updater külön release-be buildel, atomikusan váltja a `current`
symlinket, `/health/live` + web UI gate-et használ, és hibánál rollbackel.

## Heti program

A firmware maximum 60 darab, 27 bájtos schedule rekordot tárol A/B EEPROM
slotokban. A web UI a nyers hex rekordokat emberi formára dekódolja, a teljes
listát 8-as lapokban tölti le, majd módosításkor a Direct API tranzakciós
schedule végpontjait használja.

A Mentés revision-ütközés esetén nem írja felül csendben egy másik kliens
változásait.

## Firmware katalógus

```text
/var/lib/arduino-led-controller/firmware-catalog.json
```

A natív installer és az automatikus updater is a repository
`release-versions.json` fájljából regenerálja.

A firmware bináris OTA feltöltása továbbra is a Desktop/System OTA uploader
feladata; az LXC web UI az OTA állapotot és kiadási metaadatokat jeleníti meg.

## Shared web asset runtime gate

A kanonikus frontend assetek forrása `desktop-tauri/public/`. Az LXC production webrootban a `/v5-icon.png` kötelező és HTTP 200 választ kell adjon.

A fő Rust LXC runtime unit neve `arduino-led-controller-rust.service`. A legacy Node LXC `arduino-led-controller.service` külön pipeline, nem része ennek a Rust service contractnak.

## Tranzakciós updater control-plane propagáció

A Rust LXC updater az alkalmazás első live/web/asset runtime gate-je után
tranzakciósan frissíti a runtime systemd unitot, az update service/timer unitokat,
majd `systemctl daemon-reload` és service restart után egy második runtime gate-et
futtat. Az updater saját `/usr/local/sbin/arduino-led-controller-update` példánya
csak a második gate sikere után cserélődik le.

Ha a control-plane frissítés bármely lépése vagy a második live/web/`v5-icon.png`
gate hibázik, a korábbi unitok és az előző alkalmazásrelease visszaállnak.
