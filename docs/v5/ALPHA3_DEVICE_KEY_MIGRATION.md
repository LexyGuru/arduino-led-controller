# Alpha.3 Arduino eszközkulcs-fejléc migráció

## Cél

Az Alpha.3 munkacsomag az Arduino API-kulcsot eltávolítja az URL
lekérdezési paraméteréből, és az alábbi dedikált HTTP-fejlécbe helyezi:

```http
X-Device-Key: <ARDUINO_API_KEY>
```

A projekt alkalmazásverziója a fejlesztési és hardverteszt szakaszban
`5.0.0-alpha.2` marad. A `5.0.0-alpha.3` verziószinkron csak új gate,
staging, rollback, hardverteszt és külön finalization után történhet.

Kiindulási integrációs commit:

```text
bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b
```

Cél feature ág:

```text
feature/v5-alpha3-device-key-header
```

## Érintett komponensek

- Arduino UNO R4 WiFi firmware `4.1.21`;
- moduláris Node.js Arduino kliens;
- átmeneti `server2_legacy.js` kliens;
- macOS natív `curl` fallback transport;
- Tauri közvetlen Arduino HTTP-kliens;
- repository-validáció és regressziós tesztek;
- V5 roadmap, checklist, implementációs státusz és hardverteszt-runbook.

## Biztonsági szerződés

1. Az új Node- és Tauri-kliensek nem teszik az API-kulcsot URL-be.
2. A moduláris kliens a hívó által beadott kis- vagy nagybetűs
   `X-Device-Key` fejlécet eltávolítja, majd a konfigurált kulcsot írja be.
3. A legacy macOS `curl` transport a fejlécet stdinről olvassa, ezért a
   kulcs nem kerül a folyamat parancssori argumentumai közé.
4. A firmware a fejlécet kis- és nagybetűtől függetlenül ismeri fel.
5. Duplikált `X-Device-Key` fejléc elutasítandó.
6. Hibás fejléc mellett a firmware nem eshet vissza helyes query-kulcsra.
7. A régi `k` query-paraméter soha nem kerül route-ba vagy naplózott
   útvonalba.
8. A kulcs nem kerül API-válaszba, auditba vagy státusznaplóba.

## Firmware-kompatibilitási átmenet

A firmware alapértelmezett átmeneti kapcsolója:

```cpp
#define API_ALLOW_QUERY_KEY_FALLBACK 1
```

Ebben az állapotban:

- az `X-Device-Key` az elsődleges hitelesítés;
- régi kliens query-kulcsa csak akkor fogadható el, ha nincs
  `X-Device-Key` fejléc;
- hibás vagy duplikált fejléc nem kerülhető meg query-paraméterrel;
- a státuszválasz külön számlálja a fejléc- és fallback-hitelesítést.

A státusz `http` objektumának új mezői:

```json
{
  "deviceKeyHeaderAccepted": 0,
  "queryKeyFallbackAccepted": 0,
  "queryKeyFallbackEnabled": true
}
```

A fallback végleges kikapcsolása külön firmware-fordítással:

```cpp
#define API_ALLOW_QUERY_KEY_FALLBACK 0
```

Ez csak akkor engedélyezett, ha minden Node-, desktop- és mobilkliens
bizonyítottan fejlécet használ.

## Kötelező rollout-sorrend

### 1. Automatizált tesztek

A feature ágon fusson le:

```bash
node scripts/test-alpha3-device-key-header.js
node scripts/test-alpha3-device-key-manifest.js
bash scripts/validate-repository.sh
git diff --check
```

### 2. Firmware először

A feature ág push-a GitHub Actionsben lefordítja és letölthető artifactként
megőrzi a firmware-t, de a `firmware-latest` nyilvános release-t kizárólag a
`main` ág írhatja felül. Így a tesztfirmware nem válhat véletlenül produkciós
OTA-forrássá.

Először a `4.1.21` firmware kerüljön teszt Arduino eszközre vagy ellenőrzött
karbantartási ablakban a jelenlegi eszközre. A fallback ekkor maradjon `1`.
A régi klienseknek továbbra is működniük kell.

### 3. Fejléc-hitelesítés bizonyítása

A `docs/v5/ALPHA3_HARDWARE_TEST_RUNBOOK.md` alapján ellenőrizni kell:

- helyes fejléc sikeres;
- hiányzó fejléc sikertelen;
- hibás fejléc sikertelen;
- duplikált fejléc sikertelen;
- rossz fejléc + helyes query sikertelen;
- státuszszámlálók megfelelően változnak.

### 4. Gateway és Tauri kliens

Csak az új firmware igazolása után telepíthető a fejlécet használó staging
gateway és desktop kliens. A produkciós `main`, LXC és Arduino nem válthat
át automatikusan erre a feature ágra.

### 5. Query fallback megfigyelése

A `queryKeyFallbackAccepted` számlálónak minden régi kliens frissítése után
változatlannak kell maradnia. Legalább egy teljes normál használati ciklust
kell megfigyelni.

### 6. Fallback kikapcsolása

A fallback `0` értékre állítása külön firmware commit, külön hardverteszt és
külön jóváhagyás. Nem része az első Alpha.3 csomag automatikus telepítésének.

## Rollback

A sorrend szándékosan firmware-first:

- ha a firmware-teszt hibázik, a Node/Tauri kliensek még nem változtak;
- ha a kliensfrissítés hibázik, a régi kliens visszaállítható, mert a
  firmware fallbackje még engedélyezett;
- a fallback kikapcsolása előtt meg kell őrizni a `4.1.21` fallbackes
  firmware binárist és SHA-256 fájlját;
- firmware `4.1.20` visszaállításakor a fejléc-only klienseket is vissza
  kell állítani, mert a régi firmware csak query-kulcsot ismer.

## Nem része ennek a csomagnak

- produkciós telepítés;
- `main` merge;
- query fallback azonnali kikapcsolása;
- HMAC, nonce vagy timestamp-alapú aláírás;
- EEPROM A/B bank;
- teljes mobil hardverteszt;
- `5.0.0-alpha.3` verziófinalizálás.
