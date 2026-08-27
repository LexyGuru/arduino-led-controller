# Biztonsági szabályok

## Támogatott verziók

| Vonal | Támogatás |
|---|---|
| `6.0.0-beta.7` | aktívan támogatott Beta |
| `6.0.0-beta.6` | előző Beta, átmeneti visszaállítási referencia |
| `5.8.0` stable | támogatott stabil alkalmazásvonal |
| régebbi kiadások | csak külön döntés alapján |

A Beta.7 firmware identity: `5.1.0-beta.4`, Direct API: `1.2.0`.

## Direct API hitelesítés

- Hitelesítési fejléc: `X-Device-Key`.
- Query-string kulcsfallback: tiltott.
- Direct módban nincs felhasználónév/jelszó alapú Arduino-belépés.
- A privát API-útvonal és az eszközkulcs nem kerülhet URL-paraméterbe vagy naplóba.
- A kliens csak a konfigurált Arduino-eszközhöz használhatja a kulcsot.

## X-Device-Key kezelése

- A kulcs nem kerülhet Gitbe, ZIP-be, release artifactba vagy hibajelentésbe.
- Exportált profil ne tartalmazzon használható titkot.
- Tesztben csak nyilvánvalóan mesterséges placeholder használható.
- A logokban a kulcsot teljesen maszkolni kell.

## OTA-jelszó tárolása

- Az OTA-jelszó nem kerülhet forráskódba vagy `.env` fájlba.
- macOS-on Keychain, Windowson Credential Manager, Linuxon Secret Service használata ajánlott.
- A firmware SHA-256 ellenőrzése feltöltés előtt kötelező.

## Érzékeny fájlok

Nem kerülhet Gitbe vagy release-csomagba többek között: `firmware/ArduinoLedController/secrets.h`, `.env`/credential/private-key fájl, Device Key, OTA-jelszó, Wi-Fi-jelszó, provisioning profile vagy lokális credential-adatbázis.

## TLS, reverse proxy és DDNS

- Az Arduino publikus internetes elérését reverse proxy/TLS és a projekt privát API-path modellje védje.
- Production környezetben érvényes TLS chain szükséges.
- A privát API-prefixet és Device Key-t titokként kell kezelni.
- Az OTA port csak a szándékosan konfigurált, megbízható útvonalon legyen elérhető.
- DDNS/proxy hibánál a valódi HTTP status és a strukturált Direct API hibakód alapján kell diagnosztizálni.

## Structured logging és diagnosztika

A Beta.7 bővített diagnostics/logging mezői nem tehetnek közzé credentialt, privát API-prefixet, OTA-jelszót vagy Wi-Fi-jelszót. Új event code/subsystem mező bevezetésekor secret-redaction contract szükséges.

## Mobilplatformok

Mobilon a platform capability szerint kell OTA-funkciót engedélyezni; a UI nem kerülheti meg a natív/runtime capability gate-eket.

## Sérülékenység bejelentése

Biztonsági hibát ne nyilvános issue-ban közölj. A repository tulajdonosával privát csatornán egyeztess. A reprodukció ne tartalmazzon valódi kulcsot, jelszót, privát hálózati címet vagy tanúsítványt.

## Biztonsági válaszfolyamat

1. Bejelentés visszaigazolása.
2. Hatás és reprodukálhatóság vizsgálata.
3. Javítás elkülönített/testelt candidate-ben.
4. Regressziós, SSOT- és secret-scan kapuk.
5. Támogatott verzió kiadása.
6. Szükség esetén credential-rotáció.

## Nem támogatott konfigurációk

- query-stringben továbbított kulcs;
- forráskódba írt titok;
- tartósan kikapcsolt TLS-ellenőrzés;
- ellenőrizetlen stable/beta firmware-keverés;
- publikus logban vagy diagnostics payloadban megjelenő credential.
