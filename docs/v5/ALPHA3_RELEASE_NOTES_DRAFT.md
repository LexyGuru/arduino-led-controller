# V5 Alpha.3 – kiadási jegyzetek tervezete

## Állapot

Fejlesztési munkacsomag. Nem produkciós kiadás és nem jogosít `main` merge-re.

## Biztonsági változás

Az Arduino API-kulcs a Node-, legacy- és Tauri-kliensekben többé nem kerül
`?k=` URL-paraméterbe. Az új belső eszközhitelesítés:

```http
X-Device-Key: <ARDUINO_API_KEY>
```

## Firmware

- firmware-verzió: `4.1.21`;
- header-first eszközhitelesítés;
- kis- és nagybetűtől független fejlécnév;
- duplikált fejléc tiltása;
- hibás fejléc mellett nincs query fallback;
- átmeneti, kikapcsolható `?k=` kompatibilitás;
- fejléc- és fallback-számlálók a státuszban;
- a query-kulcs nem kerül route-ba vagy naplózott útvonalba.
- feature ág buildje artifactot készít, de nem írhatja felül a `firmware-latest` nyilvános release-t.

## Gateway és desktop

- moduláris Node kliens `X-Device-Key` fejlécet küld;
- hívó nem írhatja felül kisbetűs vagy duplikált fejléccel;
- legacy Node kliens fejlécet küld;
- macOS `curl` fallback stdinről kapja a titkos fejlécet;
- Tauri közvetlen kliens fejlécet küld;
- Arduino API-kulcs nincs a kliensoldali URL-ekben.

## Validáció

- új Alpha.3 szerződés- és negatív teszt;
- új package manifest és SHA-256 ellenőrzés;
- repository-validátorba bekötött Alpha.3 tesztek;
- dokumentált firmware-first rollout és rollback;
- külön valódi UNO R4 WiFi hardverteszt-runbook.

## Nyitott kapuk

- Arduino CLI fordítás GitHub Actionsben;
- valódi eszközteszt;
- staging gateway teszt;
- firmware-first rollout bizonyítása;
- query fallback kikapcsolási próba;
- új Alpha.3 gate, staging, rollback és evidence;
- `5.0.0-alpha.3` finalization;
- `main` továbbra is tiltott.

## Teszt- és dokumentációs konzisztencia

- Az Alpha.2 finalizációs regressziós teszt már a bizonyított `PR #1` / `bd5cb67` `next` merge állapotot várja.
- A `main` merge és a produkciós telepítés továbbra is külön, nyitott kapu.


## Desktop TypeScript build gate

Az Alpha.3 csomag a teljes desktop TypeScript buildet is blokkoló kapuként kezeli. A V5 preflight panel az ismeretlen API-mezőket explicit szöveggé alakítja, a Vite környezeti változók saját típusdeklarációt kapnak, a Tauri `invoke` pedig típusos adapteren keresztül illeszkedik a desktop API credential bridge szerződéséhez.
