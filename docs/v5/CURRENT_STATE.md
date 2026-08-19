# Arduino LED Controller – Current Beta State

## Aktuális verziók

- Alkalmazás: `5.6.1-beta.6`
- Firmware Beta: `5.0.0-beta.10`
- Direct API: `1.0.0`
- Fejlesztési ág: `next/v5-rearchitecture`
- Jelenlegi Stable alkalmazás a `main` ágon: `5.1.0`
- Stable firmware: jelenleg nincs publikálva
- Tervezett Stable promóció a sikeres Beta után: alkalmazás `5.6.1`, firmware `5.0.0`

## Release- és channel-identitás

A futó alkalmazás build-identitása és a kiválasztott alkalmazásfrissítési csatorna külön fogalom.

- A `5.6.1-beta.6` futó build mindig Beta build marad.
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


## P0 architecture consolidation / Beta.3

- `release-versions.json` a kanonikus application release SSOT.
- Current tesztek version-driven és channel-aware módon futnak.
- Historical/legacy audit nem blokkolja a default current regressziót.
- Beta workflow nem duplikál `EXPECTED_VERSION` / `EXPECTED_BRANCH` értékeket.
- Device Key forward-sync Beta identitás mellett aktív.
- Minden GitHub application publication új verziót és teljes dokumentációs készletet igényel.
- Firmware változatlanul `5.0.0-beta.10`.

## P1 release runner resilience / Beta.4

- P0 műszaki scope lezárva.
- P1 első célja a build/release runner dependency telepítésének megbízhatósága.
- Közös Linux/Tauri installer, APT retry/network timeout/dpkg lock timeout/noninteractive mód és step timeout aktív.
- Firmware változatlanul `5.0.0-beta.10`.

## P1 release asset contract / Beta.5

- Beta.4 runner hardening runtimeban működött; minden platform build sikeres volt.
- A publish asset verifierből hiányzott az `VERIFIED_VERSION` env.
- Beta és Stable verifier most explicit validált application verziót kap.
- Asset cardinality hibák diagnosztikus logot adnak.
- Firmware továbbra is `5.0.0-beta.10`.

## Következő release-lépés

1. Current dokumentáció + teljes regresszió zöld.
2. Dokumentáció commit/push NEXT-re.
3. `Application Beta release` kézi indítása `next/v5-rearchitecture` ágról.
4. A publikált `5.6.1-beta.6` build tényleges telepítési és runtime QA-ja.
5. Csak sikeres Beta QA után készülhet Stable `5.6.1` + firmware `5.0.0` promóció a `main` ágra.


## P1 APT mirror recovery / Beta.6

- Beta.5 release asset contract source fix passed local regression and was published.
- Beta.5 runtime release failed in the Linux dependency gate because the hosted Ubuntu runner stalled against `azure.archive.ubuntu.com`.
- Beta.6 normalizes that mirror to HTTPS archive.ubuntu.com and adds process-tree kill enforcement.
- Firmware remains `5.0.0-beta.10` and Direct API remains `1.0.0`.
