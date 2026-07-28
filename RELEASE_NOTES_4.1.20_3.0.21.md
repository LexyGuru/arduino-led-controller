# Frissítési csomag – Firmware 4.1.20 / Tauri 3.0.21 / Server 1.1.0

## Firmware 4.1.20

- OTA tesztverzió a stabil 4.1.19 listener alapján.
- Verzió: `4.1.20`.
- Funkciójelölés: `ota-validation-4.1.20`.
- Nincs új működési változtatás; az OTA frissítési lánc biztonságos tesztelésére szolgál.

## Tauri 3.0.21

- Androidon és iOS/iPadOS-en a Firmware oldal nem jelenik meg.
- Mobilon az OTA-beállítások rejtve vannak.
- A Rust backend mobilplatformon közvetlen hívás esetén is elutasítja az OTA-t.
- A desktop OTA-folyamat változatlanul elérhető.

## Node.js / LXC szerver 1.1.0

- valós idejű OTA-napló és folyamatjelző;
- eredeti firmware-fájlnév és SHA-256 újraellenőrzés;
- dinamikus OTA-cél az Arduino státuszából;
- `/api/ota/prepare` támogatás;
- arduinoOTA stdout/stderr soronkénti feldolgozás;
- hamis `Flashing sketch` hiba után 180 másodperces firmware-visszaigazolás;
- LED-teszt előtti állapot mentése és visszaállítása;
- elérhetetlen régi dashboard-kód eltávolítása.

## Repository

- régi Electron `desktop/` eltávolítására előkészítve;
- Electron függőségek kikerültek a gyökér `package.json` fájlból;
- régi `V3.0.x_FIXES.md` és `OTA_*.md` jegyzetek eltávolítva a tiszta csomagból;
- új mobil telepítési és repository-takarítási dokumentáció;
- frissített fő README;
- all-platform workflow concurrency védelemmel;
- a firmware workflow-ból kikerült a már nem használt ArduinoMDNS telepítése.
