# Arduino LED Controller – Current Beta State

## Aktuális verziók

- Alkalmazás: `5.6.1`
- Firmware Beta: `5.0.0`
- Direct API: `1.0.0`
- Fejlesztési ág: `next/v5-rearchitecture`
- Jelenlegi Stable alkalmazás a `main` ágon: `5.1.0`
- Stable firmware: jelenleg nincs publikálva
- Tervezett Stable promóció a sikeres Beta után: alkalmazás `5.6.1`, firmware `5.0.0`

## Release- és channel-identitás

A futó alkalmazás build-identitása és a kiválasztott alkalmazásfrissítési csatorna külön fogalom.

- A `5.6.1` futó build mindig Beta build marad.
- Application Update Channel = Stable csak a Stable update-katalógust választja.
- Application Update Channel = Beta a Beta update-katalógust választja.

A firmware ugyanígy két külön állapotot kezel:

- Installed firmware identity = a ténylegesen telepített firmware verziója.
- Firmware Update Channel = a kiválasztott Stable/Beta firmware-katalógus.

Stable firmware nézetben Beta firmware nem jelenhet meg.
A Stable firmware-katalógus a `5.0.0` promóciója előtt helyesen lehet üres.

## Startup UX és diagnosztika

- Normál háttérben folytatódó startup művelet nem warning.
- Valódi degraded/error startup állapot a Dashboardon a loading screen után is látható.
- A startup card nem görgethető belül.
- Egészséges macOS kapcsolat után a helyreállt első Keychain/bootstrap credential zaj nem marad Latest Error.
- Valódi tartós kapcsolat-hiba továbbra is látható.

## Update Center

Ha új alkalmazásverzió érhető el:

- a Sidebar tartós update kártyát mutat;
- a célverzió látható;
- a kártya a Settings / Update Center oldalra navigál;
- a Settings navigációs pont másodlagos jelzésként megmarad.

## macOS OTA

A Beta.7 óta védett macOS OTA contract változatlan:

- natív uploader elsődleges;
- Terminal fallback megmarad;
- LAN target viselkedés zárolt;
- reboot után legfeljebb 180 másodperces Direct API megerősítés;
- a védett OTA függvényhash-ek változatlanok.

## GitHub Actions

A kanonikus workflow-készlet:

- `app-build.yml`
- `app-staging-build.yml`
- `app-beta-release.yml`
- `app-stable-release.yml`
- `firmware-build.yml`
- `firmware-beta-release.yml`
- `firmware-stable-release.yml`

Kivezetett workflow-k:

- `beta-release.yml`
- `tauri-desktop.yml`
- `tauri-artifact-build.yml`

Az alkalmazás- és firmware-release külön kézi folyamat.
A Beta application release nem módosítja automatikusan a `main` ágat és nem publikál automatikusan firmware-release-t.

## Platform contract

A shared React frontend desktopon, mobilon és Debian 13 Rust LXC környezetben közös.
A Direct Arduino mód továbbra is elsődleges, LXC nélkül is használható.

## Következő release-lépés

1. Current dokumentáció + teljes regresszió zöld.
2. Dokumentáció commit/push NEXT-re.
3. `Application Beta release` kézi indítása `next/v5-rearchitecture` ágról.
4. A publikált `5.6.1` build tényleges telepítési és runtime QA-ja.
5. Csak sikeres Beta QA után készülhet Stable `5.6.1` + firmware `5.0.0` promóció a `main` ágra.
