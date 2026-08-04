# Biztonsági szabályok

## Támogatott verziók

| Verzió | Támogatás |
|---|---|
| `5.0.0-beta.6` | aktívan támogatott beta |
| `5.0.0-beta.4` | átmenetileg támogatott |
| régebbi beta | nem támogatott |
| `4.x` stable | csak kritikus biztonsági javítások |

## Direct API hitelesítés

- Hitelesítési fejléc: `X-Device-Key`.
- Query-string kulcsfallback: tiltott.
- Direct módban nincs felhasználónév/jelszó alapú belépés.
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
- Egy alkalmazás-munkamenetben ugyanazt a Keychain hozzáférést ne kérje többször.
- A firmware SHA-256 ellenőrzése feltöltés előtt kötelező.

## Érzékeny fájlok

A következő fájlok nem kerülhetnek Gitbe vagy release-csomagba:

- `firmware/ArduinoLedController/secrets.h`;
- `.env` és `.env.*`;
- API-eszközkulcs, OTA-jelszó, Wi-Fi-jelszó;
- privát API-útvonalat és titkot együtt tartalmazó profil;
- `.pem`, `.p12`, private key vagy provisioning profile;
- build artifact és lokális credential-adatbázis.

## TLS, reverse proxy és DDNS

- Az Arduino API-t és OTA-portot ne tedd közvetlenül elérhetővé a nyilvános internetről.
- Távoli eléréshez HTTPS reverse proxy ajánlott.
- Production környezetben érvényes, ellenőrizhető TLS chain szükséges.
- Self-signed tanúsítvány csak elkülönített fejlesztői tesztre használható.
- DDNS célpontnál ellenőrizd, hogy a proxy kizárólag a szükséges HTTP API-t továbbítja.
- Az OTA UDP/TCP portot csak megbízható hálózaton engedélyezd.

## Mobilplatformok

A mobil kliens nem végez natív OTA feltöltést. Mobilon az OTA állapot- és kapcsolatellenőrzés letiltott, így nem szabad olyan UI-t vagy háttérfolyamatot hozzáadni, amely ezt megkerüli.

## Sérülékenység bejelentése

Biztonsági hibát ne nyilvános issue-ban közölj. A repository tulajdonosával privát csatornán egyeztess.

A bejelentés tartalmazza:

- érintett alkalmazás- és firmware-verzió;
- reprodukciós lépések titkok nélkül;
- várható és tényleges viselkedés;
- lehetséges hatás;
- javasolt javítás, ha rendelkezésre áll.

Ne mellékelj valódi kulcsot, jelszót, személyes hálózati címet vagy privát tanúsítványt.

## Biztonsági válaszfolyamat

1. A bejelentés visszaigazolása.
2. Hatás és reprodukálhatóság vizsgálata.
3. Javítás elkülönített ágon.
4. Regressziós és secret-scan kapuk.
5. Támogatott verzió kiadása.
6. Szükség esetén kulcs- vagy jelszócsere előírása.

## Nem támogatott konfigurációk

- közvetlen nyilvános Arduino API;
- nyilvános OTA-port;
- query-stringben továbbított kulcs;
- forráskódba írt titok;
- TLS-ellenőrzés tartós kikapcsolása;
- stable és beta firmware-csatorna összekeverése.
