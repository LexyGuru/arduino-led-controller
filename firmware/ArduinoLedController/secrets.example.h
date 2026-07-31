#pragma once

// Másold secrets.h néven, majd adj meg saját, egyedi értékeket.
// A secrets.h nem kerülhet GitHubra vagy release-csomagba.
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define OTA_PASSWORD "CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD"

// Legalább 24 karakteres, eszközönként egyedi X-Device-Key.
#define API_SHARED_SECRET "CHANGE_THIS_TO_A_LONG_RANDOM_API_SECRET"

// Perjellel kezdődő, legalább 18 karakteres privát útvonal.
#define API_PRIVATE_PATH "/CHANGE_THIS_TO_A_LONG_RANDOM_API_PATH"

// F14.1 átmeneti kompatibilitás. Az F14.2-ben kötelezően 0 lesz.
#define API_ALLOW_QUERY_KEY_FALLBACK 0

#define ENABLE_PIR_SENSORS 0
#define ENABLE_PHYSICAL_BUTTONS 0
