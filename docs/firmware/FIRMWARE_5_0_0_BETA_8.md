# Firmware 5.0.0-beta.9

## Állapot

- Alkalmazás: `5.5.0-beta.2`
- Firmware: `5.0.0-beta.9`
- Direct API: `1.0.0`
- Célhardver: Arduino UNO R4 WiFi
- Fejlesztési ág: `next/v5-rearchitecture`
- A dokumentált V385 tesztállapotban commit/push/release még nem történt.

## Fő változások

A Beta.8 bevezeti a tartós `bootGeneration` reboot-azonosítót. Az OTA utáni
sikeresség elsődleges bizonyítéka ezentúl nem a Boot ID, hanem a
`bootGeneration` változása.

A firmware a boot generációhoz 64 logikai rekordból álló gyűrűt használ. A publikus
érték tartománya `1..1000000`; a belső monoton szekvencia alapján a legfrissebb
rekord kiválasztható akkor is, amikor a publikus érték visszafordul `1`-re.

EEPROM régió:

```text
offset: 5120
méret:  512 byte
vége:   5631
slot:   64
rekord: 8 byte
```

A státusz- és pingválasz `bootGeneration` mezőt ad.

## OTA authority modell

Beta.8 és újabb firmware esetén:

```text
bootGeneration változott + várt firmware
    -> reboot/telepítés igazolt

bootGeneration változott + hibás firmware
    -> OTA_ROLLBACK_OR_WRONG_FIRMWARE

bootGeneration nem változott
    -> reboot még nincs igazolva, polling folytatódik
```

Régi firmware esetén, amely még nem ad `bootGeneration` mezőt, a Boot ID
legacy fallbackként megmarad.

A `5.0.0-beta.7 -> 5.0.0-beta.9` első migráció külön kezelhető: mivel a régi
firmware még nem biztosít bootGeneration előértéket, a várt új firmware-verzió
aktív Direct API státusza igazolja a verzióátmenetet.

## Méretoptimalizálás

V385 validáció:

```text
baseline BIN: 108068 byte
Beta.8 BIN:   107452 byte
megtakarítás: 616 byte
```

Globális memória a validáció során:

```text
baseline: 17960 byte
Beta.8:   17584 byte
nyereség: 376 byte
```

A csökkentés fő elemei:

- firmware-forrásban nincs Arduino `String`;
- lebegőpontos effekt-számítás helyett fixpontos/integer logika;
- az öt LED-matrix kép tömörített tárolása és egy újrahasznosított frame buffer;
- a Serial parancsfelület funkciói megmaradnak.

## OTA desktop/Tauri változás

A `confirm_restart()` az egyetlen döntési pont az OTA utáni reboot/firmware
igazolására. A `bootGeneration` az elsődleges authority, a Boot ID csak legacy
fallback.

A két OTA flow továbbra is eltárolja a `boot_id_after` értéket diagnosztikai/audit
telemetriaként, de ez már nem egy második success/failure gate.

## Kiadás előtti kötelező runtime teszt

1. `5.0.0-beta.7 -> 5.0.0-beta.9` OTA.
2. `/api/v1/status` válaszban `bootGeneration` jelenléte.
3. Normál reboot után `bootGeneration` változása.
4. `5.0.0-beta.9 -> 5.0.0-beta.9` ugyanazon BIN újratelepítése.
5. Same-version reinstall csak változott `bootGeneration` mellett fogadható el.
6. Schedule revision/checksum persistence ellenőrzése.
7. Desktop és mobil OTA flow későbbi fizikai ellenőrzése.

## EEPROM tartóssági megjegyzés

A 64 slotos megoldás **logikai gyűrű**. A tényleges fizikai flash erase-block
kopáseloszlása az ArduinoCore-renesas EEPROM/BlockDevices implementációjától függ.
A release előtt ezt külön ellenőrizni kell; a dokumentáció ezért nem állítja, hogy
a 64 logikai slot automatikusan 64 külön fizikai erase egységet jelent.
