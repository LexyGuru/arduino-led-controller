#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

ENCODE_ANCHOR = '''bool importSchedulesHex(const String& payload) {'''
ENCODE_BLOCK = r'''String encodeScheduleHex(const StoredSchedule& entry) {
  static const char HEX[] = "0123456789abcdef";
  const uint8_t* source = reinterpret_cast<const uint8_t*>(&entry);
  String payload;
  if (!payload.reserve(sizeof(StoredSchedule) * 2)) return "";
  for (size_t i = 0; i < sizeof(StoredSchedule); i++) {
    payload += HEX[(source[i] >> 4) & 0x0f];
    payload += HEX[source[i] & 0x0f];
  }
  return payload;
}

'''

ROUTE_ANCHOR = '''  if (base == "/api/schedules/upload") {'''
ROUTE_BLOCK = r'''  if (base == "/api/schedules/export") {
    String query = queryAt < 0 ? "" : path.substring(queryAt + 1);
    int index = valueInt(query, "index", -1, -1, SCHEDULE_MAX - 1);
    if (index < 0 || index >= scheduleCount) {
      sendJson(c, "{\"error\":\"Ervenytelen idozitesi index\"}", 400);
      return;
    }
    String payload = encodeScheduleHex(schedules[index]);
    if (!payload.length()) {
      sendJson(c, "{\"error\":\"Idozitesi export memoriahiba\"}", 400);
      return;
    }
    String response;
    if (!response.reserve(110)) {
      sendJson(c, "{\"error\":\"Idozitesi export memoriahiba\"}", 400);
      return;
    }
    response = "{\"index\":" + String(index) + ",\"count\":" + String(scheduleCount) + ",\"payload\":\"" + payload + "\"}";
    sendJson(c, response);
    return;
  }
'''


def main() -> int:
    parser = argparse.ArgumentParser(description="Hozzáadja az EEPROM időzítés-export API-t az Arduino firmware-hez.")
    parser.add_argument("firmware", type=Path, help="Az ArduinoLedController.ino fájl útvonala")
    args = parser.parse_args()

    path = args.firmware.expanduser().resolve()
    if not path.is_file():
        raise SystemExit(f"Nem található firmware: {path}")

    text = path.read_text(encoding="utf-8")
    if '/api/schedules/export' in text and 'encodeScheduleHex' in text:
        print("A firmware már tartalmazza az időzítés-export javítást.")
        return 0
    if ENCODE_ANCHOR not in text:
        raise SystemExit("Nem található az importSchedulesHex blokk. Valószínűleg eltérő firmware-verzió.")
    if ROUTE_ANCHOR not in text:
        raise SystemExit("Nem található az /api/schedules/upload útvonal. Valószínűleg eltérő firmware-verzió.")

    backup = path.with_suffix(path.suffix + ".before-schedule-export.bak")
    if not backup.exists():
        backup.write_text(text, encoding="utf-8")

    text = text.replace(ENCODE_ANCHOR, ENCODE_BLOCK + ENCODE_ANCHOR, 1)
    text = text.replace(ROUTE_ANCHOR, ROUTE_BLOCK + ROUTE_ANCHOR, 1)
    path.write_text(text, encoding="utf-8")

    print(f"Javítva: {path}")
    print(f"Biztonsági mentés: {backup}")
    print("Új API: GET /api/schedules/export?index=0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
