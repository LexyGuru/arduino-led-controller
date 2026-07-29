# Alpha.2 LXC predeployment hardening hotfix

A sikeres preflight után a `gate-stage` előtt négy blokkoló integrációs hibát
kellett javítani.

## Javítások

### Candidate worktree tisztasága

Az orchestrator korábban minden shell- és JavaScript-fájlon `chmod +x`
műveletet végzett. Linuxon ez Git filemode változásként jelentkezhetett, ezért
a release bundle builder piszkos working tree miatt leállhatott.

A hotfix eltávolítja ezt a módosítást. Minden script továbbra is explicit
`bash` vagy `node` paranccsal fut.

### Phase-aware release-nevek

A bundle nevek:

```text
arduino-led-controller-<version>-staging-<commit>
arduino-led-controller-<version>-promotion-<commit>
```

A verziózott telepítő és ellenőrző most ezt a sémát fogadja el, és ellenőrzi,
hogy a névben lévő rövid hash egyezik a metadata teljes commitjával.

### Candidate rollback teszt

A candidate endpoint gate már saját exact candidate worktree-jében futtatja a
rollback tesztet. A valódi LXC gate többé nem próbálja ugyanezt a régi
produkciós `main` fájlrendszeréből elindítani.

### Staging systemd útvonalak

A staging telepítő előre létrehozza az összes `ReadWritePaths` könyvtárat.

A staging backend ugyanazokat a fájlokat olvassa, amelyeket az orchestrator ír:

- release-gate reportok;
- execution receiptek;
- orchestration state;
- production guard;
- artifact index;
- finalization approval.
