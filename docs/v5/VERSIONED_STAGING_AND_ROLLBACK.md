# Verziózott staging telepítés és rollback

## Staging systemd szolgáltatás

```bash
sudo bash deploy/install-staging-service.sh
sudo nano /etc/arduino-led-controller-staging.env
```

A staging szerver alapértelmezett portja `3100`, és külön adat- valamint
konfigurációs könyvtárat használ.

## Release bundle készítése

```bash
REF=HEAD bash deploy/build-versioned-release.sh
bash deploy/verify-versioned-release.sh \
  dist/releases/*.tar.gz
```

## Staging aktiválása

```bash
sudo bash deploy/install-versioned-release.sh \
  dist/releases/arduino-led-controller-*.tar.gz
```

Az installer:

1. ellenőrzi a SHA-256 checksumot;
2. ellenőrzi a release metadata fájlt;
3. külön release könyvtárba csomagol ki;
4. opcionálisan `npm ci --omit=dev` műveletet futtat;
5. atomikusan átállítja a `current` symlinket;
6. újraindítja a staging szolgáltatást;
7. health checket futtat;
8. hiba esetén automatikusan visszaáll az előző symlinkre.

## Kézi rollback

```bash
sudo bash deploy/rollback-versioned-release.sh
```

Konkrét release:

```bash
sudo bash deploy/rollback-versioned-release.sh \
  arduino-led-controller-5.0.0-alpha.1-0123456789ab
```
