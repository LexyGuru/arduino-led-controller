# Beta.9 V191 – Safe Matrix + NeoPixel stabilization

## V190 hardverteszt

A V190 OTA sikeresen felment, de reboot után a normál `/api/v1/status`
90 másodpercen belül nem állt helyre. A beépített LED Matrixon a Wi-Fi
ikon sem jelent meg normálisan; később megjelent a pipa, de a Matrix
egyes pixelei továbbra is véletlenszerű fényerő-villanást mutattak.

## V189G/V189H bizonyíték

V189G periodikus WS2812 output:
- DWT / valós idő ≈ 1.00
- millis / valós idő ≈ 0.659

V189H periodikus WS2812 output nélkül:
- DWT / valós idő ≈ 1.00
- millis / valós idő ≈ 1.00

## V191

- a V190 runtime módosításokat a saját pre-V190 backupból visszaállítja;
- nincs periodikus háttér WS2812 `show()`;
- explicit API/schedule/restore `renderAll(true)` megmarad;
- `MATRIX_WIFI` és `MATRIX_OK` boot contract megmarad;
- OTA Matrix feedback megmarad;
- animált effektek átmenetileg szünetelnek.

Animációt csak interrupt-barát UNO R4 kimeneti backenddel szabad
visszaengedni.
