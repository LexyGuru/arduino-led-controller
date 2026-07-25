# Arduino EEPROM időzítés-export javítás

A Tauri 2.3.2 az Arduino státuszából kiolvassa a `scheduleCount` értéket, majd az időzítéseket egyenként tölti le:

```text
/api/schedules/export?index=0
/api/schedules/export?index=1
...
```

## Firmware javítása

A projekt gyökeréből:

```bash
python3 desktop-tauri/firmware-tools/apply_schedule_export_patch.py \
  firmware/ArduinoLedController/ArduinoLedController.ino
```

A script automatikusan készít `.before-schedule-export.bak` biztonsági mentést.

Ezután fordítsd és töltsd fel a firmware-t USB-n vagy a már működő OTA-frissítéssel. A Tauri alkalmazás és a firmware frissítése együtt szükséges az Arduino EEPROM-időzítések visszaolvasásához.
