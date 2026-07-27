# Arduino LED Controller Desktop v3.0.11

## 3.0.11 – valós idejű OTA-konzol

A Firmware OTA oldalon a GitHub-letöltés, SHA-256 ellenőrzés, `arduinoOTA`
indítás, nyers stdout/stderr kimenet, feltöltési százalék, újraindulás és
végső firmware-verzió ellenőrzése valós időben követhető.

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


## Firmware-kompatibilitás

A jelenlegi ajánlott firmware a csomagban található `firmware/ArduinoLedController-4.1.13-manual-override.ino`. Ez tartalmazza a stabil konzol- és OTA-végpontokat, az EEPROM-időzítést, valamint a következő időzített eseményig megmaradó kézi LED-felülbírálást. A régebbi firmware-fájlok csak kompatibilitási és visszaállítási célból maradtak a csomagban.

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


## 3.0.8 – hálózati Arduino konzol

- Az Arduino `/api/console/logs?after=<id>` végpontja sorszámozva adja vissza az új konzolsorokat.
- A Tauri kliens 2 másodpercenként olvassa az új sorokat.
- Nincs duplikáció, és legfeljebb 500 sor marad a felületen.
- A konzol USB-s soros kapcsolat nélkül, WiFi-n keresztül működik.



## 3.0.10 – helyi kapcsolat, DDNS-tartalék és terhelésvédelem

- Helyi hálózaton elsőként a közvetlen `10.0.0.123:80` címet használja.
- A DDNS-cím csak tartalék, így a NAT-loopback időtúllépése nem blokkolja az alkalmazást.
- Nincs háromszoros, hosszú DDNS-újrapróbálás.
- A konzol csak a Naplók oldalon, 5 másodpercenként frissül.
- Kapcsolati hiba után automatikus terhelésvédelmi szünet lép életbe.
- Az induláskori, több tucat kérésből álló teljes Arduino-időzítés-beolvasás megszűnt.
- A hálózati napló összevonja az ismétlődő sikeres polling sorokat.
- Az OTA továbbra is a státusz API-ban visszaadott belső IP-címet és OTA-portot használja.

Részletesen: `V3.0.10_FIXES.md`.

## 3.0.9 – stabil Arduino-kapcsolat, konzol és OTA

- Az Arduino HTTP-kérései egyetlen sorban futnak, így a státusz, konzol és LED-parancs nem nyit egyszerre több TCP-kapcsolatot az UNO R4 WiFi felé.
- Üres, csonka vagy idő előtt lezárt válasznál a Tauri kliens legfeljebb háromszor újrapróbálja a kérést.
- Az `EOF while parsing a value` helyett részletes, érthető hálózati hiba jelenik meg.
- A konzol kezeli a `{ lastId, logs }`, `{ lines }` és közvetlen tömb formátumot.
- A React nem indít párhuzamos, dupla konzollekérést; egy folyamatban lévő kérés alatt nem küld újat.
- Átmeneti konzolhiba esetén a már betöltött sorok megmaradnak.
- Az OTA a `/api/status` `ipAddress` és `otaPort` mezőjét használja, nem a DDNS HTTP-címet.
- Az OTA állapotban látható a tényleges célcím és célport.
- A `package.json`, `tauri.conf.json` és `Cargo.toml` verziója egységesen 3.0.9.
- Az összes időzítés törlése most a firmware `/api/schedules/clear` végpontját használja, majd visszaellenőrzi a nulla darabos állapotot.
- Az OTA utáni ellenőrzés csak a várt firmware-verzió visszajelzését fogadja el sikernek.
- A teljes válasz után érkező TCP reset nem okoz hamis JSON-hibát; a kliens a fejléc és `Content-Length` alapján ellenőrzi a választ.
