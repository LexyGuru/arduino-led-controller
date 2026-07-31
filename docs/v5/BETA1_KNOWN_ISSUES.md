# Beta.1 ismert problémák

## Firmware

Nincs nyitott, reprodukált F14 firmware-hiba. A végleges hardverkapu sikeres.

## Tauri

- A direct Arduino és az opcionális server/LXC mód még túl szorosan összekapcsolódik.
- Több release-, migration- és LXC panel nem része a végleges felhasználói UX-nek.
- Az eszközprofil és credential kezelést egyszerűsíteni kell.
- A schedule, firmware és log oldalak végleges direct API integrációja még hátravan.

Ezek a következő Tauri munkafázis feladatai.
