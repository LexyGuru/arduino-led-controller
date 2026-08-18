# Arduino LED Controller – Current Stable State

## Aktuális verziók

- Alkalmazás: `5.6.1`
- Alkalmazáscsatorna: `stable`
- Firmware: `5.0.0`
- Firmware csatorna: `stable`
- Direct API: `1.0.0`
- Stabil ág: `main`
- Alkalmazás updater alias: `updater-stable`
- Beta fejlesztési ág: `next/v5-rearchitecture`

## Release- és channel-identitás

A telepített runtime identitása és a kiválasztott jövőbeli update-csatorna külön fogalom.

Alkalmazás:
- a telepített `5.6.1` build Stable identitású;
- Application Update Channel = Stable a Stable katalógust használja;
- Application Update Channel = Beta csak a jövőbeli update-katalógust váltja Beta csatornára;
- a selector nem írja át a futó build identitását.

Firmware:
- a telepített `5.0.0` firmware Stable identitású;
- Firmware Update Channel külön választ Stable vagy Beta katalógust;
- Stable nézetben Beta firmware nem jelenhet meg;
- Beta nézetben Stable firmware nem jelenhet meg.

## Startup UX és diagnosztika

- Normál háttérben folytatódó startup művelet nem warning.
- Valódi degraded/error startup állapot a Dashboardon látható marad.
- A startup card nem görgethető belül.
- Egészséges kapcsolat után a helyreállt első Keychain/bootstrap credential zaj nem marad Latest Error.
- Valódi tartós kapcsolat-hiba továbbra is látható.

## Update Center

- A Stable application updater alias: `updater-stable`.
- Ha új alkalmazásverzió érhető el, a Sidebar update kártyát mutat.
- A kiválasztott update channel nem módosítja a telepített runtime identitását.

## macOS OTA

A történelmi Beta.7 macOS OTA immutable contract változatlan:

- natív uploader elsődleges;
- Terminal fallback megmarad;
- LAN target viselkedés zárolt;
- reboot után legfeljebb 180 másodperces Direct API megerősítés;
- a védett OTA függvényhash-ek változatlanok.

A contract neve történelmi; a jelenlegi release Stable.

## LXC

A Stable Debian 13 Rust LXC:
- dedikált Stable bundle buildert használ;
- production metadata-t tartalmaz;
- `/opt/arduino-led-controller` install rootot használ;
- `arduino-led-controller-rust.service` szolgáltatást használ;
- Stable csatornán az `Arduino_LED_Controller_Firmware_STABLE` firmware release family-re mutat.

## GitHub Actions

Kanonikus release workflow-k:
- `app-stable-release.yml`
- `firmware-stable-release.yml`

Az alkalmazás- és firmware-release külön kézi folyamat.
A Stable Application release application/mobile/LXC asseteket publikál.
A firmware binárisok külön Stable firmware release-ben jelennek meg.

## Jelenlegi release állapot

- Stable application target: `5.6.1`
- Stable firmware target: `5.0.0`
- Direct API: `1.0.0`
- Stable branch: `main`
- NEXT/Beta branch külön marad és a Stable release nem írja át.
