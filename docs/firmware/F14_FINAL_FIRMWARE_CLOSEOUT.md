# F14 végleges firmware-zárás

**Firmware:** `4.3.0-beta.1`
**Firmware feature:** `f14-complete-direct-api-storage`
**Direct API:** `1.0.0`

## Véglegesített funkciók

- kizárólag `X-Device-Key` fejléc-alapú hitelesítés;
- query-kulcs fallback forráskódban kikapcsolva;
- JSON body API;
- egyedi és közös LED-kezelés;
- 0–60 rekordos tranzakciós schedule;
- A/B EEPROM config- és schedule-slotok;
- checksum és írás utáni readback;
- reboot utáni schedule-visszatöltés;
- legacy módosító végpontok `410 Gone` válasszal;
- WiFiS3-biztos 128 bájtos választransport;
- védett távoli újraindítás.

## Távoli reboot API

```http
POST /api/v1/system/reboot
X-Device-Key: <device key>
Content-Type: application/json
```

A sikeres válasz `202 Accepted`:

```json
{
  "success": true,
  "accepted": true,
  "rebooting": true,
  "delayMs": 750
}
```

A firmware előbb elküldi a választ, majd 750 ms elteltével végrehajtja az MCU-resetet. Ha már van függő újraindítás, `409 REBOOT_ALREADY_PENDING` érkezik.

## Capabilities javítás

A `/api/v1/capabilities` most a tényleges firmware-képességeket hirdeti:

```json
{
  "features": {
    "jsonBodyApi": true,
    "eepromAbSlots": true,
    "remoteReboot": true
  }
}
```

## Kötelező záró hardverkapu

1. capabilities jelzők ellenőrzése;
2. megszakított schedule-tranzakció, az aktív schedule változatlanságával;
3. 60 rekordos schedule commit;
4. távoli reboot `202` válasszal;
5. reboot utáni count/revision/checksum visszatöltés;
6. végső HTTP timeout és write-failure ellenőrzés;
7. OTA feltöltés vagy OTA fogadási próba.
