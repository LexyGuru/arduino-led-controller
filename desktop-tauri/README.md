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
Az ArduinoOTA portja ennél a firmware-nél 65280.

## 3.0.5 / firmware 4.1.2

- A fényerő- és effektsebesség-csúszka 4 másodperces debounce után küld az Arduinónak.
- Mindkét érték közvetlenül beírható számmal; Enter vagy fókuszvesztés azonnal küld.
- A firmware 30 másodpercenként összeveti a LED-eket a heti program elvárt állapotával.

## 3.0.4 javítások

- Az ArduinoOTA feltöltési alapport ismét `65280`, ugyanaz, mint a működő Proxmox OTA folyamatban.
- Sikertelen OTA esetén az alkalmazás megjeleníti az `arduinoOTA` stdout és stderr teljes szövegét, valamint a használt IP-címet és portot.
- A GitHub Actions workflow nem próbál nem létező `package-lock.json` fájlt cache-elni.
- A Linux, macOS és Windows build külön artifactként tölthető le a workflow futásából.


## 3.0.5 javítás

- A korábbi, beégetett `v2.3.0` felirat eltávolítva.
- Az alkalmazás verzióját a Tauri saját konfigurációjából olvassa.
- A firmware verzióját az Arduino `/api/status` válaszából jeleníti meg.
- A két verzió külön sorban látható az oldalsáv alján.

## GitHub Actions v3.0.6 javítás

A workflow szándékosan nem használ Node/npm cache-t. A repository gyökerében kell lennie a `package.json` és a `src-tauri` mappának. A régi `.github/workflows/*.yml` fájlokat törölni kell, ha azok `actions/setup-node@v5` vagy `cache-dependency-path` beállítást tartalmaznak.

## 3.0.7 OTA-javítás

- Az OTA-port fixen `65280`; a felületen nem módosítható, és a mentett konfiguráció sem befolyásolja.
- macOS-en a program közvetlenül ellenőrzi a `/usr/local/bin/arduinoOTA` és `/opt/homebrew/bin/arduinoOTA` útvonalakat is.
- Az alkalmazás nemcsak a fájl meglétét nézi, hanem az `arduinoOTA -version` paranccsal ellenőrzi, hogy az eszköz ténylegesen futtatható-e.
- A Firmware oldalon megjelenik a megtalált OTA-program teljes útvonala vagy a telepítési/indítási hiba.
- Azonos telepített és GitHub-verzió esetén a felület „A firmware naprakész” üzenetet mutat, és a telepítés gomb letiltódik.
