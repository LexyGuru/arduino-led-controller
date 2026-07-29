# V5 alpha.2 release gate

Az `alpha.2` verzió csak akkor emelhető, ha mindegyik kapu sikeres.

## Helyi kapu

```bash
bash scripts/validate-repository.sh
git diff --check
```

## Izolált LXC kapu

Az LXC-ben, a feature branch ellenőrzése után:

```bash
sudo APP_DIR=/opt/arduino-led-controller \
  bash deploy/test-alpha2-candidate.sh
```

A script külön Git worktree-t készít, telepíti a zárolt Node-függőségeket,
lefuttatja a repository-validátort, alternatív porton elindítja a szervert,
majd ellenőrzi:

- `/health/live`
- `/health/ready`
- `/api/v2/openapi.json`
- `/api/v2/system/status`
- az automatikus rollback könyvtártesztjét

A teszt nem módosítja a produkciós worktree-t és nem indítja újra a
produkciós systemd szolgáltatást.

## Staging rollback kapu

1. Jegyezd fel a staging aktuális commitját.
2. Telepítsd a feature branchet.
3. Ellenőrizd a live/ready végpontokat.
4. Szándékosan adj meg hibás candidate commitot vagy hibás tesztkonfigurációt.
5. Ellenőrizd, hogy a last-known-good commit visszaáll.
6. Ellenőrizd a systemd szolgáltatást és a health végpontokat.

## Verziólépés

A sikeres kapuk után egyszerre kell `5.0.0-alpha.2` értékre állítani:

- `VERSION`
- gyökér `package.json`
- `docs/api/openapi-v2.json`
- `desktop-tauri/package.json`
- `desktop-tauri/src-tauri/Cargo.toml`
- `desktop-tauri/src-tauri/tauri.conf.json`
