# V5 közvetlen Arduino biztonság és titokkezelés

## Titkok osztályozása

| Titok | Tulajdonos | Használat |
|---|---|---|
| Wi-Fi SSID/jelszó | Arduino | hálózati kapcsolat |
| API privát útvonal | Arduino + kliens | endpoint rejtése/szűkítése |
| Arduino eszközkulcs | Arduino + kliens | `X-Device-Key` |
| OTA-jelszó | Arduino + desktop | firmware-feltöltés |
| API v2 Bearer token | opcionális Node/LXC | szerverauth |
| Session-cookie | opcionális Node/LXC | szerverauth |

Az API v2 Bearer token és a session-cookie nem közvetlen Arduino-hitelesítés.

## `secrets.h`

A firmware fejlesztői konfigurációja:

```cpp
#pragma once

#define WIFI_SSID "..."
#define WIFI_PASSWORD "..."
#define API_PRIVATE_PATH "/..."
#define API_SHARED_SECRET "..."
#define OTA_PASSWORD "..."
```

Követelmények:

- `.gitignore`;
- release-scan tiltás;
- példafájlban csak placeholder;
- legalább 24 karakteres eszközkulcs;
- legalább 16 karakteres OTA-jelszó;
- egyedi érték eszközönként.

## Miért nem olvashatja ki a Tauri az Arduino kulcsát?

Ha a meglévő kulcs lekérhető lenne az API-n, bármely már hálózati hozzáféréssel rendelkező támadó megszerezhetné.

Megengedett válasz:

```json
{
  "deviceKeyConfigured": true,
  "otaPasswordConfigured": true
}
```

Tiltott válasz:

```json
{
  "deviceKey": "valodi-kulcs",
  "otaPassword": "valodi-jelszo"
}
```

## Titkos profilfájl

Tervezett fájlnév:

```text
controller-profile.secret.json
```

Példa:

```json
{
  "schemaVersion": 1,
  "profile": {
    "name": "Beta Arduino",
    "localHost": "10.0.0.117",
    "localPort": 80,
    "remoteHost": "beta-lexyguruhome.ddns.net",
    "remotePort": 25666,
    "apiPrivatePath": "/REPLACE_ME",
    "deviceKey": "REPLACE_ME",
    "otaHost": "10.0.0.117",
    "otaPort": 65280,
    "otaPassword": "REPLACE_ME"
  }
}
```

Ez a fájl:

- csak helyi átadásra való;
- nem kerül GitHubra;
- nem kerül felhőszinkronba;
- import után törölhető;
- a Tauri nem tárolja változatlanul.

## Credential store

Ajánlott service:

```text
arduino-led-controller
```

Ajánlott accountok:

```text
device/<profile-id>/api-private-path
device/<profile-id>/device-key
device/<profile-id>/ota-password
```

A korábbi egyetlen `api-v2-bearer` scope nem elég több Arduino-profilhoz.

## Frontend tárolás

Normál konfigurációban tárolható:

- profil ID;
- profilnév;
- hostok;
- portok;
- preferred endpoint;
- credential reference állapot;
- utolsó kapcsolat ideje.

Nem tárolható:

- eszközkulcs;
- OTA-jelszó;
- teljes auth header;
- session-cookie;
- Bearer token.

## Naplóredakció

Redaktálandó minták:

- `X-Device-Key`;
- `Authorization`;
- `Cookie`;
- `Set-Cookie`;
- `OTA_PASSWORD`;
- `API_SHARED_SECRET`;
- privát importfájl tartalma.

## Kulcscsere

Tervezett biztonságos folyamat:

1. kliens a jelenlegi kulccsal hitelesít;
2. helyi hálózati kapcsolat követelmény;
3. új kulcs erősségének ellenőrzése;
4. Arduino atomikusan EEPROM-ba ment;
5. válasz csak siker/státusz;
6. Tauri frissíti a credential store-t;
7. régi kulcs törlése a memóriából.

## Távoli használat

A privát útvonal és az eszközkulcs nem titkosítja a HTTP-forgalmat.

Ajánlott:

- WireGuard/Tailscale/VPN;
- TLS-es reverse proxy;
- korlátozott tűzfalszabály.

Az OTA-port közvetlen internetes továbbítása tiltott.
