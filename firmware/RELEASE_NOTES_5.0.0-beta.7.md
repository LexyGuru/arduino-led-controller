# Arduino LED Controller Firmware 5.0.0-beta.7

Application release: **5.5.0-beta.1**
Direct API: **1.0.0**

## Fő változások

- Hardveren validált UNO R4 Matrix/NeoPixel stabilizálás.
- A háttérben futó periodikus WS2812  kikapcsolva.
- Reboot → Wi-Fi Matrix ikon → sikeres kapcsolat → pipa útvonal stabil.
- Matrix random fényerő-felvillanás megszűnt.
- Arduino  és clock újra valós időben halad.
- CET/CEST, NTP és scheduler reconciliation javítások megtartva.
- OTA Exclusive Mode és EEPROM schedule/config megőrzés megtartva.
- Direct API verzió változatlan: 1.0.0.

## Ismert korlátozás

Az animált WS2812 effektek átmenetileg szünetelnek. Visszaengedésükhöz
interrupt-barát UNO R4 LED output backend szükséges.
