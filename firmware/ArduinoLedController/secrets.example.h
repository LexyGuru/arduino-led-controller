#pragma once
// Masold secrets.h nevvel ugyanebbe a mappaba es ird be a sajat adataidat.
// A secrets.h fajl nincs GitHubra feltoltve. Az elso USB-s feltoltes ezeket
// az UNO R4 EEPROM memoriajaba menti, igy a kesobbi publikus OTA frissitesek
// nem irjak felul a WiFi- vagy OTA-jelszavadat.
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define OTA_PASSWORD "CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD"

// A vedett HTTP API-hoz ket kulon titok kell. Mindkettot hosszu, veletlen
// karakterlancra csereld, majd USB-n toltsd fel egyszer a firmware-t.
// Ezek az Arduino EEPROM-jaba kerulnek; a kesobbi publikus OTA binaris nem
// irja felul oket.
#define API_SHARED_SECRET "CHANGE_THIS_TO_A_LONG_RANDOM_API_SECRET"
#define API_PRIVATE_PATH "/CHANGE_THIS_TO_A_LONG_RANDOM_API_PATH"

// Jelenleg nincs szenzor vagy fizikai gomb a kartyara kotve, ezert mindketto
// alapbol ki van kapcsolva. Ha kesobb bekotod oket, allitsd 1-re.
#define ENABLE_PIR_SENSORS 0
#define ENABLE_PHYSICAL_BUTTONS 0
