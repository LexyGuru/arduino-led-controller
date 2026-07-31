# V5 közvetlen Arduino architektúra

## Cél

A Tauri alkalmazás LXC, Node.js szerver és külön felhasználói adatbázis nélkül is teljes értékűen vezérelje az Arduino UNO R4 WiFi eszközt.

## Elsődleges adatút

```text
Tauri UI
  │
  ▼
DirectArduinoClient
  │
  ├─ helyi endpoint
  └─ távoli endpoint
  │
  ▼
privát API-útvonal + X-Device-Key
  │
  ▼
Arduino UNO R4 WiFi
```

## Eszközprofil

Ajánlott logikai modell:

```ts
type ArduinoDeviceProfile = {
  id: string;
  name: string;
  local: {
    host: string;
    port: number;
  };
  remote?: {
    host: string;
    port: number;
  };
  api: {
    privatePathRef: string;
    deviceKeyRef: string;
  };
  ota?: {
    host: string;
    port: number;
    passwordRef: string;
  };
  preferredEndpoint: 'auto' | 'local' | 'remote';
};
```

A `*Ref` mezők credential-store hivatkozások, nem maguk a titkok.

## Endpointválasztás

### Auto mód

1. helyi endpoint rövid connect timeouttal;
2. védett `/api/status` próba;
3. ha sikertelen, távoli endpoint;
4. ha mindkettő sikertelen, offline;
5. módosító kérés nem kerül automatikus késleltetett sorba.

### Kézi mód

A felhasználó rögzítheti:

- csak helyi;
- csak távoli;
- automatikus.

## Host validáció

Elfogadott:

```text
10.0.0.117
beta-lexyguruhome.ddns.net
arduino.local
```

Nem elfogadott a hostmezőben:

```text
http://10.0.0.117
https://beta-lexyguruhome.ddns.net:25666
```

A séma külön host- és portmezőt használ.

## Hitelesítés

Minden védett kérés:

```http
X-Device-Key: <kulcs>
```

Az URL:

```text
http://<host>:<port>/<private-path>/api/status
```

A kulcs nem kerül:

- query stringbe;
- logba;
- hibaüzenetbe;
- localStorage-be;
- normál JSON profilfájlba.

## Állapotforrás

Az Arduino válasza az elsődleges.

A Tauri cache:

- megjelenítési gyorsítótár;
- offline utolsó ismert állapot;
- soha nem írható vissza automatikusan reconnect után.

## Több kliens

Több kliens ugyanahhoz az Arduinohoz kapcsolódhat.

Szabályok:

- minden módosítás után friss státuszlekérés;
- schedule mentés után EEPROM-visszaolvasás;
- nincs kliensoldali kizárólagos lock;
- konfliktus esetén a tényleges Arduino-válasz dönt.

## Több Arduino

A Tauri tetszőleges számú profilt kezelhet.

Minden profilhoz külön:

- endpointok;
- privát útvonal;
- eszközkulcs;
- OTA-adatok;
- naplószűrő;
- utolsó ismert állapot.

## Schedule

A schedule adatút:

```text
Tauri editor
   │ validáció
   ▼
Arduino upload
   │ EEPROM írás
   ▼
Arduino export/readback
   │ összehasonlítás
   ▼
siker
```

A Tauri helyi schedule csak piszkozat vagy export.

## OTA

Az OTA nem része az általános mobil kliensnek.

Desktop folyamat:

1. firmware metadata;
2. bináris letöltés;
3. SHA-256;
4. Arduino státusz;
5. OTA feltöltés;
6. reboot várakozás;
7. firmware-verzió ellenőrzése;
8. rollback lehetőség.

## Opcionális szervermód

Az opcionális szerver egy másik adapter:

```text
ServerApiV2Client
```

Nem helyettesíti és nem burkolja kötelezően a `DirectArduinoClient` klienst.

A UI-ban csak explicit kísérleti beállítással jelenhet meg.
