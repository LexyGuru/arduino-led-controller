# Alpha.2 valódi LXC release-gate

A release-gate nem módosítja a futó produkciós checkoutot. Egy detached Git
worktree-ben telepíti a zárolt függőségeket, lefuttatja a teljes validátort,
majd véletlen helyi porton elindítja a jelölt szervert.

## Futtatás az LXC-ben

```bash
cd /opt/arduino-led-controller
sudo CANDIDATE_REF=feature/v5-server-modularization \
  bash deploy/test-alpha2-lxc.sh
```

A gate ellenőrzi:

1. a produkciós systemd szolgáltatás aktív marad;
2. a candidate worktree és `npm ci` sikeres;
3. a teljes repository-validátor sikeres;
4. a live, ready, OpenAPI, system status és cutover végpontok működnek;
5. a rollback könyvtárteszt sikeres;
6. a produkciós szolgáltatás a gate után is aktív.

A gépi jelentés alapértelmezett helye:

```text
/var/lib/arduino-led-controller/release-gates/
```

A minősített candidate `status: passed` jelentést kapott, majd a teljes
execution receipt-lánc és finalization approval után elkészült a
`5.0.0-alpha.2` verziószinkron.
