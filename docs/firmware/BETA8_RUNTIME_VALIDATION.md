# Beta.8 runtime validation

## Előkészítés

A V386 PREPARE script a jelenlegi, V385-tel validált working tree-ből készít egy
megőrzött Beta.8 BIN-t és SHA-256 fájlt.

A Tauri fejlesztői alkalmazás indítása:

```bash
cd ~/Github/desktop-tauri
npm run tauri:dev
```

## Direct API snapshot

A csomagban található `CHECK_BETA8_RUNTIME_V386.sh` használata:

```bash
./CHECK_BETA8_RUNTIME_V386.sh snapshot before "https://HOST/PRIVATE_PATH/api/v1"
```

A script az `X-Device-Key` értéket rejtetten bekéri.

## Teszt A — Beta.7 -> Beta.8

1. Készíts `before` snapshotot.
2. A fejlesztői alkalmazás Firmware nézetében válaszd az external BIN telepítést.
3. Válaszd a V386 által készített `Arduino_LED_Controller_Firmware_5.0.0-beta.8_UNO_R4_WiFi.bin` fájlt.
4. Várd meg az OTA eredményt.
5. Készíts `after-transition` snapshotot.
6. Futtasd:

```bash
./CHECK_BETA8_RUNTIME_V386.sh compare before after-transition transition
```

Elfogadási feltétel:

- az új firmware `5.0.0-beta.8`;
- az API válaszban van pozitív `bootGeneration`;
- schedule revision/checksum nem változik váratlanul.

## Teszt B — normál reboot

Beta.8 futása mellett:

```bash
./CHECK_BETA8_RUNTIME_V386.sh snapshot reboot-before "https://HOST/PRIVATE_PATH/api/v1"
```

Indítsd újra az Arduino-t, majd:

```bash
./CHECK_BETA8_RUNTIME_V386.sh snapshot reboot-after "https://HOST/PRIVATE_PATH/api/v1"
./CHECK_BETA8_RUNTIME_V386.sh compare reboot-before reboot-after same-version
```

Itt a `bootGeneration` változása kötelező.

## Teszt C — Beta.8 -> Beta.8 same-version reinstall

1. `same-before` snapshot.
2. Ugyanazt a Beta.8 BIN-t telepítsd újra OTA-val.
3. `same-after` snapshot.
4. Compare:

```bash
./CHECK_BETA8_RUNTIME_V386.sh compare same-before same-after same-version
```

A sikerhez ugyanaz a firmware-verzió és **eltérő bootGeneration** szükséges.

## Megjegyzés

A fizikai teszt sikeréig nincs commit, push vagy release.
