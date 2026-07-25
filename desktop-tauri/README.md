# Arduino LED Controller Desktop v3.0.2

Önálló React + Tauri + Rust asztali alkalmazás Arduino UNO R4 WiFi LED-vezérléshez. Közvetlenül az Arduinóhoz kapcsolódik; Node.js vagy LXC köztes szerver nem szükséges.

## Újdonságok

- Kibővített áttekintés heti ütemezési összesítővel.
- LED-ek pillanatképe: állapot, fényerő, effekt és RGB-szín.
- LED tesztpanel: Éjszakai kék, Szivárvány és Lélegző teszt.
- A teszt leállításakor az alkalmazás visszaállítja a teszt előtti LED-állapotot.
- Teljes heti időzítő-szerkesztő több nap egyidejű kijelölésével.
- LED-enként: nincs módosítás, bekapcsolás vagy kikapcsolás.
- LED-enkénti szín, fényerő és effekt.
- Napok szerint csoportosított időzítéslista, szerkesztés és törlés.
- JSON Letöltés/Feltöltés biztonsági mentéshez.
- Teljes heti program feltöltése az Arduino EEPROM-jába és visszaellenőrzése.
- Automatikus firmware-letöltés a `LexyGuru/arduino-led-controller` projekt `firmware-latest` kiadásából.

## Firmware-feltétel

Az Arduino firmware-nek támogatnia kell:

- `/api/status`
- `/api/led/:id`
- `/api/schedules/chunk`
- `/api/schedules/export?index=N`

A csomagban található `firmware-tools/apply_schedule_export_patch.py` hozzáadja az export végpontot a kompatibilis firmware-hez.

## Fejlesztői indítás

```bash
npm install
npm run tauri:dev
```

## Telepítő készítése

```bash
npm install
npm run tauri:build
```


## 3.0.2 fájlkezelési javítás

- Natív macOS/Windows/Linux megnyitás és mentés ablak.
- Elfogadja a közvetlen JSON tömböt és az `arduino-led-controller-schedules` csomagformátumot.
- A régi fájlok hiányzó `speed` mezőjét automatikusan 50-re állítja.
- Exportáláskor kompatibilis `weekly-led-schedules.json` csomagot készít.


## Firmware 4.1.1 kompatibilitás

A csomag `firmware/ArduinoLedController-4.1.1.ino` fájlja a felhasználó 4.1.0 firmware-jére épül.
Hozzáadja a `GET /api/schedules/export?index=N` végpontot, amelyet a desktop alkalmazás az EEPROM időzítéseinek beolvasásához használ.
Az ArduinoOTA portja ennél a firmware-nél 3232.
