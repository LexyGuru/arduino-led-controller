# Release runtime Git-ignore recovery hotfix

## Gyökérok

A korábbi `.gitignore` fájlban ez szerepelt:

```text
release/
```

A Git ignore-minta nem volt a repository gyökeréhez rögzítve, ezért a
`server/release/` teljes forráskönyvtárat is ignorálta.

A fejlesztőgépen a fájlok léteztek, így a Node-tesztek lefuthattak, de
`git add --all` nem tette őket a commitba. Az LXC exact candidate worktree-ben
ezért csak a hívó scriptek jelentek meg, a szükséges release modulok nem.

A `config/` szabály ugyanezt okozta az új
`config/release-secret-allowlist.json` fájlnál.

## Javítás

A runtime könyvtárak gyökérhez vannak rögzítve:

```text
/data/
/schedules/
/release/
/artifacts/
```

A config könyvtár tartalma továbbra is alapból ignorált, de a release
allowlist követhető:

```text
/config/*
!/config/release-secret-allowlist.json
```

## Visszaállított modulkészlet

A csomag a teljes `server/release/` forráskészletet tartalmazza, nem csak az
elsőként hiányzó orchestration state modult.
