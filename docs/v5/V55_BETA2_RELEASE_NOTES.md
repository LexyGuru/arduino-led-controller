# Arduino LED Controller V5.5.1 Beta.2 – Release Notes

Alkalmazás: `5.5.1-beta.2`
Firmware: `5.0.0-beta.9`
Direct API: `1.0.0`

## Device Control & Reliability

- adaptív kapcsolat-helyreállítás és Device Health állapotpanel;
- Scene/Preset alapok és LED bulk műveletek;
- Schedule 2.0 Copy Day alapfunkció;
- natív Diagnostics ZIP és log export;
- firmware és hálózati runtime logok HU/EN/DE lokalizációja;
- Arduino firmware Event Code Protocol v1;
- külső `.bin` OTA SHA-256/readback/reboot/persistence ellenőrzéssel;
- valódi firmware verziórendezés: régebbi katalógusverzió nem jelenik meg frissítésként;
- a fő Install útvonal nem downgrade-el; rollback a Restore katalógusból érhető el.

## Platform és release continuity

- Theme Engine 2.0 változatlanul a Light/Dark runtime megjelenés kanonikus forrása;
- App Update Center 1.0 továbbra is stable/beta csatorna szerint működik;
- a Debian 13 LXC telepítési és staging runtime contract dinamikus verzióforrást használ;
- a `main` ág not modified / nem módosul; a kiadás kizárólag `next/v5-rearchitecture`.

## Firmware

A `5.0.0-beta.9` firmware Event Code Protocol v1-et használ. A hardverteszt igazolta az új firmware
bootját, a bootGeneration változását és a schedule persistence megmaradását.

## Branch policy

Kizárólag `next/v5-rearchitecture`. A `main` ág not modified / nem módosul.
