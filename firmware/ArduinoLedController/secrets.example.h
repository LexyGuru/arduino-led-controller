#pragma once
// Masold secrets.h nevvel ugyanebbe a mappaba es ird be a sajat adataidat.
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define OTA_PASSWORD "CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD"
#define API_SHARED_SECRET "CHANGE_THIS_TO_A_LONG_RANDOM_API_SECRET"
// A teljes útvonal 18-48 karakter lehet a kezdő / jellel együtt.
#define API_PRIVATE_PATH "/CHANGE_THIS_TO_A_LONG_RANDOM_API_PATH"
// Alpha.3 átmenet: 1 = régi ?k= query fallback, 0 = csak X-Device-Key fejléc.
#define API_ALLOW_QUERY_KEY_FALLBACK 1
#define ENABLE_PIR_SENSORS 0
#define ENABLE_PHYSICAL_BUTTONS 0
