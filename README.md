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

### macOS első indítás

A GitHub Release-ből letöltött alkalmazás jelenleg nincs Apple-tanúsítvánnyal
notarizálva, ezért a macOS első indításkor blokkolhatja vagy „sérült”
alkalmazásként jelezheti. Ez csak akkor fordulhat elő biztonságosan, ha a fájl
közvetlenül ennek a projektnek a GitHub **Releases** oldaláról származik.

Húzd az alkalmazást az `Applications` mappába, majd a Terminalban futtasd:

```bash
xattr -dr com.apple.quarantine "/Applications/Arduino LED Controller.app"
```

Ez csak az adott alkalmazás macOS karanténjelölését távolítja el. A végleges,
figyelmeztetésmentes terjesztéshez Apple Developer tanúsítvány és notarizálás
szükséges.

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

## Védett Arduino API és távoli elérés

Az Arduino HTTP API-ja nem érhető el közvetlenül a szokásos `/api/...`
útvonalon. Minden kéréshez kell egy hosszú, véletlen privát útvonal és egy
külön API-kulcs. Ez csökkenti a véletlen internetes próbálkozásokat, az
Arduino pedig rossz kérésnél az első HTTP sor után azonnal bontja a
kapcsolatot.

Első alkalommal az USB-s feltöltés előtt add hozzá a saját, hosszú értékeidet
a **csak helyben lévő** `firmware/ArduinoLedController/secrets.h` fájlhoz:

```cpp
#define API_PRIVATE_PATH "/peldaul_egy_hosszu_veletlen_utvonal_2026"
#define API_SHARED_SECRET "legalabb_32_karakteres_veletlen_api_kulcs"
```

A két érték előállításához nyisd meg helyben a
`tools/api-kulcs-generator.html` fájlt. Az eszköz nem használ internetet és
nem menti el a generált értékeket.

Ugyanezeket az értékeket add meg a Proxmox konténerben az
`/etc/arduino-led-controller.env` fájlban:

```text
ARDUINO_API_PATH=/peldaul_egy_hosszu_veletlen_utvonal_2026
ARDUINO_API_KEY=legalabb_32_karakteres_veletlen_api_kulcs
```

Ezután indítsd újra a szolgáltatást:

```bash
systemctl restart arduino-led-controller
```

A Tauri alkalmazás **Kapcsolat és védelem** részében ugyanezt a privát
útvonalat és API-kulcsot kell megadni. A kulcs nem jelenik meg sem az Arduino,
sem az alkalmazás hálózati naplójában.

Ha a routerben később külső `25666` portot irányítasz az Arduino belső `80`
portjára, a Proxmoxon továbbra is a belső IP-címet és `80`-as portot használd.
Ez a védelem nem helyettesíti a HTTPS-t vagy a VPN-t; csak átmeneti,
közvetlen eléréshez készült.

### Hálózati és porttovábbítási térkép

Az eszközöknek azonos otthoni hálózaton **nem kell** porttovábbítás: a
Proxmox, a böngésző és a Tauri alkalmazás közvetlenül eléri a belső IP-címeket.
Az Arduino IP-címének érdemes DHCP-foglalást beállítani a routerben, például
`10.0.0.123` értékre.

| Használat | Routerben szükséges szabály | Cél |
| --- | --- | --- |
| Proxmox → Arduino, helyi hálózaton | nincs | Arduino belső IP-je, `80` |
| Tauri alkalmazás → Arduino, helyi hálózaton | nincs | Arduino belső IP-je, `80` |
| Böngésző → Proxmox, helyi hálózaton | nincs | LXC belső IP-je, `443` |
| Távoli böngészős elérés | külső `443/TCP` → LXC `443/TCP` | Proxmox HTTPS felület |
| Távoli Tauri → Arduino, csak ideiglenesen | külső `25666/TCP` → Arduino `80/TCP` | Arduino védett HTTP API |

Távoli, közvetlen Tauri elérésnél az alkalmazásban a router publikus IP-címét
vagy dinamikus DNS-nevét és a `25666` portot add meg, a belső hálózaton pedig
mindig az Arduino belső IP-jét és a `80` portot használd. Egyes routerek nem
támogatják a saját publikus címükön történő belső tesztet; ezt mobilnetről
lehet helyesen kipróbálni.

**Ne nyisd ki** az Arduino `3232` OTA-portját, a Proxmox `3000`/`81` portját
vagy a router adminisztrációs felületét az internet felé. A `25666` csak
elrejtés, nem HTTPS: a védett útvonal és API-kulcs kötelező, a hosszú távú
megoldás továbbra is VPN vagy HTTPS relay.

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
