# Alpha.2 staging izolációs és readiness hotfix v2

## Cél

Ez a csomag a `feature/v5-server-modularization` ág Alpha.2 staging telepítésének
aktuális blokkoló hibáját javítja. A módosítás nem promóció, nem verzióvéglegesítés,
és nem érinti a `main` ágat vagy a produkciós szolgáltatást.

A diagnosztizált staging readiness hibák:

- `ARDUINO_API_PATH_INVALID`
- `ARDUINO_API_KEY_INVALID`
- hiányzó firmware runtime könyvtár (`ENOENT`)

## Biztonsági határ

A staging konfiguráció szándékosan nem örököl Arduino IP-címet, API-kulcsot,
privát API-útvonalat vagy OTA-jelszót a produkciós env-fájlból.

A staging alapértékei:

- bind cím: `127.0.0.1`
- Arduino cél: `127.0.0.1:65535`
- API-útvonal: `/__alpha2_staging_disabled__`
- dokumentációs API-kulcs: `<STAGING_DISABLED_API_KEY>`
- Arduino státuszmonitor: kikapcsolva
- helyi schedule runner: manuális
- legacy schedule- és státuszcron: kikapcsolva

Ezekkel a staging backend readiness-konfigurációja érvényes, de a staging nem tud
LAN-on lévő fizikai Arduino felé vezérlő vagy OTA-kérést küldeni.

## Módosítások

### `deploy/staging.env.example`

- loopback bind cím;
- izolált, nem elérhető Arduino cél;
- érvényes dokumentációs API path és API key;
- külön staging firmware könyvtár.

### `deploy/install-staging-service.sh`

- minden futáskor összehangolja a staging-only env kulcsokat;
- nem olvassa a produkciós env-fájlt;
- létrehozza a firmware és event archive könyvtárakat is;
- eltérő, korábbról megmaradt staging runtime Arduino-beállítást biztonsági
  másolatba helyez;
- tesztelhető `SYSTEMCTL_COMMAND` felülírást használ.

### `deploy/stage-alpha2-bundle.sh`

A staging service telepítőjét és env-reconciliation lépését minden staging
aktiválás előtt lefuttatja, nem csak az első systemd unit telepítésénél.

### `deploy/install-versioned-release.sh`

- megőrzi és kiírja a sikertelen readiness HTTP-kódját és JSON-válaszát;
- sikertelen első staging telepítésnél leállítja a hibás service-t, eltávolítja
  a `current` linket és az új release könyvtárát;
- meglévő staging release esetén visszaállítja és újraindítja az előző targetet;
- a rollback nem fut le kétszer;
- aktiválás előtti függőségtelepítési hiba esetén sem marad félkész candidate
  könyvtár a staging releases könyvtárban.
- a hibakezelés `EXIT`-alapú tranzakciós takarítást használ, ezért macOS
  rendszer-Bash 3.2 és Linux Bash alatt is lefut a candidate cleanup.

## Ellenőrzési sorrend

1. Csomag kibontása kizárólag a `feature/v5-server-modularization` ág tiszta
   working tree-jére.
2. Új izolációs és rollback tesztek.
3. Meglévő Alpha.2 LXC, evidence, runtime és secret scanner regressziós tesztek.
4. Teljes repository-validátor.
5. `git diff --check` és staged diff ellenőrzés.
6. Commit és push kizárólag a feature ágra.
7. Csak ezután következhet új valódi LXC `gate-stage` futás.

A promotion, finalization, `main` merge és produkciós service-módosítás továbbra is
tilos addig, amíg az új candidate commit teljes `gate-stage` folyamata nem sikeres.
