# Beta.10 release state

- Application: `5.0.0-beta.10`
- Firmware: `5.0.0-beta.7`
- Direct API: `1.0.0`
- Branch: `next/v5-rearchitecture`

## Beépített fejlesztési körök

- V158 mobile credential + theme stabilization
- V163+ iOS/Xcode 27 deployment/native dependency work
- V186 critical mobile clock/scheduler consolidation
- V191 hardware-validated Matrix/NeoPixel stabilization

## Hardware baseline

V191 hardware validation:
- Wi-Fi boot indicator: passed
- Matrix OK indicator: passed
- Matrix random sparkle/flicker: resolved
- uptime/clock realtime: passed
- OTA/API health: passed

## Ismert korlátozás

Az animált WS2812 effektek átmenetileg szünetelnek. A három × 300 pixeles
WS2812 busz periodikus frissítése interrupt-blokkolást okozott az UNO R4-en,
ezért az animáció csak interrupt-barát kimeneti backenddel térhet vissza.

## Release blocker

Publish csak akkor engedélyezett, ha a Beta.10 consolidated release-prep
minden tesztje sikeres. Commit/push külön publish-only lépés.
