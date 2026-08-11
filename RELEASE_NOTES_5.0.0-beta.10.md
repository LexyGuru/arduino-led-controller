# Arduino LED Controller 5.0.0-beta.10

Firmware: **5.0.0-beta.7**
Direct API: **1.0.0**
Channel: **beta**

## Összefoglaló

A Beta.10 az eddigi Beta.9 fejlesztési kör konszolidált kiadása. Egyetlen
release-be rendezi a mobil/iOS credential és theme stabilizálást, az Xcode 27
kompatibilitási munkát, a firmware scheduler/clock javításait és a hardveren
validált UNO R4 LED Matrix / NeoPixel stabilizálást.

## Desktop és mobil

- Megosztott frontend theme/appearance stabilizálás.
- Mobil credential storage és startup restore javítások.
- iOS protected credential store integráció.
- Android Keystore útvonal megtartása.
- Xcode 27 / iOS minimum deployment target kompatibilitási javítások.
- iOS native dependency closure és linkelési regressziók lefedése.
- Mobilon firmware OTA továbbra sem indítható; OTA desktop/LXC feladat.

## Arduino clock és scheduler

- Az Arduino marad az időzítések autoritatív forrása.
- CET/CEST és lokális schedule reconciliation javítások.
- NTP újraszinkronizálási viselkedés és diagnosztikai mezők javítása.
- A V189G/V189H hardvermérés bizonyította, hogy a korábbi periodikus
  WS2812 `show()` hívások miatt a `millis()` időalap jelentősen lassult.
- A stabilizált firmware-ben a háttérben futó periodikus NeoPixel-küldés
  nincs engedélyezve.

## UNO R4 LED Matrix / NeoPixel

A hardveren validált V191 stabilizálás eredménye:

- reboot után a Wi-Fi Matrix ikon gyorsan megjelenik;
- IP-cím megszerzése után a pipa megjelenik;
- megszűnt a Matrix egyes pixeleinek random fényerő-felvillanása;
- `millis()` és az autoritatív clock valós időben halad;
- OTA és Direct API működőképes marad;
- statikus WS2812 állapot nem vibrál.

### Ismert ideiglenes korlátozás

Az animált WS2812 effektek ebben a firmware-ben átmenetileg szünetelnek.
A három × 300 pixeles WS2812 busz periodikus bit-bang frissítése blokkolta
az interruptokat, ezért az animáció csak külön, UNO R4-en interrupt-barát
kimeneti backend bevezetése után térhet vissza.

## OTA / kompatibilitás

- Firmware: Arduino UNO R4 WiFi.
- Direct API: 1.0.0, változatlan.
- EEPROM hálózati/API/schedule konfiguráció megmarad.
- Desktop és LXC OTA infrastruktúra változatlanul támogatott.
- Mobil OTA továbbra is tiltott.

## Validációs baseline

A V191 hardverteszten:

- status recovery OTA után: ~20 s;
- uptime rate ratio: ~0.999;
- UTC clock rate ratio: ~0.999;
- OTA API: healthy;
- Matrix: vizuálisan stabil.

A Beta.10 release csak a teljes repository, npm, Rust/Tauri, iOS-contract,
firmware compile és release-version contractok sikeres futása után
publikálható.
