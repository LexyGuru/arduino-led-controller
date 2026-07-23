/**
 * Arduino LED Vezérlő - Tiszta verzió v2.0
 * Arduino UNO R4 WiFi + WS2812B LED szalagok + PIR szenzorok + SD kártya
 * 
 * Eltávolítva: licenc rendszer, speciális effektek, GitHub integráció
 */

// ================ KÖNYVTÁRAK ================

#include <WiFiS3.h>
#include <Adafruit_NeoPixel.h>
#include <SD.h>
#include <SPI.h>
#include <ArduinoJson.h>
#include <time.h>
#include <malloc.h>  // malloc információkhoz
#include <WiFiUdp.h>
#include "secrets.h"
//#include "console_log.h"

// ================ KONFIGURÁCIÓS KONSTANSOK ================

// Hardware pinok
#define SD_CS_PIN 10
#define BTN_MODE A0
#define BTN_UP A1
#define BTN_DOWN A2

// Maximális eszközök
#define MAX_LED_STRIPS 6
#define MAX_PIR_SENSORS 6
#define MAX_SCHEDULES_PER_DAY 10

// Időzítések (milliszekundumban)
const unsigned long NTP_SYNC_INTERVAL = 300000;   // 5 perc
const unsigned long NTP_RETRY_INTERVAL = 60000;   // 1 perc újrapróbálkozás
const unsigned long seventyYears = 2208988800UL;  // Unix epoch korrekció
#define WIFI_CHECK_INTERVAL 15000                 // 15 másodperc
#define TIME_UPDATE_INTERVAL 1000                 // 1 másodperc
#define CLIENT_TIMEOUT 2000                       // 2 másodperc

// Magyarországi időzóna
#define HUNGARY_UTC_OFFSET 1  // Téli idő: UTC+1
#define ENABLE_DST true       // Nyári időszámítás

// LED effektek
enum LedEffect {
  EFFECT_STATIC = 0,   // Statikus fény
  EFFECT_BLINK = 1,    // Villogás
  EFFECT_BREATHE = 2,  // Lélegzés
  EFFECT_RAINBOW = 3,  // Szivárvány
  EFFECT_CHASE = 4     // Futófény
};

// Alapértelmezett értékek
#define DEFAULT_WIFI_SSID WIFI_SSID
#define DEFAULT_WIFI_PASSWORD WIFI_PASSWORD
#define DEFAULT_HOSTNAME "arduino-led-controller"
#define DEFAULT_LED_COUNT 300
#define DEFAULT_BRIGHTNESS 100
#define DEFAULT_MAX_BRIGHTNESS 255
#define DEFAULT_MOTION_TIMEOUT 60000  // 1 perc
#define PIR_DEBOUNCE_MS 200           // Zajos PIR kimenet szűrése

// Debug beállítások
#define DEBUG_ENABLED true
#define DEBUG_MEMORY false
// A 100 elemes, String-alapú webes konzolnapló hosszú futás alatt
// memóriafragmentációt okozhat az UNO R4 32 KB RAM-jában. A soros naplózás
// ettől függetlenül változatlanul működik.
#define ENABLE_CONSOLE_LOG_BUFFER 0

#if DEBUG_ENABLED
#define DEBUG_PRINT(x) Serial.print(x)
#define DEBUG_PRINTLN(x) Serial.println(x)
#else
#define DEBUG_PRINT(x)
#define DEBUG_PRINTLN(x)
#endif

// ================ ADATSTRUKTÚRÁK ================

// Időkezelés
struct SystemTime {
  int year;
  int month;
  int day;
  int hour;
  int minute;
  int second;
  unsigned long lastSyncMillis;
  bool isSynced;
};

// Rendszerállapot
struct SystemStatus {
  bool wifiConnected;
  bool timesynced;
  bool sdCardPresent;
  bool serverRunning;
  float temperature;
  unsigned long uptime;
};

// Hálózati beállítások
struct WiFiConfig {
  char ssid[32];
  char password[64];
  char hostname[32];
};

struct IPConfig {
  bool staticIP;
  IPAddress address;
  IPAddress gateway;
  IPAddress subnet;
  IPAddress dns;
};

// Hardware konfigurációk
struct LedStripConfig {
  int id;
  bool enabled;
  int pin;
  int ledCount;
  Adafruit_NeoPixel* strip;
};

struct PirSensorConfig {
  int id;
  bool enabled;
  int pin;
  int ledStripId;
};

struct SystemConfig {
  unsigned long motionTimeout;
  int maxBrightness;
  int defaultBrightness;
  int defaultEffect;
  struct {
    int offset;
    bool autoDST;
  } timezone;
};

// LED állapotok
struct LedStripState {
  int id;
  bool enabled;
  int brightness;
  int effect;
  int color[3];  // RGB
};

// Ütemezés
struct ScheduleEntry {
  int id;
  int hour;
  int minute;
  bool enabled;
  LedStripState strips[3];  // Maximum 3 LED szalag
};

// ================ GLOBÁLIS VÁLTOZÓK ================

// Rendszer állapot
SystemTime systemTime = { 2025, 5, 25, 12, 0, 0, 0, false };
SystemStatus systemStatus = { false, false, false, false, 25.0f, 0 };

// Konfigurációk
WiFiConfig wifiConfig = { DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASSWORD, DEFAULT_HOSTNAME };
IPConfig ipConfig = { false, IPAddress(0, 0, 0, 0), IPAddress(0, 0, 0, 0), IPAddress(0, 0, 0, 0), IPAddress(0, 0, 0, 0) };
SystemConfig systemConfig = { DEFAULT_MOTION_TIMEOUT, DEFAULT_MAX_BRIGHTNESS, DEFAULT_BRIGHTNESS, 0, { HUNGARY_UTC_OFFSET, ENABLE_DST } };

// Hardware
LedStripConfig ledConfig[MAX_LED_STRIPS];
PirSensorConfig pirConfig[MAX_PIR_SENSORS];
int ledStripCount = 0;
int pirSensorCount = 0;

// Állapotok
LedStripState ledStrips[3];
bool pirActive[MAX_PIR_SENSORS] = { false };
unsigned long lastMotionTime[MAX_PIR_SENSORS] = { 0 };
bool pirRawState[MAX_PIR_SENSORS] = { false };
unsigned long pirLastChangeTime[MAX_PIR_SENSORS] = { 0 };

// Ütemezések
ScheduleEntry schedules[7][MAX_SCHEDULES_PER_DAY];
int scheduleCount[7] = { 0, 0, 0, 0, 0, 0, 0 };

// Web szerver
WiFiServer server(80);

// ================ FÜGGVÉNY DEKLARÁCIÓK ================

// Inicializálás
void setupSerial();
void setupSDCard();
void setupWiFi();
void setupTime();
void setupHardware();
void setupWebServer();
void setupComplete();

// Fő ciklusok
void handleWiFi();
void handleTime();
void handlePIR();
void handleButtons();
void handleSchedules();
void handleWebRequests();
void updateLEDs();

// Konfigurációs függvények
bool loadConfig();
bool saveConfig();
void setDefaultConfig();

// LED vezérlés
void initLEDs();
void setLedEffect(int stripIndex, int effect);
void allLedsOn();
void allLedsOff();
void checkLEDConsistency();
void fixLEDState(int ledIndex, bool shouldBeEnabled, int dayOfWeek);
void checkCurrentScheduleState(int dayOfWeek);
void debugLEDStates();

// PIR kezelés
void initPIRs();
void applyScheduleIfNoPir(ScheduleEntry& schedule);

// Ütemezés
void loadSchedules();
void saveSchedules();
void checkSchedules();
void activateSchedule(ScheduleEntry& schedule);
bool isLedActiveInSchedule(int stripIndex);
void createDefaultSchedules();
void initializeSchedules();

// Web szerver
void handleApiRequest(WiFiClient& client, String url);
void handleStaticRequest(WiFiClient& client, String url);
void handleScheduleApi(WiFiClient& client, String url);
void handleConfigApi(WiFiClient& client, String url);
void sendJsonResponse(WiFiClient& client, const String& json);
void sendErrorResponse(WiFiClient& client, const String& message);

// Időkezelés függvények deklarációi
int calculateDayOfWeek(int year, int month, int day);
void updateSystemTime();
void updateSystemTimeSimple();
bool isLeapYear(int year);
const char* getDayName(int dayOfWeek);
String formatDate(int year, int month, int day);
String formatTime(int hour, int minute, int second);
String formatDateTime();
bool isDaylightSavingTime(int year, int month, int day, int hour);

// Segéd függvények
String createStatusJson();
String createMemoryJson();
String urlDecode(const String& input);
void printMemoryInfo();

// ================ SETUP ================

void setup() {
  printStartupBanner();  // ÚJ: Enhanced banner
  
  setupSerial();
  setupSDCard();
  loadConfig();
  setupScheduleDiagnostics();
  setupWiFi();
  setupTime();
  setupHardware();
  setupWebServer();
  setupConsoleWebSocket();  // ÚJ: Console WebSocket
  setupComplete();

  logSuccess("✅ Inicializálás befejezve");
  logInfo("-------------------------------");
}

// ================ LOOP ================

void loop() {
  static unsigned long lastMemoryCheck = 0;
  static unsigned long lastStatusPrint = 0;

  // Rendszer karbantartás
  handleWiFi();
  handleTime();
  handleWebRequests();
  handleConsoleClients();  // ÚJ: Console kliens kezelés

  // Funkcionális logika
  handlePIR();
  handleButtons();
  handleSchedules();
  updateLEDs();
  checkLEDConsistency();

  // Debug és karbantartás
  unsigned long now = millis();

  // Memória és performance monitoring (ÚJ)
  if (now - lastMemoryCheck > 30000) {  // 30 másodpercenként
    lastMemoryCheck = now;
    logMemoryWarning();
    logPerformanceStats();
  }

  // Status print módosítása
  if (DEBUG_ENABLED && now - lastStatusPrint > 30000) {
    lastStatusPrint = now;
    logInfo("=== RENDSZER STÁTUSZ ===");
    logInfo("WiFi: " + String(systemStatus.wifiConnected ? "✅ Kapcsolódva" : "❌ Lekapcsolva"));
    logInfo("Idő szinkronizálva: " + String(systemTime.isSynced ? "✅ Igen" : "❌ Nem"));
    logInfo("Webszerver: " + String(systemStatus.serverRunning ? "✅ Fut" : "❌ Leállt"));
    
    unsigned long totalSeconds = now / 1000;
    unsigned long hours = totalSeconds / 3600;
    unsigned long minutes = (totalSeconds % 3600) / 60;
    unsigned long seconds = totalSeconds % 60;

    String uptimeStr = "Uptime: ";
    if (hours < 10) uptimeStr += "0";
    uptimeStr += String(hours) + ":";
    if (minutes < 10) uptimeStr += "0";
    uptimeStr += String(minutes) + ":";
    if (seconds < 10) uptimeStr += "0";
    uptimeStr += String(seconds);
    
    logInfo(uptimeStr);
    debugLEDStates();
  }

  if (DEBUG_MEMORY && now - lastMemoryCheck > 60000) {
    printMemoryInfo();
  }

  delay(10);
}


// ================ INICIALIZÁLÁSI FÜGGVÉNYEK ================

void setupSerial() {
  Serial.begin(115200);
  delay(1000);
  DEBUG_PRINTLN("Soros port inicializálva");
}

void setupSDCard() {
  DEBUG_PRINTLN("SD kártya inicializálása...");

  // Az SD modul külön SPI eszköz. A CS lábat előbb inaktív állapotba tesszük,
  // majd egyértelműen elindítjuk az SPI buszt, mielőtt az SD könyvtárhoz
  // fordulnánk. Ez UNO R4 WiFi-n megbízhatóbb indítást ad.
  pinMode(SD_CS_PIN, OUTPUT);
  digitalWrite(SD_CS_PIN, HIGH);
  SPI.begin();
  delay(50);

  if (SD.begin(SD_CS_PIN)) {
    systemStatus.sdCardPresent = true;
    DEBUG_PRINTLN("✅ Sikeres (CS: D10)");
  } else {
    systemStatus.sdCardPresent = false;
    DEBUG_PRINTLN("❌ Sikertelen: az SD nem válaszol az SPI buszon");
    DEBUG_PRINTLN("   Ellenőrizd: CS=D10, MOSI=D11, MISO=D12, SCK=D13, GND közös");
    DEBUG_PRINTLN("   A kártya FAT32 legyen; a nyers SD olvasó 3,3 V tápot igényel.");
  }
}

void setupWiFi() {
  logInfo("WiFi kapcsolat létrehozása...");
  
  if (WiFi.status() == WL_NO_MODULE) {
    logError("WiFi modul nem található!");
    systemStatus.wifiConnected = false;
    return;
  }

  String fv = WiFi.firmwareVersion();
  logInfo("WiFi firmware verzió: " + fv);

  logInfo("WiFi modul alaphelyzetbe állítása...");
  WiFi.disconnect();
  delay(1000);

  logInfo("SSID: " + String(wifiConfig.ssid));
  logInfo("Hostname: " + String(wifiConfig.hostname));

  if (ipConfig.staticIP) {
    logInfo("Statikus IP beállítása...");
    WiFi.config(ipConfig.address, ipConfig.gateway, ipConfig.subnet, ipConfig.dns);
  } else {
    logInfo("DHCP IP használata...");
  }

  WiFi.setHostname(wifiConfig.hostname);
  WiFi.begin(wifiConfig.ssid, wifiConfig.password);

  logInfo("Kapcsolódás indítása...");
  
  int attempts = 0;
  int maxAttempts = 60;

  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(1000);
    attempts++;

    if (attempts % 5 == 0) {
      String statusMsg = "Kísérlet " + String(attempts) + "/" + String(maxAttempts);
      
      switch (WiFi.status()) {
        case WL_IDLE_STATUS:
          statusMsg += " - IDLE - Várakozás";
          break;
        case WL_NO_SSID_AVAIL:
          statusMsg += " - HIBA - SSID nem található!";
          logError("SSID nem található: " + String(wifiConfig.ssid));
          break;
        case WL_CONNECT_FAILED:
          statusMsg += " - HIBA - Kapcsolódás sikertelen!";
          logError("WiFi kapcsolódás sikertelen - ellenőrizd a jelszót");
          break;
        case WL_CONNECTION_LOST:
          statusMsg += " - Kapcsolat elveszett";
          break;
        case WL_DISCONNECTED:
          statusMsg += " - Lekapcsolva";
          break;
        default:
          statusMsg += " - Ismeretlen státusz: " + String(WiFi.status());
          break;
      }
      
      logInfo(statusMsg);
    }

    if (attempts == 30) {
      logWarning("Újrapróbálkozás...");
      WiFi.disconnect();
      delay(2000);
      WiFi.begin(wifiConfig.ssid, wifiConfig.password);
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    systemStatus.wifiConnected = true;
    logWiFiSuccess();  // Enhanced logging
    logSuccess("IP cím: " + WiFi.localIP().toString());
    logInfo("Gateway: " + WiFi.gatewayIP().toString());
    logInfo("Jelerősség: " + String(WiFi.RSSI()) + " dBm");
  } else {
    systemStatus.wifiConnected = false;
    logError("WiFi kapcsolódás végleg sikertelen " + String(maxAttempts) + " kísérlet után");
  }
}

void setupTime() {
  if (systemStatus.wifiConnected) {
    DEBUG_PRINT("NTP időszinkronizálás... ");

    if (syncTimeFromNTP()) {
      DEBUG_PRINTLN("✅ Sikeres");
    } else {
      DEBUG_PRINTLN("❌ Sikertelen, alapértelmezett idő használata");
    }
  }
}

void setupHardware() {
  DEBUG_PRINTLN("Hardware inicializálása...");

  initLEDs();
  initPIRs();

  // LED állapotok inicializálása
  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    ledStrips[i].id = i + 1;
    ledStrips[i].enabled = false;
    ledStrips[i].brightness = DEFAULT_BRIGHTNESS;
    ledStrips[i].effect = EFFECT_STATIC;
    ledStrips[i].color[0] = 255;  // Fehér
    ledStrips[i].color[1] = 255;
    ledStrips[i].color[2] = 255;
  }

  // Gombok inicializálása
  pinMode(BTN_MODE, INPUT_PULLUP);
  pinMode(BTN_UP, INPUT_PULLUP);
  pinMode(BTN_DOWN, INPUT_PULLUP);

  DEBUG_PRINTLN("✅ Hardware inicializálva");
}

void setupWebServer() {
  if (systemStatus.wifiConnected) {
    server.begin();
    systemStatus.serverRunning = true;
    DEBUG_PRINT("✅ Webszerver elindítva: http://");
    DEBUG_PRINTLN(WiFi.localIP());
  }
}

void setupComplete() {
  // LED tesztszekvencia - minden szín röviden
  DEBUG_PRINTLN("LED tesztszekvencia indítása...");

  // Piros
  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    if (ledConfig[i].strip) {
      ledConfig[i].strip->fill(ledConfig[i].strip->Color(255, 0, 0));
      ledConfig[i].strip->setBrightness(50);
      ledConfig[i].strip->show();
    }
  }
  delay(500);

  // Zöld
  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    if (ledConfig[i].strip) {
      ledConfig[i].strip->fill(ledConfig[i].strip->Color(0, 255, 0));
      ledConfig[i].strip->show();
    }
  }
  delay(500);

  // Kék
  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    if (ledConfig[i].strip) {
      ledConfig[i].strip->fill(ledConfig[i].strip->Color(0, 0, 255));
      ledConfig[i].strip->show();
    }
  }
  delay(500);

  // Kikapcsolás
  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    if (ledConfig[i].strip) {
      ledConfig[i].strip->clear();
      ledConfig[i].strip->show();
    }
  }

  DEBUG_PRINTLN("✅ LED teszt befejezve");

  // Ütemezések inicializálása
  initializeSchedules();

  // Rendszer készen áll
  DEBUG_PRINTLN("");
  DEBUG_PRINTLN("🎉 RENDSZER KÉSZEN ÁLL!");
  DEBUG_PRINTLN("==============================");
  if (systemStatus.wifiConnected) {
    DEBUG_PRINT("🌐 Web interfész: http://");
    DEBUG_PRINTLN(WiFi.localIP());
  }
  DEBUG_PRINT("💾 SD kártya: ");
  DEBUG_PRINTLN(systemStatus.sdCardPresent ? "Elérhető" : "Nem elérhető");
  DEBUG_PRINT("🕐 Idő szinkronizálva: ");
  DEBUG_PRINTLN(systemTime.isSynced ? "Igen" : "Nem");
  DEBUG_PRINT("📡 LED szalagok: ");
  DEBUG_PRINTLN(ledStripCount);
  DEBUG_PRINT("👁️ PIR szenzorok: ");
  DEBUG_PRINTLN(pirSensorCount);
  DEBUG_PRINTLN("==============================");
}

// ================ KONFIGURÁCIÓS FÜGGVÉNYEK ================

WiFiUDP ntpUDP;

void setDefaultConfig() {
  DEBUG_PRINTLN("Alapértelmezett konfiguráció beállítása");

  // LED szalagok alapértelmezett konfigurációja
  ledStripCount = 3;
  for (int i = 0; i < ledStripCount; i++) {
    ledConfig[i].id = i + 1;
    ledConfig[i].enabled = true;
    ledConfig[i].pin = 6 + i;  // Pin 6, 7, 8
    ledConfig[i].ledCount = DEFAULT_LED_COUNT;
    ledConfig[i].strip = nullptr;
  }

  // PIR szenzorok alapértelmezett konfigurációja
  pirSensorCount = 3;
  for (int i = 0; i < pirSensorCount; i++) {
    pirConfig[i].id = i + 1;
    pirConfig[i].enabled = true;
    pirConfig[i].pin = 2 + i;  // Pin 2, 3, 4
    pirConfig[i].ledStripId = i + 1;
  }

  // IP konfiguráció
  ipConfig.staticIP = false;
  ipConfig.address.fromString("0.0.0.0");
  ipConfig.gateway.fromString("0.0.0.0");
  ipConfig.subnet.fromString("0.0.0.0");
  ipConfig.dns.fromString("0.0.0.0");
}

bool loadConfig() {
  if (!systemStatus.sdCardPresent) {
    DEBUG_PRINTLN("SD kártya nincs jelen, alapértelmezett konfiguráció");
    setDefaultConfig();
    return false;
  }

  if (!SD.exists("/config.json")) {
    DEBUG_PRINTLN("Konfigurációs fájl nem található, alapértelmezett létrehozása");
    setDefaultConfig();
    saveConfig();
    return false;
  }

  File file = SD.open("/config.json", FILE_READ);
  if (!file) {
    DEBUG_PRINTLN("Nem sikerült megnyitni a konfigurációs fájlt");
    setDefaultConfig();
    return false;
  }

  StaticJsonDocument<2048> doc;
  DeserializationError error = deserializeJson(doc, file);
  file.close();

  if (error) {
    DEBUG_PRINT("JSON hiba: ");
    DEBUG_PRINTLN(error.c_str());
    setDefaultConfig();
    return false;
  }

  // WiFi konfiguráció betöltése
  if (doc.containsKey("wifi")) {
    strncpy(wifiConfig.ssid, doc["wifi"]["ssid"] | DEFAULT_WIFI_SSID, sizeof(wifiConfig.ssid) - 1);
    wifiConfig.ssid[sizeof(wifiConfig.ssid) - 1] = '\0';
    strncpy(wifiConfig.password, doc["wifi"]["password"] | DEFAULT_WIFI_PASSWORD, sizeof(wifiConfig.password) - 1);
    wifiConfig.password[sizeof(wifiConfig.password) - 1] = '\0';
    strncpy(wifiConfig.hostname, doc["wifi"]["hostname"] | DEFAULT_HOSTNAME, sizeof(wifiConfig.hostname) - 1);
    wifiConfig.hostname[sizeof(wifiConfig.hostname) - 1] = '\0';
  }

  // LED konfiguráció betöltése
  if (doc.containsKey("ledStrips")) {
    JsonArray ledArray = doc["ledStrips"];
    ledStripCount = min((int)ledArray.size(), MAX_LED_STRIPS);

    for (int i = 0; i < ledStripCount; i++) {
      ledConfig[i].id = ledArray[i]["id"] | (i + 1);
      ledConfig[i].enabled = ledArray[i]["enabled"] | true;
      ledConfig[i].pin = ledArray[i]["pin"] | (6 + i);
      ledConfig[i].ledCount = ledArray[i]["ledCount"] | DEFAULT_LED_COUNT;
      ledConfig[i].strip = nullptr;
    }
  } else {
    // Alapértelmezett LED konfiguráció
    ledStripCount = 3;
    for (int i = 0; i < ledStripCount; i++) {
      ledConfig[i].id = i + 1;
      ledConfig[i].enabled = true;
      ledConfig[i].pin = 6 + i;
      ledConfig[i].ledCount = DEFAULT_LED_COUNT;
      ledConfig[i].strip = nullptr;
    }
  }

  // PIR konfiguráció betöltése
  if (doc.containsKey("pirSensors")) {
    JsonArray pirArray = doc["pirSensors"];
    pirSensorCount = min((int)pirArray.size(), MAX_PIR_SENSORS);

    for (int i = 0; i < pirSensorCount; i++) {
      pirConfig[i].id = pirArray[i]["id"] | (i + 1);
      pirConfig[i].enabled = pirArray[i]["enabled"] | true;
      pirConfig[i].pin = pirArray[i]["pin"] | (2 + i);
      pirConfig[i].ledStripId = pirArray[i]["ledStripId"] | (i + 1);
    }
  } else {
    // Alapértelmezett PIR konfiguráció
    pirSensorCount = 3;
    for (int i = 0; i < pirSensorCount; i++) {
      pirConfig[i].id = i + 1;
      pirConfig[i].enabled = true;
      pirConfig[i].pin = 2 + i;
      pirConfig[i].ledStripId = i + 1;
    }
  }

  DEBUG_PRINTLN("✅ Konfiguráció betöltve");
  return true;
}

bool saveConfig() {
  if (!systemStatus.sdCardPresent) {
    return false;
  }

  StaticJsonDocument<2048> doc;

  // WiFi konfiguráció
  JsonObject wifi = doc.createNestedObject("wifi");
  wifi["ssid"] = wifiConfig.ssid;
  wifi["password"] = wifiConfig.password;
  wifi["hostname"] = wifiConfig.hostname;

  // LED konfiguráció
  JsonArray ledArray = doc.createNestedArray("ledStrips");
  for (int i = 0; i < ledStripCount; i++) {
    JsonObject led = ledArray.createNestedObject();
    led["id"] = ledConfig[i].id;
    led["enabled"] = ledConfig[i].enabled;
    led["pin"] = ledConfig[i].pin;
    led["ledCount"] = ledConfig[i].ledCount;
  }

  // PIR konfiguráció
  JsonArray pirArray = doc.createNestedArray("pirSensors");
  for (int i = 0; i < pirSensorCount; i++) {
    JsonObject pir = pirArray.createNestedObject();
    pir["id"] = pirConfig[i].id;
    pir["enabled"] = pirConfig[i].enabled;
    pir["pin"] = pirConfig[i].pin;
    pir["ledStripId"] = pirConfig[i].ledStripId;
  }

  // Rendszer beállítások
  JsonObject settings = doc.createNestedObject("settings");
  settings["motionTimeout"] = systemConfig.motionTimeout;
  settings["maxBrightness"] = systemConfig.maxBrightness;
  settings["defaultBrightness"] = systemConfig.defaultBrightness;

  // Fájl mentése
  File file = SD.open("/config.json", FILE_WRITE);
  if (!file) {
    return false;
  }

  serializeJson(doc, file);
  file.close();

  DEBUG_PRINTLN("✅ Konfiguráció mentve");
  return true;
}

// ================ LED VEZÉRLÉS ================

// LED állapotok részletes kiírása
void debugLEDStates() {
  DEBUG_PRINTLN("");
  DEBUG_PRINTLN("=== LED ÁLLAPOTOK DEBUG ===");

  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    DEBUG_PRINT("LED ");
    DEBUG_PRINT(i + 1);
    DEBUG_PRINTLN(":");
    DEBUG_PRINT("  Engedélyezve: ");
    DEBUG_PRINTLN(ledStrips[i].enabled ? "✅ IGEN" : "❌ NEM");
    DEBUG_PRINT("  Fényerő: ");
    DEBUG_PRINTLN(ledStrips[i].brightness);
    DEBUG_PRINT("  Effekt: ");
    DEBUG_PRINTLN(ledStrips[i].effect);
    DEBUG_PRINT("  Szín: RGB(");
    DEBUG_PRINT(ledStrips[i].color[0]);
    DEBUG_PRINT(",");
    DEBUG_PRINT(ledStrips[i].color[1]);
    DEBUG_PRINT(",");
    DEBUG_PRINT(ledStrips[i].color[2]);
    DEBUG_PRINTLN(")");

    if (ledConfig[i].strip) {
      DEBUG_PRINT("  Strip brightness: ");
      DEBUG_PRINTLN(ledConfig[i].strip->getBrightness());
    }
    DEBUG_PRINTLN("");
  }

  DEBUG_PRINTLN("===========================");
}

// Rendszeres LED állapot ellenőrzés
void checkLEDConsistency() {
  static unsigned long lastConsistencyCheck = 0;

  // SD-kártya nélkül nincsenek ütemezések, ezért nincs mit összevetni.
  if (!systemStatus.sdCardPresent) return;
  if (millis() - lastConsistencyCheck < 15000) return;  // 15 másodpercenként
  lastConsistencyCheck = millis();

  if (!systemTime.isSynced) return;

  DEBUG_PRINTLN("=== LED KONZISZTENCIA ELLENŐRZÉS ===");

  int dayOfWeek = calculateDayOfWeek(systemTime.year, systemTime.month, systemTime.day);

  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    bool shouldBeEnabled = isLedActiveInSchedule(i);
    bool isCurrentlyEnabled = ledStrips[i].enabled;

    DEBUG_PRINT("LED ");
    DEBUG_PRINT(i + 1);
    DEBUG_PRINT(" ütemezés szerinti állapot: ");
    DEBUG_PRINTLN(shouldBeEnabled ? "✅ BE" : "❌ KI");
    DEBUG_PRINT("");

    // Ellenőrizzük, hogy van-e aktív PIR
    bool hasPirActivity = false;
    for (int j = 0; j < pirSensorCount; j++) {
      if (pirActive[j] && pirConfig[j].ledStripId == (i + 1)) {
        hasPirActivity = true;
        break;
      }
    }

    if (shouldBeEnabled != isCurrentlyEnabled && !hasPirActivity) {
      DEBUG_PRINT("⚠️ INKONZISZTENCIA LED ");
      DEBUG_PRINT(i + 1);
      DEBUG_PRINT(": Jelenlegi: ");
      DEBUG_PRINT(isCurrentlyEnabled ? "✅ BE" : "❌ KI");
      DEBUG_PRINT(", Kellene: ");
      DEBUG_PRINT(shouldBeEnabled ? "✅ BE" : "❌ KI");
      DEBUG_PRINT(" (PIR: ");
      DEBUG_PRINT(hasPirActivity ? "aktív" : "inaktív");
      DEBUG_PRINTLN(", Ütemezés: " + String(shouldBeEnabled ? "✅ BE" : "❌ KI") + ")");

      // Automatikus javítás
      fixLEDState(i, shouldBeEnabled, dayOfWeek);
    } else {
      DEBUG_PRINT("✅ LED ");
      DEBUG_PRINT(i + 1);
      DEBUG_PRINTLN(" állapot megfelelő");
    }
  }

  DEBUG_PRINTLN("===================================");
}

void fixLEDState(int ledIndex, bool shouldBeEnabled, int dayOfWeek) {
  // Keressük meg a jelenlegi aktív ütemezést
  int currentTimeMinutes = systemTime.hour * 60 + systemTime.minute;
  ScheduleEntry* activeSchedule = nullptr;
  int lastActiveTime = -1;

  for (int i = 0; i < scheduleCount[dayOfWeek]; i++) {
    if (!schedules[dayOfWeek][i].enabled) continue;

    int scheduleTime = schedules[dayOfWeek][i].hour * 60 + schedules[dayOfWeek][i].minute;

    if (scheduleTime <= currentTimeMinutes && scheduleTime > lastActiveTime) {
      lastActiveTime = scheduleTime;
      activeSchedule = &schedules[dayOfWeek][i];
    }
  }

  if (activeSchedule) {
    DEBUG_PRINT("🔧 LED ");
    DEBUG_PRINT(ledIndex + 1);
    DEBUG_PRINTLN(" állapot javítása...");

    ledStrips[ledIndex].enabled = activeSchedule->strips[ledIndex].enabled;
    ledStrips[ledIndex].brightness = activeSchedule->strips[ledIndex].brightness;
    ledStrips[ledIndex].effect = activeSchedule->strips[ledIndex].effect;
    ledStrips[ledIndex].color[0] = activeSchedule->strips[ledIndex].color[0];
    ledStrips[ledIndex].color[1] = activeSchedule->strips[ledIndex].color[1];
    ledStrips[ledIndex].color[2] = activeSchedule->strips[ledIndex].color[2];

    updateLEDs();

    DEBUG_PRINT("✅ LED ");
    DEBUG_PRINT(ledIndex + 1);
    DEBUG_PRINTLN(" javítva!");
  }
}

// LED állapot reset alapértelmezett értékekre
void resetLedStates() {
  DEBUG_PRINTLN("=== LED ÁLLAPOTOK RESETELÉSE ===");

  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    ledStrips[i].enabled = false;
    ledStrips[i].brightness = DEFAULT_BRIGHTNESS;
    ledStrips[i].effect = EFFECT_STATIC;
    ledStrips[i].color[0] = 255;  // Fehér
    ledStrips[i].color[1] = 255;
    ledStrips[i].color[2] = 255;

    DEBUG_PRINT("LED ");
    DEBUG_PRINT(i + 1);
    DEBUG_PRINTLN(" resetelve");
  }

  updateLEDs();
  DEBUG_PRINTLN("✅ Minden LED resetelve");
  DEBUG_PRINTLN("===============================");
}

// API endpoint a LED állapot resethez
void handleLedResetApi(WiFiClient& client, String url) {
  if (url == "/api/led/reset") {
    resetLedStates();
    sendJsonResponse(client, "{\"success\":true,\"message\":\"LED állapotok resetelve\"}");
  } else if (url == "/api/led/debug") {
    debugLEDStates();
    sendJsonResponse(client, "{\"success\":true,\"message\":\"LED diagnosztika kiírva a Serial Monitor-ba\"}");
  }
}

void initLEDs() {
  DEBUG_PRINTLN("LED szalagok inicializálása...");

  for (int i = 0; i < ledStripCount; i++) {
    if (ledConfig[i].enabled) {
      ledConfig[i].strip = new Adafruit_NeoPixel(
        ledConfig[i].ledCount,
        ledConfig[i].pin,
        NEO_GRB + NEO_KHZ800);

      ledConfig[i].strip->begin();
      ledConfig[i].strip->clear();
      ledConfig[i].strip->show();

      DEBUG_PRINT("LED szalag ");
      DEBUG_PRINT(ledConfig[i].id);
      DEBUG_PRINT(" - Pin: ");
      DEBUG_PRINT(ledConfig[i].pin);
      DEBUG_PRINT(", LED-ek: ");
      DEBUG_PRINTLN(ledConfig[i].ledCount);
    }
  }
}

void updateLEDs() {
  static bool lastEnabled[3] = { false, false, false };
  static int lastBrightness[3] = { -1, -1, -1 };
  static int lastEffect[3] = { -1, -1, -1 };
  static int lastColor[3][3] = { { -1, -1, -1 }, { -1, -1, -1 }, { -1, -1, -1 } };
  static unsigned long lastEffectUpdate = 0;

  bool needsUpdate = false;
  bool needsEffectUpdate = false;

  // Ellenőrizzük, hogy változott-e valami
  for (int i = 0; i < ledStripCount && i < 3; i++) {
    if (lastEnabled[i] != ledStrips[i].enabled || lastBrightness[i] != ledStrips[i].brightness || lastEffect[i] != ledStrips[i].effect || lastColor[i][0] != ledStrips[i].color[0] || lastColor[i][1] != ledStrips[i].color[1] || lastColor[i][2] != ledStrips[i].color[2]) {
      needsUpdate = true;
      break;
    }
  }

  // Animált effektek esetén rendszeres frissítés szükséges
  unsigned long now = millis();
  if (now - lastEffectUpdate > 50) {  // 50ms-enként frissítjük az animált effekteket
    for (int i = 0; i < ledStripCount && i < 3; i++) {
      if (ledStrips[i].enabled && (ledStrips[i].effect == EFFECT_BLINK || ledStrips[i].effect == EFFECT_BREATHE || ledStrips[i].effect == EFFECT_RAINBOW || ledStrips[i].effect == EFFECT_CHASE)) {
        needsEffectUpdate = true;
        break;
      }
    }
    if (needsEffectUpdate) {
      lastEffectUpdate = now;
    }
  }

  // Csak akkor frissítünk, ha szükséges
  if (!needsUpdate && !needsEffectUpdate) {
    return;
  }

  if (needsUpdate) {
    DEBUG_PRINTLN("🔄 LED állapot változás észlelve - frissítés...");
  }

  for (int i = 0; i < ledStripCount && i < 3; i++) {
    if (!ledConfig[i].enabled || !ledConfig[i].strip) {
      continue;
    }

    Adafruit_NeoPixel* strip = ledConfig[i].strip;

    // Csak akkor írjuk ki a debug információt, ha változott az állapot
    if (needsUpdate && (lastEnabled[i] != ledStrips[i].enabled || lastBrightness[i] != ledStrips[i].brightness || lastEffect[i] != ledStrips[i].effect || lastColor[i][0] != ledStrips[i].color[0] || lastColor[i][1] != ledStrips[i].color[1] || lastColor[i][2] != ledStrips[i].color[2])) {

      DEBUG_PRINT("LED ");
      DEBUG_PRINT(i + 1);
      DEBUG_PRINT(" - ");

      if (ledStrips[i].enabled) {
        DEBUG_PRINT("BE - Fényerő: ");
        DEBUG_PRINT(ledStrips[i].brightness);
        DEBUG_PRINT(", Effekt: ");
        DEBUG_PRINT(ledStrips[i].effect);
        DEBUG_PRINT(", Szín: RGB(");
        DEBUG_PRINT(ledStrips[i].color[0]);
        DEBUG_PRINT(",");
        DEBUG_PRINT(ledStrips[i].color[1]);
        DEBUG_PRINT(",");
        DEBUG_PRINT(ledStrips[i].color[2]);
        DEBUG_PRINTLN(")");
      } else {
        DEBUG_PRINTLN("KI");
      }

      // Állapot mentése
      lastEnabled[i] = ledStrips[i].enabled;
      lastBrightness[i] = ledStrips[i].brightness;
      lastEffect[i] = ledStrips[i].effect;
      lastColor[i][0] = ledStrips[i].color[0];
      lastColor[i][1] = ledStrips[i].color[1];
      lastColor[i][2] = ledStrips[i].color[2];
    }

    if (ledStrips[i].enabled) {
      // Brightness beállítása a strip objektumra
      strip->setBrightness(ledStrips[i].brightness);

      // Effekt alkalmazása
      setLedEffect(i, ledStrips[i].effect);
    } else {
      strip->clear();
      strip->show();
    }
  }

  if (needsUpdate) {
    DEBUG_PRINTLN("✅ LED frissítés befejezve");
  }
}

void setLedEffect(int stripIndex, int effect) {
  if (stripIndex < 0 || stripIndex >= ledStripCount) return;

  Adafruit_NeoPixel* strip = ledConfig[stripIndex].strip;
  if (!strip) return;

  int ledCount = ledConfig[stripIndex].ledCount;

  // Szín lekérése az ledStrips tömbből
  uint32_t color = strip->Color(
    ledStrips[stripIndex].color[0],
    ledStrips[stripIndex].color[1],
    ledStrips[stripIndex].color[2]);

  switch (effect) {
    case EFFECT_STATIC:  // Statikus
      for (int i = 0; i < ledCount; i++) {
        strip->setPixelColor(i, color);
      }
      break;

    case EFFECT_BLINK:  // Villogás
      {
        bool isOn = (millis() % 1000) < 500;
        if (isOn) {
          for (int i = 0; i < ledCount; i++) {
            strip->setPixelColor(i, color);
          }
        } else {
          strip->clear();
        }
      }
      break;

    case EFFECT_BREATHE:  // Lélegzés
      {
        float breath = (sin(millis() / 2000.0 * PI) + 1.0) / 2.0;
        uint32_t dimColor = strip->Color(
          ledStrips[stripIndex].color[0] * breath,
          ledStrips[stripIndex].color[1] * breath,
          ledStrips[stripIndex].color[2] * breath);
        for (int i = 0; i < ledCount; i++) {
          strip->setPixelColor(i, dimColor);
        }
      }
      break;

    case EFFECT_RAINBOW:  // Szivárvány
      {
        for (int i = 0; i < ledCount; i++) {
          int hue = (millis() / 30 + i * 256 / ledCount) % 256;
          strip->setPixelColor(i, strip->gamma32(strip->ColorHSV(hue * 256)));
        }
      }
      break;

    case EFFECT_CHASE:  // Futófény
      {
        strip->clear();
        int position = (millis() / 100) % ledCount;
        for (int i = -3; i <= 3; i++) {
          int pos = (position + i + ledCount) % ledCount;
          float intensity = 1.0 - abs(i) / 3.0;
          uint32_t dimColor = strip->Color(
            ledStrips[stripIndex].color[0] * intensity,
            ledStrips[stripIndex].color[1] * intensity,
            ledStrips[stripIndex].color[2] * intensity);
          strip->setPixelColor(pos, dimColor);
        }
      }
      break;
  }

  strip->show();
}

void allLedsOn() {
  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    ledStrips[i].enabled = true;
  }
  updateLEDs();
}

void allLedsOff() {
  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    ledStrips[i].enabled = false;
  }
  updateLEDs();
}

// ================ PIR KEZELÉS ================

void initPIRs() {
  DEBUG_PRINTLN("PIR szenzorok inicializálása...");

  for (int i = 0; i < pirSensorCount; i++) {
    if (pirConfig[i].enabled) {
      pinMode(pirConfig[i].pin, INPUT);

      DEBUG_PRINT("PIR szenzor ");
      DEBUG_PRINT(pirConfig[i].id);
      DEBUG_PRINT(" - Pin: ");
      DEBUG_PRINT(pirConfig[i].pin);
      DEBUG_PRINT(", LED szalag: ");
      DEBUG_PRINTLN(pirConfig[i].ledStripId);
    }
  }
}

void handlePIR() {
  unsigned long now = millis();

  for (int i = 0; i < pirSensorCount; i++) {
    if (!pirConfig[i].enabled) continue;

    bool currentState = digitalRead(pirConfig[i].pin);

    // A PIR kimenete váltáskor rövid ideig zajos lehet. Csak a legalább
    // PIR_DEBOUNCE_MS ideje változatlan HIGH szintet tekintjük mozgásnak.
    if (currentState != pirRawState[i]) {
      pirRawState[i] = currentState;
      pirLastChangeTime[i] = now;
    }

    int ledIndex = -1;
    for (int j = 0; j < ledStripCount && j < 3; j++) {
      if (ledConfig[j].id == pirConfig[i].ledStripId) {
        ledIndex = j;
        break;
      }
    }

    if (ledIndex == -1) continue;

    if (pirRawState[i] && now - pirLastChangeTime[i] >= PIR_DEBOUNCE_MS) {
      // Minden stabil HIGH ciklus frissíti az utolsó mozgás idejét, de a
      // napló és a LED-bekapcsolás csak egyetlen alkalommal fut le.
      lastMotionTime[i] = now;
      if (!pirActive[i]) {
        pirActive[i] = true;
        logPIRTrigger(pirConfig[i].id, pirConfig[i].ledStripId);
        ledStrips[ledIndex].enabled = true;
        updateLEDs();
      }
    }

    if (pirActive[i] && (now - lastMotionTime[i] > systemConfig.motionTimeout)) {
      pirActive[i] = false;

      if (!isLedActiveInSchedule(ledIndex)) {
        ledStrips[ledIndex].enabled = false;
        updateLEDs();
      }

      logInfo("PIR timeout - PIR " + String(pirConfig[i].id));
    }
  }
}

// ================ GOMBOK KEZELÉSE ================

void handleButtons() {
  static unsigned long lastButtonCheck = 0;
  static bool lastModeState = HIGH;
  static bool lastUpState = HIGH;
  static bool lastDownState = HIGH;

  if (millis() - lastButtonCheck < 50) return;  // Debouncing
  lastButtonCheck = millis();

  bool modeState = digitalRead(BTN_MODE);
  bool upState = digitalRead(BTN_UP);
  bool downState = digitalRead(BTN_DOWN);

  // Mode gomb - effekt váltás
  if (modeState == LOW && lastModeState == HIGH) {
    for (int i = 0; i < 3 && i < ledStripCount; i++) {
      ledStrips[i].effect = (ledStrips[i].effect + 1) % 5;
    }
    DEBUG_PRINTLN("Effekt váltás");
    updateLEDs();
  }

  // Up gomb - fényerő növelése
  if (upState == LOW && lastUpState == HIGH) {
    for (int i = 0; i < 3 && i < ledStripCount; i++) {
      ledStrips[i].brightness = min(systemConfig.maxBrightness, ledStrips[i].brightness + 25);
    }
    DEBUG_PRINTLN("Fényerő növelése");
    updateLEDs();
  }

  // Down gomb - fényerő csökkentése
  if (downState == LOW && lastDownState == HIGH) {
    for (int i = 0; i < 3 && i < ledStripCount; i++) {
      ledStrips[i].brightness = max(0, ledStrips[i].brightness - 25);
    }
    DEBUG_PRINTLN("Fényerő csökkentése");
    updateLEDs();
  }

  lastModeState = modeState;
  lastUpState = upState;
  lastDownState = downState;
}

// ================ ÜTEMEZÉSI RENDSZER ================

// Javított loadSchedules() függvény a meglévő fájlformátumhoz
void loadSchedules() {
  if (!systemStatus.sdCardPresent) {
    DEBUG_PRINTLN("SD kártya nincs jelen, ütemezések betöltése sikertelen");
    return;
  }

  DEBUG_PRINTLN("=== ÜTEMEZÉSEK BETÖLTÉSE ===");
  DEBUG_PRINTLN("Fájlformátum: S[nap]L[led].JS");

  // Nullázzuk az ütemezéseket
  for (int day = 0; day < 7; day++) {
    scheduleCount[day] = 0;
  }

  // Minden napra és LED szalagra
  for (int day = 0; day < 7; day++) {
    DEBUG_PRINT("Nap ");
    DEBUG_PRINT(day);
    DEBUG_PRINT(" (");
    DEBUG_PRINT(getDayName(day));
    DEBUG_PRINTLN("):");

    // Kombinált ütemezések tárolása napra
    struct TempSchedule {
      int hour;
      int minute;
      bool enabled;
      LedStripState strips[3];
      bool hasData;
    };

    TempSchedule tempSchedules[MAX_SCHEDULES_PER_DAY];
    int tempCount = 0;

    // Inicializálás
    for (int i = 0; i < MAX_SCHEDULES_PER_DAY; i++) {
      tempSchedules[i].hasData = false;
      for (int j = 0; j < 3; j++) {
        tempSchedules[i].strips[j].enabled = false;
        tempSchedules[i].strips[j].brightness = 0;
        tempSchedules[i].strips[j].effect = 0;
        tempSchedules[i].strips[j].color[0] = 255;
        tempSchedules[i].strips[j].color[1] = 255;
        tempSchedules[i].strips[j].color[2] = 255;
      }
    }

    // LED szalagok fájljainak betöltése
    for (int ledIndex = 0; ledIndex < ledStripCount && ledIndex < 3; ledIndex++) {
      char filename[12];
      sprintf(filename, "/S%dL%d.JS", day, ledIndex + 1);

      DEBUG_PRINT("  Fájl: ");
      DEBUG_PRINT(filename);

      if (!SD.exists(filename)) {
        DEBUG_PRINTLN(" - Nem létezik");
        continue;
      }

      File file = SD.open(filename, FILE_READ);
      if (!file) {
        DEBUG_PRINTLN(" - Nem nyitható meg");
        continue;
      }

      DEBUG_PRINT(" - Betöltés... ");

      StaticJsonDocument<1024> doc;
      DeserializationError error = deserializeJson(doc, file);
      file.close();

      if (error) {
        DEBUG_PRINT("JSON hiba: ");
        DEBUG_PRINTLN(error.c_str());
        continue;
      }

      JsonArray schedulesArray = doc["schedules"];
      DEBUG_PRINT("Ütemezések: ");
      DEBUG_PRINTLN(schedulesArray.size());

      // Ütemezések feldolgozása
      for (JsonObject scheduleObj : schedulesArray) {
        int hour = scheduleObj["hour"] | 0;
        int minute = scheduleObj["minute"] | 0;
        bool enabled = scheduleObj["enabled"] | false;

        // Keressük meg, hogy van-e már ilyen időpont
        int existingIndex = -1;
        for (int i = 0; i < tempCount; i++) {
          if (tempSchedules[i].hour == hour && tempSchedules[i].minute == minute) {
            existingIndex = i;
            break;
          }
        }

        // Ha nincs, hozzuk létre
        if (existingIndex == -1 && tempCount < MAX_SCHEDULES_PER_DAY) {
          existingIndex = tempCount++;
          tempSchedules[existingIndex].hour = hour;
          tempSchedules[existingIndex].minute = minute;
          tempSchedules[existingIndex].enabled = enabled;
          tempSchedules[existingIndex].hasData = true;
        }

        // LED szalag adatok hozzáadása
        if (existingIndex >= 0) {
          JsonObject stripObj = scheduleObj["strip"];
          tempSchedules[existingIndex].strips[ledIndex].id = ledIndex + 1;
          tempSchedules[existingIndex].strips[ledIndex].enabled = stripObj["enabled"] | false;
          tempSchedules[existingIndex].strips[ledIndex].brightness = stripObj["brightness"] | 0;
          tempSchedules[existingIndex].strips[ledIndex].effect = stripObj["effect"] | 0;

          JsonArray colorArray = stripObj["color"];
          if (colorArray.size() >= 3) {
            tempSchedules[existingIndex].strips[ledIndex].color[0] = colorArray[0] | 255;
            tempSchedules[existingIndex].strips[ledIndex].color[1] = colorArray[1] | 255;
            tempSchedules[existingIndex].strips[ledIndex].color[2] = colorArray[2] | 255;
          }

          DEBUG_PRINT("    ");
          if (hour < 10) DEBUG_PRINT("0");
          DEBUG_PRINT(hour);
          DEBUG_PRINT(":");
          if (minute < 10) DEBUG_PRINT("0");
          DEBUG_PRINT(minute);
          DEBUG_PRINT(" LED");
          DEBUG_PRINT(ledIndex + 1);
          DEBUG_PRINT(" F:");
          DEBUG_PRINT(tempSchedules[existingIndex].strips[ledIndex].brightness);
          DEBUG_PRINTLN(tempSchedules[existingIndex].strips[ledIndex].enabled ? " BE" : " KI");
        }
      }
    }

    // Átmásolás a végleges schedules tömbbe
    scheduleCount[day] = tempCount;
    for (int i = 0; i < tempCount; i++) {
      schedules[day][i].id = i + 1 + day * 100;
      schedules[day][i].hour = tempSchedules[i].hour;
      schedules[day][i].minute = tempSchedules[i].minute;
      schedules[day][i].enabled = tempSchedules[i].enabled;

      for (int j = 0; j < 3; j++) {
        schedules[day][i].strips[j] = tempSchedules[i].strips[j];
      }
    }

    DEBUG_PRINT("  Összesen: ");
    DEBUG_PRINT(scheduleCount[day]);
    DEBUG_PRINTLN(" ütemezés");
  }

  DEBUG_PRINTLN("✅ Ütemezések betöltése befejezve");
  DEBUG_PRINTLN("==============================");
}

// Javított saveSchedules() függvény a meglévő formátumhoz
void saveSchedules() {
  if (!systemStatus.sdCardPresent) return;

  DEBUG_PRINTLN("=== ÜTEMEZÉSEK MENTÉSE ===");

  for (int day = 0; day < 7; day++) {
    for (int ledIndex = 0; ledIndex < ledStripCount && ledIndex < 3; ledIndex++) {
      char filename[12];
      sprintf(filename, "/S%dL%d.JS", day, ledIndex + 1);

      StaticJsonDocument<1024> doc;
      JsonArray schedulesArray = doc.createNestedArray("schedules");

      // Ütemezések hozzáadása az adott LED szalaghoz
      for (int i = 0; i < scheduleCount[day]; i++) {
        JsonObject scheduleObj = schedulesArray.createNestedObject();
        ScheduleEntry& schedule = schedules[day][i];

        scheduleObj["id"] = schedule.id;
        scheduleObj["hour"] = schedule.hour;
        scheduleObj["minute"] = schedule.minute;
        scheduleObj["enabled"] = schedule.enabled;

        // LED szalag adatok
        JsonObject stripObj = scheduleObj.createNestedObject("strip");
        stripObj["enabled"] = schedule.strips[ledIndex].enabled;
        stripObj["brightness"] = schedule.strips[ledIndex].brightness;
        stripObj["effect"] = schedule.strips[ledIndex].effect;
        stripObj["speed"] = 5;  // Alapértelmezett sebesség

        JsonArray colorArray = stripObj.createNestedArray("color");
        colorArray.add(schedule.strips[ledIndex].color[0]);
        colorArray.add(schedule.strips[ledIndex].color[1]);
        colorArray.add(schedule.strips[ledIndex].color[2]);
      }

      File file = SD.open(filename, FILE_WRITE);
      if (file) {
        serializeJson(doc, file);
        file.close();
        DEBUG_PRINT("Mentve: ");
        DEBUG_PRINTLN(filename);
      }
    }
  }

  DEBUG_PRINTLN("✅ Ütemezések mentése befejezve");
}

void handleSchedules() {
  // Az ütemezések SD-kártyán vannak tárolva. Hiányzó kártyánál ne dolgozzunk
  // üres/téves ütemezési állapottal percenként.
  if (!systemStatus.sdCardPresent) return;
  if (!systemTime.isSynced) return;

  static int lastCheckHour = -1;
  static int lastCheckMinute = -1;

  if (systemTime.hour == lastCheckHour && systemTime.minute == lastCheckMinute) {
    return;  // Már ellenőriztük ezt a percet
  }

  lastCheckHour = systemTime.hour;
  lastCheckMinute = systemTime.minute;

  int dayOfWeek = calculateDayOfWeek(systemTime.year, systemTime.month, systemTime.day);

  DEBUG_PRINTLN("=== ÜTEMEZÉS ELLENŐRZÉS ===");
  DEBUG_PRINT("Aktuális idő: ");
  DEBUG_PRINT(systemTime.hour);
  DEBUG_PRINT(":");
  if (systemTime.minute < 10) DEBUG_PRINT("0");
  DEBUG_PRINTLN(systemTime.minute);
  DEBUG_PRINT("Hét napja: ");
  DEBUG_PRINT(dayOfWeek);
  DEBUG_PRINT(" (");
  DEBUG_PRINT(getDayName(dayOfWeek));
  DEBUG_PRINTLN(")");
  DEBUG_PRINT("Mai ütemezések száma: ");
  DEBUG_PRINTLN(scheduleCount[dayOfWeek]);

  // Aktív ütemezés keresése ebben a percben
  bool foundActiveSchedule = false;

  for (int i = 0; i < scheduleCount[dayOfWeek]; i++) {
    ScheduleEntry& schedule = schedules[dayOfWeek][i];

    DEBUG_PRINT("  Ütemezés ");
    DEBUG_PRINT(i + 1);
    DEBUG_PRINT(": ");
    DEBUG_PRINT(schedule.hour);
    DEBUG_PRINT(":");
    if (schedule.minute < 10) DEBUG_PRINT("0");
    DEBUG_PRINT(schedule.minute);
    DEBUG_PRINT(" - Engedélyezett: ");
    DEBUG_PRINT(schedule.enabled ? "Igen" : "Nem");

    if (schedule.enabled && schedule.hour == systemTime.hour && schedule.minute == systemTime.minute) {

      DEBUG_PRINTLN(" - ✅ AKTÍV MOST!");
      foundActiveSchedule = true;

      DEBUG_PRINT("Ütemezés aktiválása: ");
      DEBUG_PRINT(schedule.hour);
      DEBUG_PRINT(":");
      DEBUG_PRINTLN(schedule.minute);

      activateSchedule(schedule);
      break;

    } else {
      DEBUG_PRINTLN(" - Nem most");
    }
  }

  if (!foundActiveSchedule) {
    DEBUG_PRINTLN("❌ Nincs aktív ütemezés ebben a percben");

    // Ellenőrizzük, hogy van-e aktív ütemezés az aktuális időhöz
    checkCurrentScheduleState(dayOfWeek);
  }

  DEBUG_PRINTLN("===========================");
}

void checkCurrentScheduleState(int dayOfWeek) {
  int currentTimeMinutes = systemTime.hour * 60 + systemTime.minute;

  // Keressük meg a legutóbbi aktív ütemezést
  ScheduleEntry* lastActiveSchedule = nullptr;
  int lastActiveTime = -1;

  for (int i = 0; i < scheduleCount[dayOfWeek]; i++) {
    ScheduleEntry& schedule = schedules[dayOfWeek][i];

    if (!schedule.enabled) continue;

    int scheduleTimeMinutes = schedule.hour * 60 + schedule.minute;

    if (scheduleTimeMinutes <= currentTimeMinutes && scheduleTimeMinutes > lastActiveTime) {
      lastActiveTime = scheduleTimeMinutes;
      lastActiveSchedule = &schedule;
    }
  }

  if (lastActiveSchedule) {
    DEBUG_PRINT("💡 Legutóbbi aktív ütemezés: ");
    DEBUG_PRINT(lastActiveSchedule->hour);
    DEBUG_PRINT(":");
    if (lastActiveSchedule->minute < 10) DEBUG_PRINT("0");
    DEBUG_PRINTLN(lastActiveSchedule->minute);

    // Ellenőrizzük, hogy a LED-ek megfelelő állapotban vannak-e
    bool needsUpdate = false;

    for (int i = 0; i < 3 && i < ledStripCount; i++) {
      bool shouldBeEnabled = lastActiveSchedule->strips[i].enabled;
      bool isCurrentlyEnabled = ledStrips[i].enabled;

      // Csak akkor frissítünk, ha nincs aktív PIR
      bool hasPirActivity = false;
      for (int j = 0; j < pirSensorCount; j++) {
        if (pirActive[j] && pirConfig[j].ledStripId == (i + 1)) {
          hasPirActivity = true;
          break;
        }
      }

      if (!hasPirActivity && shouldBeEnabled != isCurrentlyEnabled) {
        needsUpdate = true;
        DEBUG_PRINT("LED ");
        DEBUG_PRINT(i + 1);
        DEBUG_PRINT(" frissítés szükséges: ");
        DEBUG_PRINT(isCurrentlyEnabled ? "BE" : "KI");
        DEBUG_PRINT(" -> ");
        DEBUG_PRINTLN(shouldBeEnabled ? "BE" : "KI");
      }
    }

    if (needsUpdate) {
      DEBUG_PRINTLN("🔄 LED állapotok frissítése ütemezés alapján...");
      applyScheduleIfNoPir(*lastActiveSchedule);
    } else {
      DEBUG_PRINTLN("✅ LED állapotok megfelelők az ütemezésnek");
    }
  } else {
    DEBUG_PRINTLN("💡 Nincs PIR aktivitás, LED állapotok változatlanok maradnak");
  }
}

void applyScheduleIfNoPir(ScheduleEntry& schedule) {
  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    // Ellenőrizzük, hogy van-e aktív PIR erre a LED szalagra
    bool hasPirActivity = false;
    for (int j = 0; j < pirSensorCount; j++) {
      if (pirActive[j] && pirConfig[j].ledStripId == (i + 1)) {
        hasPirActivity = true;
        break;
      }
    }

    // Csak akkor alkalmazzuk az ütemezést, ha nincs PIR aktivitás
    if (!hasPirActivity) {
      ledStrips[i].enabled = schedule.strips[i].enabled;
      ledStrips[i].brightness = schedule.strips[i].brightness;
      ledStrips[i].effect = schedule.strips[i].effect;
      ledStrips[i].color[0] = schedule.strips[i].color[0];
      ledStrips[i].color[1] = schedule.strips[i].color[1];
      ledStrips[i].color[2] = schedule.strips[i].color[2];

      DEBUG_PRINT("LED ");
      DEBUG_PRINT(i + 1);
      DEBUG_PRINT(" frissítve: ");
      DEBUG_PRINT(ledStrips[i].enabled ? "BE" : "KI");
      DEBUG_PRINT(", Fényerő: ");
      DEBUG_PRINTLN(ledStrips[i].brightness);
    } else {
      DEBUG_PRINT("LED ");
      DEBUG_PRINT(i + 1);
      DEBUG_PRINTLN(" - PIR aktív, ütemezés mellőzve");
    }
  }

  // Az updateLEDs() automatikusan meghívódik a loop()-ban
}

// Debug függvény a meglévő fájlformátumhoz
void debugExistingScheduleFiles() {
  if (!systemStatus.sdCardPresent) {
    DEBUG_PRINTLN("❌ SD kártya nincs jelen!");
    return;
  }

  DEBUG_PRINTLN("=== MEGLÉVŐ ÜTEMEZÉSI FÁJLOK ===");

  for (int day = 0; day < 7; day++) {
    DEBUG_PRINT("Nap ");
    DEBUG_PRINT(day);
    DEBUG_PRINT(" (");
    DEBUG_PRINT(getDayName(day));
    DEBUG_PRINTLN("):");

    for (int ledIndex = 0; ledIndex < 3; ledIndex++) {
      char filename[12];
      sprintf(filename, "/S%dL%d.JS", day, ledIndex + 1);

      DEBUG_PRINT("  ");
      DEBUG_PRINT(filename);
      DEBUG_PRINT(": ");

      if (SD.exists(filename)) {
        File file = SD.open(filename, FILE_READ);
        if (file) {
          DEBUG_PRINT("✅ (");
          DEBUG_PRINT(file.size());
          DEBUG_PRINTLN(" byte)");

          // JSON tartalom ellenőrzése
          StaticJsonDocument<1024> doc;
          DeserializationError error = deserializeJson(doc, file);

          if (error) {
            DEBUG_PRINT("    ❌ JSON hiba: ");
            DEBUG_PRINTLN(error.c_str());
          } else {
            JsonArray schedules = doc["schedules"];
            DEBUG_PRINT("    📅 Ütemezések: ");
            DEBUG_PRINTLN(schedules.size());

            for (JsonObject schedule : schedules) {
              int hour = schedule["hour"];
              int minute = schedule["minute"];
              bool enabled = schedule["enabled"];

              DEBUG_PRINT("      ");
              if (hour < 10) DEBUG_PRINT("0");
              DEBUG_PRINT(hour);
              DEBUG_PRINT(":");
              if (minute < 10) DEBUG_PRINT("0");
              DEBUG_PRINT(minute);
              DEBUG_PRINTLN(enabled ? " ✅" : " ❌");
            }
          }
          file.close();
        } else {
          DEBUG_PRINTLN("❌ Nem nyitható meg");
        }
      } else {
        DEBUG_PRINTLN("❌ Nem létezik");
      }
    }
  }

  DEBUG_PRINTLN("================================");
}

// API endpoint a meglévő fájlformátumhoz
void handleExistingScheduleApi(WiFiClient& client, String url) {
  if (url == "/api/schedule/files") {
    // Meglévő fájlok listázása
    String response = "{\"files\":[";
    bool first = true;

    for (int day = 0; day < 7; day++) {
      for (int ledIndex = 0; ledIndex < 3; ledIndex++) {
        char filename[12];
        sprintf(filename, "/S%dL%d.JS", day, ledIndex + 1);

        if (SD.exists(filename)) {
          if (!first) response += ",";
          first = false;

          File file = SD.open(filename, FILE_READ);
          response += "{\"name\":\"" + String(filename) + "\",\"size\":" + String(file.size()) + ",\"day\":" + String(day) + ",\"led\":" + String(ledIndex + 1) + "}";
          file.close();
        }
      }
    }

    response += "]}";
    sendJsonResponse(client, response);
  } else if (url == "/api/schedule/reload") {
    // Ütemezések újrabetöltése
    loadSchedules();
    sendJsonResponse(client, "{\"success\":true,\"message\":\"Ütemezések újrabetöltve\"}");
  } else if (url.startsWith("/api/schedule/file/")) {
    // Konkrét fájl tartalmának lekérése
    String filename = url.substring(19);  // "/api/schedule/file/" után

    if (SD.exists("/" + filename)) {
      File file = SD.open("/" + filename, FILE_READ);
      String content = "";
      while (file.available()) {
        content += (char)file.read();
      }
      file.close();

      client.println("HTTP/1.1 200 OK");
      client.println("Content-Type: application/json");
      client.println("Access-Control-Allow-Origin: *");
      client.println("Connection: close");
      client.print("Content-Length: ");
      client.println(content.length());
      client.println();
      client.println(content);
    } else {
      sendErrorResponse(client, "Fájl nem található");
    }
  }
}

// Setup-ba hozzáadandó diagnosztika
void setupScheduleDiagnostics() {
  DEBUG_PRINTLN("\n=== ÜTEMEZÉSI RENDSZER DIAGNOSZTIKA ===");

  if (!systemStatus.sdCardPresent) {
    DEBUG_PRINTLN("❌ KRITIKUS: SD kártya nincs jelen!");
    return;
  }

  // Meglévő fájlok ellenőrzése
  debugExistingScheduleFiles();

  // Ütemezések betöltése
  loadSchedules();

  // Összesítő jelentés
  DEBUG_PRINTLN("=== ÜTEMEZÉSI ÖSSZESÍTŐ ===");
  int totalSchedules = 0;
  for (int day = 0; day < 7; day++) {
    DEBUG_PRINT(getDayName(day));
    DEBUG_PRINT(": ");
    DEBUG_PRINT(scheduleCount[day]);
    DEBUG_PRINTLN(" ütemezés");
    totalSchedules += scheduleCount[day];
  }
  DEBUG_PRINT("Összes ütemezés: ");
  DEBUG_PRINTLN(totalSchedules);

  if (totalSchedules == 0) {
    DEBUG_PRINTLN("⚠️ FIGYELEM: Nincsenek betöltött ütemezések!");
    DEBUG_PRINTLN("Ellenőrizd a fájlokat vagy hozz létre alapértelmezetteket!");
  }

  DEBUG_PRINTLN("===============================\n");
}

void activateSchedule(ScheduleEntry& schedule) {
  logScheduleActivation(schedule.hour, schedule.minute);  // Enhanced logging
  
  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    bool motionActive = false;
    for (int j = 0; j < pirSensorCount; j++) {
      if (pirActive[j] && pirConfig[j].ledStripId == ledStrips[i].id) {
        motionActive = true;
        break;
      }
    }

    if (!motionActive) {
      ledStrips[i].enabled = schedule.strips[i].enabled;
      ledStrips[i].brightness = schedule.strips[i].brightness;
      ledStrips[i].effect = schedule.strips[i].effect;
      ledStrips[i].color[0] = schedule.strips[i].color[0];
      ledStrips[i].color[1] = schedule.strips[i].color[1];
      ledStrips[i].color[2] = schedule.strips[i].color[2];

      String statusMsg = "LED " + String(i + 1) + " " + (schedule.strips[i].enabled ? "BE" : "KI");
      if (schedule.strips[i].enabled) {
        statusMsg += " - Fényerő: " + String(schedule.strips[i].brightness);
        statusMsg += " - Effekt: " + String(schedule.strips[i].effect);
      }
      logInfo(statusMsg);
    } else {
      logInfo("LED " + String(i + 1) + " - PIR aktív, ütemezés mellőzve");
    }
  }
}

bool isLedActiveInSchedule(int stripIndex) {
  if (!systemTime.isSynced || stripIndex < 0 || stripIndex >= 3) {
    return false;
  }

  int dayOfWeek = calculateDayOfWeek(systemTime.year, systemTime.month, systemTime.day);
  int currentTimeMinutes = systemTime.hour * 60 + systemTime.minute;

  // Keressük az utolsó aktív ütemezést
  int lastActiveSchedule = -1;
  int lastActiveTime = -1;

  for (int i = 0; i < scheduleCount[dayOfWeek]; i++) {
    if (!schedules[dayOfWeek][i].enabled) continue;

    int scheduleTime = schedules[dayOfWeek][i].hour * 60 + schedules[dayOfWeek][i].minute;

    if (scheduleTime <= currentTimeMinutes && scheduleTime > lastActiveTime) {
      lastActiveTime = scheduleTime;
      lastActiveSchedule = i;
    }
  }

  if (lastActiveSchedule >= 0) {
    return schedules[dayOfWeek][lastActiveSchedule].strips[stripIndex].enabled;
  }

  return false;
}


// Új API endpoint a jelenlegi LED állapotok lekéréséhez
void handleLedStatusApi(WiFiClient& client, String url) {
  if (url == "/api/led/status") {
    String response = "{\"leds\":[";

    for (int i = 0; i < 3 && i < ledStripCount; i++) {
      if (i > 0) response += ",";
      response += "{";
      response += "\"id\":" + String(i + 1) + ",";
      response += "\"enabled\":" + String(ledStrips[i].enabled ? "true" : "false") + ",";
      response += "\"brightness\":" + String(ledStrips[i].brightness) + ",";
      response += "\"effect\":" + String(ledStrips[i].effect) + ",";
      response += "\"color\":[" + String(ledStrips[i].color[0]) + "," + String(ledStrips[i].color[1]) + "," + String(ledStrips[i].color[2]) + "],";

      // PIR állapot
      bool pirActiveForThisLed = false;
      for (int j = 0; j < pirSensorCount; j++) {
        if (pirActive[j] && pirConfig[j].ledStripId == (i + 1)) {
          pirActiveForThisLed = true;
          break;
        }
      }
      response += "\"pirActive\":" + String(pirActiveForThisLed ? "true" : "false") + ",";

      // Ütemezés szerinti állapot
      response += "\"scheduleActive\":" + String(isLedActiveInSchedule(i) ? "true" : "false");
      response += "}";
    }

    response += "],\"currentTime\":\"";
    if (systemTime.hour < 10) response += "0";
    response += String(systemTime.hour) + ":";
    if (systemTime.minute < 10) response += "0";
    response += String(systemTime.minute) + "\"}";

    sendJsonResponse(client, response);
  }
}

void createDefaultSchedules() {
  if (!systemStatus.sdCardPresent) return;

  DEBUG_PRINTLN("📅 Alapértelmezett ütemezések létrehozása...");

  // Minden napra ugyanazok az alapértelmezett ütemezések
  for (int day = 0; day < 7; day++) {
    scheduleCount[day] = 4;  // 4 alapértelmezett ütemezés

    // 18:00 - Esti fény bekapcsolása (Meleg fehér, közepes fényerő)
    schedules[day][0].id = day * 100 + 1;
    schedules[day][0].hour = 18;
    schedules[day][0].minute = 0;
    schedules[day][0].enabled = true;

    for (int i = 0; i < 3; i++) {
      schedules[day][0].strips[i].id = i + 1;
      schedules[day][0].strips[i].enabled = true;
      schedules[day][0].strips[i].brightness = 10;  // Közepes fényerő
      schedules[day][0].strips[i].effect = EFFECT_STATIC;
      schedules[day][0].strips[i].color[0] = 0;  // Meleg fehér
      schedules[day][0].strips[i].color[1] = 0;
      schedules[day][0].strips[i].color[2] = 255;
    }

    // 3:00 - Éjszakai fény (Narancssárga, alacsony fényerő)
    schedules[day][1].id = day * 100 + 2;
    schedules[day][1].hour = 3;
    schedules[day][1].minute = 0;
    schedules[day][1].enabled = true;

    for (int i = 0; i < 3; i++) {
      schedules[day][1].strips[i].id = i + 1;
      schedules[day][1].strips[i].enabled = true;
      schedules[day][1].strips[i].brightness = 50;  // Alacsony fényerő
      schedules[day][1].strips[i].effect = EFFECT_STATIC;
      schedules[day][1].strips[i].color[0] = 0;  // Lágy narancssárga
      schedules[day][1].strips[i].color[1] = 0;
      schedules[day][1].strips[i].color[2] = 255;
    }

    // 3:50 - Reggeli fény (Hideg fehér, lélegzés effekt)
    schedules[day][2].id = day * 100 + 3;
    schedules[day][2].hour = 6;
    schedules[day][2].minute = 0;
    schedules[day][2].enabled = true;

    for (int i = 0; i < 3; i++) {
      schedules[day][2].strips[i].id = i + 1;
      schedules[day][2].strips[i].enabled = true;
      schedules[day][2].strips[i].brightness = 100;         // Magas fényerő
      schedules[day][2].strips[i].effect = EFFECT_BREATHE;  // Lélegzés effekt
      schedules[day][2].strips[i].color[0] = 0;             // Hideg fehér
      schedules[day][2].strips[i].color[1] = 0;
      schedules[day][2].strips[i].color[2] = 255;
    }

    // 08:00 - Nappali kikapcsolás
    schedules[day][3].id = day * 100 + 4;
    schedules[day][3].hour = 8;
    schedules[day][3].minute = 0;
    schedules[day][3].enabled = true;

    for (int i = 0; i < 3; i++) {
      schedules[day][3].strips[i].id = i + 1;
      schedules[day][3].strips[i].enabled = false;  // Kikapcsolva
      schedules[day][3].strips[i].brightness = 0;
      schedules[day][3].strips[i].effect = EFFECT_STATIC;
      schedules[day][3].strips[i].color[0] = 0;
      schedules[day][3].strips[i].color[1] = 0;
      schedules[day][3].strips[i].color[2] = 255;
    }

    DEBUG_PRINT("Nap ");
    DEBUG_PRINT(day);
    DEBUG_PRINT(" (");
    DEBUG_PRINT(getDayName(day));
    DEBUG_PRINTLN(") - 4 ütemezés létrehozva");
  }

  // Ütemezések mentése
  saveSchedules();
  DEBUG_PRINTLN("✅ Alapértelmezett ütemezések létrehozva és mentve");
}


void initializeSchedules() {
  if (!systemStatus.sdCardPresent) {
    DEBUG_PRINTLN("SD kártya nincs jelen, ütemezések inicializálása sikertelen");
    return;
  }

  // Ellenőrizzük, hogy léteznek-e már ütemezési fájlok
  bool schedulesExist = false;

  for (int day = 0; day < 7 && !schedulesExist; day++) {
    char filename[20];
    sprintf(filename, "/schedule_%d.json", day);
    if (SD.exists(filename)) {
      schedulesExist = true;
      break;
    }
  }

  if (!schedulesExist) {
    DEBUG_PRINTLN("Ütemezési fájlok nem találhatók, alapértelmezettek létrehozása...");
    createDefaultSchedules();
  } else {
    DEBUG_PRINTLN("Ütemezési fájlok már léteznek, betöltés...");
    loadSchedules();
  }
}

// ================ IDŐKEZELÉS ================

bool syncTimeFromNTP() {
  return preciseSyncTimeFromNTP();
}

void handleTime() {
  handleTimeImproved();
}

bool isDaylightSavingTime(int year, int month, int day, int hour) {
  // Március utolsó vasárnap 2:00-tól október utolsó vasárnap 3:00-ig

  if (month < 3 || month > 10) return false;  // Január, február, november, december - téli idő
  if (month > 3 && month < 10) return true;   // Április-szeptember - nyári idő

  // Március és október esetén az utolsó vasárnapot kell megkeresni
  int lastSunday = day;
  int dayOfWeek = calculateDayOfWeek(year, month, day);
  lastSunday = day - dayOfWeek;  // Az utolsó vasárnap napja

  if (month == 3) {
    // Március utolsó vasárnap 2:00-tól kezdődik a nyári idő
    if (day < lastSunday) return false;
    if (day > lastSunday) return true;
    return hour >= 2;  // Vasárnap 2:00-tól
  } else {             // month == 10
    // Október utolsó vasárnap 3:00-ig tart a nyári idő
    if (day < lastSunday) return true;
    if (day > lastSunday) return false;
    return hour < 3;  // Vasárnap 3:00-ig
  }
}

unsigned long manualNTPRequest(const char* ntpServer) {
  DEBUG_PRINT("NTP kérés: ");
  DEBUG_PRINTLN(ntpServer);

  // DNS feloldás
  IPAddress timeServerIP;
  if (!WiFi.hostByName(ntpServer, timeServerIP)) {
    DEBUG_PRINTLN("DNS feloldás sikertelen");
    return 0;
  }

  DEBUG_PRINT("NTP szerver IP: ");
  DEBUG_PRINTLN(timeServerIP);

  // UDP inicializálása
  if (!ntpUDP.begin(8888)) {
    DEBUG_PRINTLN("UDP indítása sikertelen");
    return 0;
  }

  // NTP kérés buffer (48 byte)
  byte packetBuffer[48];
  memset(packetBuffer, 0, 48);

  // NTP kérés mezők beállítása (RFC 5905)
  packetBuffer[0] = 0b11100011;  // LI=3, VN=4, Mode=3
  packetBuffer[1] = 0;           // Stratum
  packetBuffer[2] = 6;           // Polling Interval
  packetBuffer[3] = 0xEC;        // Peer Clock Precision

  // Root Delay és Root Dispersion (8 byte nulla)
  packetBuffer[12] = 49;
  packetBuffer[13] = 0x4E;
  packetBuffer[14] = 49;
  packetBuffer[15] = 52;

  // Csomag küldése
  ntpUDP.beginPacket(timeServerIP, 123);
  ntpUDP.write(packetBuffer, 48);
  ntpUDP.endPacket();

  DEBUG_PRINTLN("NTP kérés elküldve, válaszra várakozás...");

  // Várakozás a válaszra
  unsigned long startWait = millis();
  while (millis() - startWait < 3000) {  // 3 másodperc timeout
    if (ntpUDP.parsePacket() >= 48) {
      // Válasz olvasása
      ntpUDP.read(packetBuffer, 48);

      // Időbélyeg kinyerése (byte 40-43)
      unsigned long highWord = word(packetBuffer[40], packetBuffer[41]);
      unsigned long lowWord = word(packetBuffer[42], packetBuffer[43]);

      // NTP idő (másodpercek 1900.01.01 óta)
      unsigned long secsSince1900 = highWord << 16 | lowWord;

      // Unix idővé konvertálás (1970.01.01 óta)
      unsigned long epoch = secsSince1900 - seventyYears;

      ntpUDP.stop();
      DEBUG_PRINT("NTP válasz sikeres, epoch: ");
      DEBUG_PRINTLN(epoch);
      return epoch;
    }
    delay(10);
  }

  DEBUG_PRINTLN("NTP válasz timeout");
  ntpUDP.stop();
  return 0;
}

unsigned long getAccurateNTPTime() {
  const char* ntpServers[] = {
    "hu.pool.ntp.org",
    "europe.pool.ntp.org",
    "pool.ntp.org",
    "time.nist.gov",
    "time.google.com"
  };

  for (int i = 0; i < 5; i++) {
    DEBUG_PRINT("NTP szerver ");
    DEBUG_PRINT(i + 1);
    DEBUG_PRINT("/5: ");
    DEBUG_PRINTLN(ntpServers[i]);

    unsigned long epoch = manualNTPRequest(ntpServers[i]);
    if (epoch > 0) {
      DEBUG_PRINTLN("NTP szinkronizálás sikeres!");
      return epoch;
    }

    DEBUG_PRINTLN("Próbálkozás következő szerverrel...");
    delay(1000);
  }

  return 0;
}

bool preciseSyncTimeFromNTP() {
  if (!systemStatus.wifiConnected) {
    DEBUG_PRINTLN("❌ Nincs WiFi kapcsolat az időszinkronizáláshoz");
    return false;
  }

  DEBUG_PRINTLN("=== PRECÍZ NTP IDŐSZINKRONIZÁLÁS ===");

  unsigned long finalTime = 0;

  // 1. Próbálkozás: WiFi.getTime() (gyorsabb)
  DEBUG_PRINTLN("1. WiFi.getTime() próbálkozás...");
  unsigned long wifiTime = WiFi.getTime();

  if (wifiTime > 0) {
    DEBUG_PRINT("WiFi.getTime() sikeres: ");
    DEBUG_PRINTLN(wifiTime);
    finalTime = wifiTime;
  } else {
    DEBUG_PRINTLN("WiFi.getTime() sikertelen");

    // 2. Fallback: Manuális NTP kérés
    DEBUG_PRINTLN("2. Manuális NTP kérés...");
    unsigned long ntpTime = getAccurateNTPTime();

    if (ntpTime > 0) {
      finalTime = ntpTime;
    } else {
      DEBUG_PRINTLN("❌ Minden NTP módszer sikertelen");
      return false;
    }
  }

  // Időzóna korrekció számítása
  time_t rawtime = (time_t)finalTime;
  struct tm* timeinfo = gmtime(&rawtime);

  // Magyar időzóna: UTC+1 télen, UTC+2 nyáron
  int totalOffset = 1;  // Alapértelmezett: téli idő (UTC+1)

  if (systemConfig.timezone.autoDST && isDaylightSavingTime(timeinfo->tm_year + 1900, timeinfo->tm_mon + 1, timeinfo->tm_mday, timeinfo->tm_hour + 1)) {
    totalOffset = 2;  // Nyári idő (UTC+2)
    DEBUG_PRINTLN("Nyári időszámítás aktív (UTC+2)");
  } else {
    DEBUG_PRINTLN("Téli időszámítás aktív (UTC+1)");
  }

  // Időkorrekció alkalmazása
  finalTime += (totalOffset * 3600);

  // Korrigált idő feldolgozása
  rawtime = (time_t)finalTime;
  timeinfo = gmtime(&rawtime);

  // Rendszeridő frissítése
  systemTime.year = timeinfo->tm_year + 1900;
  systemTime.month = timeinfo->tm_mon + 1;
  systemTime.day = timeinfo->tm_mday;
  systemTime.hour = timeinfo->tm_hour;
  systemTime.minute = timeinfo->tm_min;
  systemTime.second = timeinfo->tm_sec;
  systemTime.lastSyncMillis = millis();
  systemTime.isSynced = true;

  // Eredmény kiírása
  DEBUG_PRINTLN("✅ ✅ ✅ IDŐSZINKRONIZÁLÁS SIKERES ✅ ✅ ✅");
  DEBUG_PRINTLN("==========================================");
  DEBUG_PRINT("📅 Dátum: ");
  DEBUG_PRINT(systemTime.year);
  DEBUG_PRINT("-");
  if (systemTime.month < 10) DEBUG_PRINT("0");
  DEBUG_PRINT(systemTime.month);
  DEBUG_PRINT("-");
  if (systemTime.day < 10) DEBUG_PRINT("0");
  DEBUG_PRINTLN(systemTime.day);

  DEBUG_PRINT("🕐 Idő: ");
  if (systemTime.hour < 10) DEBUG_PRINT("0");
  DEBUG_PRINT(systemTime.hour);
  DEBUG_PRINT(":");
  if (systemTime.minute < 10) DEBUG_PRINT("0");
  DEBUG_PRINT(systemTime.minute);
  DEBUG_PRINT(":");
  if (systemTime.second < 10) DEBUG_PRINT("0");
  DEBUG_PRINTLN(systemTime.second);

  DEBUG_PRINT("🌍 Időzóna: UTC+");
  DEBUG_PRINTLN(totalOffset);
  DEBUG_PRINTLN("==========================================");

  return true;
}

bool quickSyncTimeFromNTP() {
  if (!systemStatus.wifiConnected) return false;

  DEBUG_PRINTLN("Gyors NTP szinkronizálás...");

  // Csak WiFi.getTime() próbálkozás
  unsigned long epoch = WiFi.getTime();
  if (epoch == 0) {
    DEBUG_PRINTLN("Gyors szinkronizálás sikertelen");
    return false;
  }

  // Egyszerű időzóna korrekció
  epoch += systemConfig.timezone.offset * 3600;
  if (systemConfig.timezone.autoDST) {
    // Egyszerűsített nyári idő (március-október)
    time_t rawtime = epoch;
    struct tm* timeinfo = gmtime(&rawtime);
    if (timeinfo->tm_mon >= 2 && timeinfo->tm_mon <= 9) {
      epoch += 3600;  // +1 óra
    }
  }

  // Idő beállítása
  time_t rawtime = epoch;
  struct tm* timeinfo = gmtime(&rawtime);

  systemTime.year = timeinfo->tm_year + 1900;
  systemTime.month = timeinfo->tm_mon + 1;
  systemTime.day = timeinfo->tm_mday;
  systemTime.hour = timeinfo->tm_hour;
  systemTime.minute = timeinfo->tm_min;
  systemTime.second = timeinfo->tm_sec;
  systemTime.lastSyncMillis = millis();
  systemTime.isSynced = true;

  DEBUG_PRINTLN("Gyors szinkronizálás sikeres!");
  return true;
}

void handleTimeImproved() {
  static unsigned long lastTimeUpdate = 0;
  static unsigned long lastNTPSync = 0;

  unsigned long now = millis();

  // Rendszeridő frissítése másodpercenként
  if (now - lastTimeUpdate >= 1000) {
    lastTimeUpdate = now;
    updateSystemTime();
  }

  // NTP szinkronizálás ellenőrzése
  bool needsSync = false;

  if (!systemTime.isSynced) {
    needsSync = true;
  } else {
    unsigned long timeSinceLastSync = now - systemTime.lastSyncMillis;
    if (timeSinceLastSync > NTP_SYNC_INTERVAL) {
      needsSync = true;
    }
  }

  // Szinkronizálás végrehajtása
  if (needsSync && systemStatus.wifiConnected && (now - lastNTPSync > NTP_RETRY_INTERVAL)) {
    lastNTPSync = now;

    DEBUG_PRINTLN("=== AUTOMATIKUS NTP SZINKRONIZÁLÁS ===");
    if (systemTime.isSynced) {
      DEBUG_PRINT("Jelenlegi idő: ");
      DEBUG_PRINT(systemTime.hour);
      DEBUG_PRINT(":");
      if (systemTime.minute < 10) DEBUG_PRINT("0");
      DEBUG_PRINT(systemTime.minute);
      DEBUG_PRINT(" → ");
    }

    bool success = preciseSyncTimeFromNTP();

    if (success) {
      DEBUG_PRINT("Új idő: ");
      DEBUG_PRINT(systemTime.hour);
      DEBUG_PRINT(":");
      if (systemTime.minute < 10) DEBUG_PRINT("0");
      DEBUG_PRINTLN(systemTime.minute);
      DEBUG_PRINTLN("Időszinkronizálás sikeres!");
    } else {
      DEBUG_PRINTLN("Időszinkronizálás sikertelen, újrapróbálkozás később");
    }
    DEBUG_PRINTLN("=====================================");
  }

  // Debug információ (ritkábban)
  static unsigned long lastTimePrint = 0;
  if (DEBUG_ENABLED && now - lastTimePrint >= 120000) {  // 2 percenként
    lastTimePrint = now;

    DEBUG_PRINT("Rendszeridő: ");
    DEBUG_PRINT(systemTime.year);
    DEBUG_PRINT("-");
    if (systemTime.month < 10) DEBUG_PRINT("0");
    DEBUG_PRINT(systemTime.month);
    DEBUG_PRINT("-");
    if (systemTime.day < 10) DEBUG_PRINT("0");
    DEBUG_PRINT(systemTime.day);
    DEBUG_PRINT(" ");
    if (systemTime.hour < 10) DEBUG_PRINT("0");
    DEBUG_PRINT(systemTime.hour);
    DEBUG_PRINT(":");
    if (systemTime.minute < 10) DEBUG_PRINT("0");
    DEBUG_PRINT(systemTime.minute);
    DEBUG_PRINT(":");
    if (systemTime.second < 10) DEBUG_PRINT("0");
    DEBUG_PRINT(systemTime.second);

    if (systemTime.isSynced) {
      unsigned long minutesSinceSync = (now - systemTime.lastSyncMillis) / 60000;
      DEBUG_PRINT(" (NTP: ");
      DEBUG_PRINT(minutesSinceSync);
      DEBUG_PRINTLN(" perc)");
    } else {
      DEBUG_PRINTLN(" (NTP: SOHA)");
    }
  }
}

int calculateDayOfWeek(int year, int month, int day) {
  // Zeller formula módosított verzió
  if (month < 3) {
    month += 12;
    year--;
  }

  int k = year % 100;
  int j = year / 100;

  int dayIndex = (day + 13 * (month + 1) / 5 + k + k / 4 + j / 4 - 2 * j) % 7;

  // Konvertálás hétfő=0 formátumra (ISO 8601 standard)
  return (dayIndex + 5) % 7;
}

void updateSystemTime() {
  if (!systemTime.isSynced) {
    return;  // Ha még nem volt sikeres szinkronizálás, nincs értelme frissíteni
  }

  static unsigned long lastUpdateMillis = 0;
  unsigned long currentMillis = millis();

  // Ellenőrizzük, hogy telt-e el legalább 1 másodperc
  if (currentMillis - lastUpdateMillis < 1000) {
    return;  // Még nem telt el egy másodperc
  }

  // Hány másodperc telt el az utolsó frissítés óta
  unsigned long elapsedSeconds = (currentMillis - lastUpdateMillis) / 1000;
  lastUpdateMillis = currentMillis;

  // Időstruktúra frissítése
  systemTime.second += elapsedSeconds;

  // Perc és óra átváltás kezelése
  while (systemTime.second >= 60) {
    systemTime.second -= 60;
    systemTime.minute++;

    if (systemTime.minute >= 60) {
      systemTime.minute = 0;
      systemTime.hour++;

      if (systemTime.hour >= 24) {
        systemTime.hour = 0;
        systemTime.day++;

        // Hónap napjainak száma (egyszerűsített, szökőévet nem kezeli teljesen)
        int daysInMonth[] = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };

        // Szökőév ellenőrzése februárra
        if (systemTime.month == 2 && isLeapYear(systemTime.year)) {
          daysInMonth[1] = 29;
        }

        if (systemTime.day > daysInMonth[systemTime.month - 1]) {
          systemTime.day = 1;
          systemTime.month++;

          if (systemTime.month > 12) {
            systemTime.month = 1;
            systemTime.year++;
          }
        }
      }
    }
  }
}

bool isLeapYear(int year) {
  return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}

void updateSystemTimeSimple() {
  if (!systemTime.isSynced) return;

  static unsigned long lastSecond = 0;
  unsigned long currentSecond = millis() / 1000;

  if (currentSecond != lastSecond) {
    lastSecond = currentSecond;
    systemTime.second++;

    if (systemTime.second >= 60) {
      systemTime.second = 0;
      systemTime.minute++;

      if (systemTime.minute >= 60) {
        systemTime.minute = 0;
        systemTime.hour++;

        if (systemTime.hour >= 24) {
          systemTime.hour = 0;
          systemTime.day++;
          // Egyszerűsített nap kezelés - nem tökéletes, de működik
          if (systemTime.day > 31) {
            systemTime.day = 1;
            systemTime.month++;
            if (systemTime.month > 12) {
              systemTime.month = 1;
              systemTime.year++;
            }
          }
        }
      }
    }
  }
}

const char* getDayName(int dayOfWeek) {
  const char* dayNames[] = {
    "Hétfő", "Kedd", "Szerda", "Csütörtök",
    "Péntek", "Szombat", "Vasárnap"
  };

  if (dayOfWeek >= 0 && dayOfWeek < 7) {
    return dayNames[dayOfWeek];
  }
  return "Ismeretlen";
}

String formatDate(int year, int month, int day) {
  String result = String(year) + "-";
  if (month < 10) result += "0";
  result += String(month) + "-";
  if (day < 10) result += "0";
  result += String(day);
  return result;
}

String formatTime(int hour, int minute, int second) {
  String result = "";
  if (hour < 10) result += "0";
  result += String(hour) + ":";
  if (minute < 10) result += "0";
  result += String(minute) + ":";
  if (second < 10) result += "0";
  result += String(second);
  return result;
}

String formatDateTime() {
  return formatDate(systemTime.year, systemTime.month, systemTime.day) + " " + formatTime(systemTime.hour, systemTime.minute, systemTime.second);
}

// ================ WIFI KEZELÉS ================

void handleWiFi() {
  static unsigned long lastWiFiCheck = 0;
  static unsigned long lastReconnectAttempt = 0;
  static int reconnectAttempts = 0;

  if (millis() - lastWiFiCheck < WIFI_CHECK_INTERVAL) return;
  lastWiFiCheck = millis();

  // WiFi státusz ellenőrzése
  int wifiStatus = WiFi.status();
  bool hasIP = (WiFi.localIP() != IPAddress(0, 0, 0, 0));

  if (wifiStatus == WL_CONNECTED && hasIP) {
    if (!systemStatus.wifiConnected) {
      systemStatus.wifiConnected = true;
      reconnectAttempts = 0;

      DEBUG_PRINTLN("🔄 WiFi újrakapcsolódva!");
      DEBUG_PRINT("📡 IP: ");
      DEBUG_PRINTLN(WiFi.localIP());

      // Webszerver újraindítása
      if (!systemStatus.serverRunning) {
        server.begin();
        systemStatus.serverRunning = true;
        DEBUG_PRINTLN("🌐 Webszerver újraindítva");
      }

      // NTP szinkronizálás
      if (!systemTime.isSynced) {
        DEBUG_PRINTLN("🕐 NTP szinkronizálás indítása...");
        syncTimeFromNTP();
      }
    }
  } else {
    if (systemStatus.wifiConnected) {
      systemStatus.wifiConnected = false;
      systemStatus.serverRunning = false;

      DEBUG_PRINTLN("❌ WiFi kapcsolat elveszett");
      DEBUG_PRINT("Státusz: ");
      switch (wifiStatus) {
        case WL_NO_SSID_AVAIL:
          DEBUG_PRINTLN("SSID nem elérhető");
          break;
        case WL_CONNECT_FAILED:
          DEBUG_PRINTLN("Kapcsolódás sikertelen");
          break;
        case WL_CONNECTION_LOST:
          DEBUG_PRINTLN("Kapcsolat elveszett");
          break;
        case WL_DISCONNECTED:
          DEBUG_PRINTLN("Lekapcsolva");
          break;
        default:
          DEBUG_PRINT("Ismeretlen: ");
          DEBUG_PRINTLN(wifiStatus);
          break;
      }
    }

    // Újrakapcsolódási kísérlet
    if (millis() - lastReconnectAttempt > 30000) {  // 30 másodpercenként
      lastReconnectAttempt = millis();
      reconnectAttempts++;

      DEBUG_PRINT("🔄 WiFi újrakapcsolódás kísérlet ");
      DEBUG_PRINT(reconnectAttempts);
      DEBUG_PRINTLN("...");

      // Ha túl sok sikertelen kísérlet, reset
      if (reconnectAttempts > 10) {
        DEBUG_PRINTLN("🔄 Túl sok sikertelen kísérlet, WiFi reset...");
        WiFi.disconnect();
        delay(5000);
        reconnectAttempts = 0;
      }

      WiFi.begin(wifiConfig.ssid, wifiConfig.password);
    }
  }
}

// ================ WEB SZERVER ================

void handleWebRequests() {
  if (!systemStatus.serverRunning) return;

  WiFiClient client = server.available();
  if (!client) return;

  unsigned long timeout = millis();
  while (client.connected() && !client.available()) {
    if (millis() - timeout > CLIENT_TIMEOUT) {
      client.stop();
      return;
    }
    delay(1);
  }

  String requestLine = "";
  if (client.available()) {
    requestLine = client.readStringUntil('\n');
    requestLine.trim();
  }

  // Fejlécek kihagyása
  while (client.available()) {
    String line = client.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) break;
  }

  // Kérés feldolgozása
  String method = "";
  String url = "";

  int firstSpace = requestLine.indexOf(' ');
  if (firstSpace != -1) {
    method = requestLine.substring(0, firstSpace);
    int secondSpace = requestLine.indexOf(' ', firstSpace + 1);
    if (secondSpace != -1) {
      url = requestLine.substring(firstSpace + 1, secondSpace);
    }
  }

  if (method == "OPTIONS") {
    // CORS preflight
    client.println("HTTP/1.1 204 No Content");
    client.println("Access-Control-Allow-Origin: *");
    client.println("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    client.println("Access-Control-Allow-Headers: Content-Type");
    client.println("Connection: close");
    client.println();
  } else if (method == "GET") {
    if (url.startsWith("/api/")) {
      handleApiRequest(client, url);
    } else {
      handleStaticRequest(client, url);
    }
  }

  // A WiFiS3 kapcsolat azonnali lezárása megszakíthatja a válasz utolsó
  // csomagját. A böngésző ezt többnyire tolerálja, a Node/Axios viszont
  // ECONNRESET hibának veszi, ezért a LED parancs a szerveren hibásnak tűnik.
  delay(50);
  client.stop();
}

void handleApiRequest(WiFiClient& client, String url) {
  debugPrint("API kérés: ");
  debugPrintln(url);

  if (url == "/api/status") {
    sendJsonResponse(client, createStatusJson());
  } else if (url.startsWith("/api/led/")) {
    // LED vezérlés: /api/led/{id}?enabled=1&brightness=100&effect=0&color=255,255,255
    int idStart = 9;
    int idEnd = url.indexOf('?', idStart);
    if (idEnd == -1) idEnd = url.length();

    int ledId = url.substring(idStart, idEnd).toInt();
    if (ledId < 1 || ledId > 3) {
      sendErrorResponse(client, "Érvénytelen LED azonosító");
      return;
    }

    int stripIndex = ledId - 1;
    bool wasEnabled = ledStrips[stripIndex].enabled;
    int oldBrightness = ledStrips[stripIndex].brightness;

    // Paraméterek feldolgozása...
    if (idEnd < url.length()) {
      String params = url.substring(idEnd + 1);

      // enabled paraméter
      int enabledPos = params.indexOf("enabled=");
      if (enabledPos != -1) {
        int valueStart = enabledPos + 8;
        int valueEnd = params.indexOf('&', valueStart);
        if (valueEnd == -1) valueEnd = params.length();
        String value = params.substring(valueStart, valueEnd);
        ledStrips[stripIndex].enabled = (value == "1" || value == "true");
      }

      // brightness paraméter
      int brightnessPos = params.indexOf("brightness=");
      if (brightnessPos != -1) {
        int valueStart = brightnessPos + 11;
        int valueEnd = params.indexOf('&', valueStart);
        if (valueEnd == -1) valueEnd = params.length();
        ledStrips[stripIndex].brightness = params.substring(valueStart, valueEnd).toInt();
      }

      // effect paraméter
      int effectPos = params.indexOf("effect=");
      if (effectPos != -1) {
        int valueStart = effectPos + 7;
        int valueEnd = params.indexOf('&', valueStart);
        if (valueEnd == -1) valueEnd = params.length();
        ledStrips[stripIndex].effect = params.substring(valueStart, valueEnd).toInt();
      }

      // color paraméter
      int colorPos = params.indexOf("color=");
      if (colorPos != -1) {
        int valueStart = colorPos + 6;
        int valueEnd = params.indexOf('&', valueStart);
        if (valueEnd == -1) valueEnd = params.length();
        String colorStr = params.substring(valueStart, valueEnd);

        int comma1 = colorStr.indexOf(',');
        int comma2 = colorStr.indexOf(',', comma1 + 1);

        if (comma1 != -1 && comma2 != -1) {
          ledStrips[stripIndex].color[0] = colorStr.substring(0, comma1).toInt();
          ledStrips[stripIndex].color[1] = colorStr.substring(comma1 + 1, comma2).toInt();
          ledStrips[stripIndex].color[2] = colorStr.substring(comma2 + 1).toInt();
        }
      }
    }

    // Log LED változást
    if (wasEnabled != ledStrips[stripIndex].enabled || oldBrightness != ledStrips[stripIndex].brightness) {
      logLEDChange(ledId, ledStrips[stripIndex].enabled, ledStrips[stripIndex].brightness);
    }

    updateLEDs();
    sendJsonResponse(client, createStatusJson());
  } else if (url == "/api/all-on") {
    allLedsOn();
    logInfo("Összes LED bekapcsolva API-n keresztül");
    sendJsonResponse(client, createStatusJson());
  } else if (url == "/api/all-off") {
    allLedsOff();
    logInfo("Összes LED kikapcsolva API-n keresztül");
    sendJsonResponse(client, createStatusJson());
  } else if (url == "/api/time/sync") {
    if (systemStatus.wifiConnected) {
      logInfo("NTP szinkronizálás kezdeményezve API-n keresztül");
      bool success = syncTimeFromNTP();
      if (success) {
        logNTPSuccess();
        sendJsonResponse(client, "{\"success\":true,\"message\":\"Idő szinkronizálva\"}");
      } else {
        logError("NTP szinkronizálás sikertelen");
        sendErrorResponse(client, "Időszinkronizálás sikertelen");
      }
    } else {
      logError("NTP szinkronizálás kísérlet WiFi kapcsolat nélkül");
      sendErrorResponse(client, "Nincs WiFi kapcsolat");
    }
  } else if (url.startsWith("/api/schedule/")) {
    handleScheduleApi(client, url);
  } else if (url.startsWith("/api/config")) {
    handleConfigApi(client, url);
  } else if (url.startsWith("/api/console")) {  // ÚJ: Console API
    handleConsoleAPI(client, url);
  } else if (url == "/api/restart") {
    logWarning("Rendszer újraindítás kezdeményezve API-n keresztül");
    sendJsonResponse(client, "{\"success\":true,\"message\":\"Újraindítás...\"}");
    delay(1000);
    void (*resetFunc)(void) = 0;
    resetFunc();
  } else if (url == "/api/memory") {
    sendJsonResponse(client, createMemoryJson());
  } else {
    logError("Ismeretlen API végpont: " + url);
    sendErrorResponse(client, "Ismeretlen API végpont");
  }
}


void handleScheduleApi(WiFiClient& client, String url) {
  DEBUG_PRINT("Schedule API kérés: ");
  DEBUG_PRINTLN(url);

  // /api/schedule/day/0 - Adott nap ütemezéseinek lekérése
  if (url.startsWith("/api/schedule/day/")) {
    int dayIndex = url.substring(18).toInt();  // "/api/schedule/day/".length() = 18

    if (dayIndex < 0 || dayIndex >= 7) {
      sendErrorResponse(client, "Érvénytelen nap index");
      return;
    }

    // JSON válasz összeállítása
    String jsonResponse = "{\"schedules\":[";

    for (int i = 0; i < scheduleCount[dayIndex]; i++) {
      if (i > 0) jsonResponse += ",";

      ScheduleEntry& schedule = schedules[dayIndex][i];

      jsonResponse += "{";
      jsonResponse += "\"id\":" + String(schedule.id) + ",";
      jsonResponse += "\"hour\":" + String(schedule.hour) + ",";
      jsonResponse += "\"minute\":" + String(schedule.minute) + ",";
      jsonResponse += "\"enabled\":" + String(schedule.enabled ? "true" : "false") + ",";
      jsonResponse += "\"strips\":[";

      for (int j = 0; j < 3; j++) {
        if (j > 0) jsonResponse += ",";
        jsonResponse += "{";
        jsonResponse += "\"id\":" + String(schedule.strips[j].id) + ",";
        jsonResponse += "\"enabled\":" + String(schedule.strips[j].enabled ? "true" : "false") + ",";
        jsonResponse += "\"brightness\":" + String(schedule.strips[j].brightness) + ",";
        jsonResponse += "\"effect\":" + String(schedule.strips[j].effect) + ",";
        jsonResponse += "\"color\":[" + String(schedule.strips[j].color[0]) + "," + String(schedule.strips[j].color[1]) + "," + String(schedule.strips[j].color[2]) + "]";
        jsonResponse += "}";
      }

      jsonResponse += "]";
      jsonResponse += "}";
    }

    jsonResponse += "]}";

    sendJsonResponse(client, jsonResponse);
  } else if (url == "/api/schedule/files") {
    // Meglévő fájlok listázása
    String response = "{\"files\":[";
    bool first = true;

    for (int day = 0; day < 7; day++) {
      for (int ledIndex = 0; ledIndex < 3; ledIndex++) {
        char filename[12];
        sprintf(filename, "/S%dL%d.JS", day, ledIndex + 1);

        if (SD.exists(filename)) {
          if (!first) response += ",";
          first = false;

          File file = SD.open(filename, FILE_READ);
          response += "{\"name\":\"" + String(filename) + "\",\"size\":" + String(file.size()) + ",\"day\":" + String(day) + ",\"led\":" + String(ledIndex + 1) + "}";
          file.close();
        }
      }
    }

    response += "]}";
    sendJsonResponse(client, response);
  } else if (url == "/api/schedule/reload") {
    // Ütemezések újrabetöltése
    loadSchedules();
    sendJsonResponse(client, "{\"success\":true,\"message\":\"Ütemezések újrabetöltve\"}");
  }
  // ÚJ API ENDPOINT: Alapértelmezett ütemezések generálása
  else if (url == "/api/schedule/generate") {
    DEBUG_PRINTLN("📅 Alapértelmezett ütemezések generálása API hívás...");

    if (!systemStatus.sdCardPresent) {
      sendErrorResponse(client, "SD kártya nem elérhető");
      return;
    }

    // Meglévő fájlok törlése
    for (int day = 0; day < 7; day++) {
      for (int ledIndex = 0; ledIndex < 3; ledIndex++) {
        char filename[12];
        sprintf(filename, "/S%dL%d.JS", day, ledIndex + 1);
        if (SD.exists(filename)) {
          SD.remove(filename);
          DEBUG_PRINT("Törölve: ");
          DEBUG_PRINTLN(filename);
        }
      }
    }

    // Új alapértelmezett ütemezések generálása
    createDefaultSchedules();

    // Ütemezések újrabetöltése a memóriába
    loadSchedules();

    sendJsonResponse(client, "{\"success\":true,\"message\":\"Alapértelmezett ütemezések generálva és betöltve\"}");

    DEBUG_PRINTLN("✅ Alapértelmezett ütemezések sikeresen generálva!");
  }
  // ÚJ API ENDPOINT: Összes ütemezési fájl törlése
  else if (url == "/api/schedule/clear") {
    DEBUG_PRINTLN("🗑️ Összes ütemezési fájl törlése...");

    if (!systemStatus.sdCardPresent) {
      sendErrorResponse(client, "SD kártya nem elérhető");
      return;
    }

    int deletedCount = 0;

    // Összes ütemezési fájl törlése
    for (int day = 0; day < 7; day++) {
      for (int ledIndex = 0; ledIndex < 3; ledIndex++) {
        char filename[12];
        sprintf(filename, "/S%dL%d.JS", day, ledIndex + 1);
        if (SD.exists(filename)) {
          SD.remove(filename);
          deletedCount++;
          DEBUG_PRINT("Törölve: ");
          DEBUG_PRINTLN(filename);
        }
      }
    }

    // Memóriában lévő ütemezések törlése
    for (int day = 0; day < 7; day++) {
      scheduleCount[day] = 0;
    }

    String response = "{\"success\":true,\"message\":\"" + String(deletedCount) + " ütemezési fájl törölve\",\"deletedCount\":" + String(deletedCount) + "}";
    sendJsonResponse(client, response);

    DEBUG_PRINT("✅ ");
    DEBUG_PRINT(deletedCount);
    DEBUG_PRINTLN(" ütemezési fájl törölve!");
  }
  // ÚJ API ENDPOINT: Ütemezések státusza
  else if (url == "/api/schedule/status") {
    String response = "{";
    response += "\"totalDays\":7,";
    response += "\"daysWithSchedules\":0,";
    response += "\"totalSchedules\":0,";
    response += "\"schedulesByDay\":[";

    int totalSchedules = 0;
    int daysWithSchedules = 0;

    for (int day = 0; day < 7; day++) {
      if (day > 0) response += ",";
      response += "{";
      response += "\"day\":" + String(day) + ",";
      response += "\"dayName\":\"" + String(getDayName(day)) + "\",";
      response += "\"count\":" + String(scheduleCount[day]);
      response += "}";

      totalSchedules += scheduleCount[day];
      if (scheduleCount[day] > 0) daysWithSchedules++;
    }

    response += "],";
    response += "\"totalSchedules\":" + String(totalSchedules) + ",";
    response += "\"daysWithSchedules\":" + String(daysWithSchedules) + ",";
    response += "\"sdCardPresent\":" + String(systemStatus.sdCardPresent ? "true" : "false");
    response += "}";

    sendJsonResponse(client, response);
  } else {
    sendErrorResponse(client, "Ismeretlen ütemezés API");
  }
}

void handleStaticRequest(WiFiClient& client, String url) {
  if (url == "/" || url == "/index.html") {
    url = "/index.html";
  }

  if (!systemStatus.sdCardPresent || !SD.exists(url.c_str())) {
    client.println("HTTP/1.1 404 Not Found");
    client.println("Content-Type: text/html");
    client.println("Connection: close");
    client.println();
    client.println("<html><body><h1>404 - Oldal nem talalhato</h1></body></html>");
    return;
  }

  File file = SD.open(url.c_str(), FILE_READ);
  if (!file) {
    client.println("HTTP/1.1 500 Internal Server Error");
    client.println("Connection: close");
    client.println();
    return;
  }

  String contentType = "text/plain";
  if (url.endsWith(".html") || url.endsWith(".htm")) contentType = "text/html";
  else if (url.endsWith(".css")) contentType = "text/css";
  else if (url.endsWith(".js")) contentType = "application/javascript";
  else if (url.endsWith(".json")) contentType = "application/json";

  client.println("HTTP/1.1 200 OK");
  client.print("Content-Type: ");
  client.println(contentType);
  client.println("Access-Control-Allow-Origin: *");
  client.println("Connection: close");
  client.println();

  // Fájl tartalmának küldése
  while (file.available()) {
    client.write(file.read());
  }

  file.close();
}

void handleScheduleApiComplete(WiFiClient& client, String url) {
  if (url == "/api/schedule/files") {
    // Meglévő fájlok listázása
    String response = "{\"files\":[";
    bool first = true;

    for (int day = 0; day < 7; day++) {
      for (int ledIndex = 0; ledIndex < 3; ledIndex++) {
        char filename[12];
        sprintf(filename, "/S%dL%d.JS", day, ledIndex + 1);

        if (SD.exists(filename)) {
          if (!first) response += ",";
          first = false;

          File file = SD.open(filename, FILE_READ);
          response += "{\"name\":\"" + String(filename) + "\",\"size\":" + String(file.size()) + ",\"day\":" + String(day) + ",\"led\":" + String(ledIndex + 1) + "}";
          file.close();
        }
      }
    }

    response += "]}";
    sendJsonResponse(client, response);
  } else if (url == "/api/schedule/reload") {
    // Ütemezések újrabetöltése
    loadSchedules();
    sendJsonResponse(client, "{\"success\":true,\"message\":\"Ütemezések újrabetöltve\"}");
  } else if (url.startsWith("/api/schedule/file/")) {
    // Konkrét fájl tartalmának lekérése
    String filename = url.substring(19);  // "/api/schedule/file/" után

    if (SD.exists("/" + filename)) {
      File file = SD.open("/" + filename, FILE_READ);
      String content = "";
      while (file.available()) {
        content += (char)file.read();
      }
      file.close();

      client.println("HTTP/1.1 200 OK");
      client.println("Content-Type: application/json");
      client.println("Access-Control-Allow-Origin: *");
      client.println("Connection: close");
      client.print("Content-Length: ");
      client.println(content.length());
      client.println();
      client.println(content);
    } else {
      sendErrorResponse(client, "Fájl nem található");
    }
  } else if (url.startsWith("/api/schedule/test/")) {
    // HIÁNYZÓ API ENDPOINT JAVÍTÁSA
    // URL formátum: /api/schedule/test/14:30
    int timeStart = url.indexOf("/test/") + 6;
    String timeStr = url.substring(timeStart);

    int colonPos = timeStr.indexOf(':');
    if (colonPos > 0) {
      int testHour = timeStr.substring(0, colonPos).toInt();
      int testMinute = timeStr.substring(colonPos + 1).toInt();

      if (testHour >= 0 && testHour < 24 && testMinute >= 0 && testMinute < 60) {
        DEBUG_PRINTLN("=== MANUÁLIS ÜTEMEZÉS TESZT API ===");
        DEBUG_PRINT("Teszt idő: ");
        if (testHour < 10) DEBUG_PRINT("0");
        DEBUG_PRINT(testHour);
        DEBUG_PRINT(":");
        if (testMinute < 10) DEBUG_PRINT("0");
        DEBUG_PRINTLN(testMinute);

        // Ideiglenes idő beállítása
        int originalHour = systemTime.hour;
        int originalMinute = systemTime.minute;

        systemTime.hour = testHour;
        systemTime.minute = testMinute;

        // Ütemezés ellenőrzése és végrehajtása
        handleSchedules();

        // Eredeti idő visszaállítása
        systemTime.hour = originalHour;
        systemTime.minute = originalMinute;

        DEBUG_PRINTLN("===============================");

        sendJsonResponse(client, "{\"success\":true,\"message\":\"Teszt végrehajtva " + timeStr + " időpontra\",\"testTime\":\"" + timeStr + "\"}");
      } else {
        sendErrorResponse(client, "Érvénytelen időformátum (0-23:0-59)");
      }
    } else {
      sendErrorResponse(client, "Időformátum: HH:MM (pl. 14:30)");
    }
  } else if (url == "/api/schedule/debug") {
    // Debug információk
    String response = "{\"debug\":true,\"currentTime\":\"";
    if (systemTime.hour < 10) response += "0";
    response += String(systemTime.hour) + ":";
    if (systemTime.minute < 10) response += "0";
    response += String(systemTime.minute) + "\",\"schedules\":[";

    for (int day = 0; day < 7; day++) {
      if (day > 0) response += ",";
      response += "{\"day\":" + String(day) + ",\"count\":" + String(scheduleCount[day]) + ",\"items\":[";

      for (int i = 0; i < scheduleCount[day]; i++) {
        if (i > 0) response += ",";
        ScheduleEntry& schedule = schedules[day][i];
        response += "{";
        response += "\"id\":" + String(schedule.id) + ",";
        response += "\"hour\":" + String(schedule.hour) + ",";
        response += "\"minute\":" + String(schedule.minute) + ",";
        response += "\"enabled\":" + String(schedule.enabled ? "true" : "false");
        response += "}";
      }
      response += "]}";
    }
    response += "]}";

    sendJsonResponse(client, response);
  } else {
    sendErrorResponse(client, "Ismeretlen ütemezés API");
  }
}

void handleConfigApi(WiFiClient& client, String url) {
  if (url == "/api/config") {
    // Konfiguráció lekérése
    StaticJsonDocument<1024> doc;

    // WiFi konfiguráció
    JsonObject wifi = doc.createNestedObject("wifi");
    wifi["ssid"] = wifiConfig.ssid;
    wifi["hostname"] = wifiConfig.hostname;
    // Jelszót biztonsági okokból nem küldjük vissza

    // LED konfiguráció
    JsonArray ledArray = doc.createNestedArray("ledStrips");
    for (int i = 0; i < ledStripCount; i++) {
      JsonObject led = ledArray.createNestedObject();
      led["id"] = ledConfig[i].id;
      led["enabled"] = ledConfig[i].enabled;
      led["pin"] = ledConfig[i].pin;
      led["ledCount"] = ledConfig[i].ledCount;
    }

    // PIR konfiguráció
    JsonArray pirArray = doc.createNestedArray("pirSensors");
    for (int i = 0; i < pirSensorCount; i++) {
      JsonObject pir = pirArray.createNestedObject();
      pir["id"] = pirConfig[i].id;
      pir["enabled"] = pirConfig[i].enabled;
      pir["pin"] = pirConfig[i].pin;
      pir["ledStripId"] = pirConfig[i].ledStripId;
    }

    // Rendszer beállítások
    JsonObject settings = doc.createNestedObject("settings");
    settings["motionTimeout"] = systemConfig.motionTimeout;
    settings["maxBrightness"] = systemConfig.maxBrightness;
    settings["defaultBrightness"] = systemConfig.defaultBrightness;

    String response;
    serializeJson(doc, response);
    sendJsonResponse(client, response);
  } else {
    sendErrorResponse(client, "Ismeretlen konfiguráció API");
  }
}

void sendJsonResponse(WiFiClient& client, const String& json) {
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Access-Control-Allow-Origin: *");
  client.println("Connection: close");
  client.print("Content-Length: ");
  client.println(json.length());
  client.println();
  client.println(json);
}

void sendErrorResponse(WiFiClient& client, const String& message) {
  String json = "{\"success\":false,\"error\":\"" + message + "\"}";

  client.println("HTTP/1.1 400 Bad Request");
  client.println("Content-Type: application/json");
  client.println("Access-Control-Allow-Origin: *");
  client.println("Connection: close");
  client.print("Content-Length: ");
  client.println(json.length());
  client.println();
  client.println(json);
}

// ================ SEGÉD FÜGGVÉNYEK ================

String createStatusJson() {
  StaticJsonDocument<1024> doc;

  doc["connected"] = systemStatus.wifiConnected;
  doc["timesynced"] = systemTime.isSynced;
  doc["sdCard"] = systemStatus.sdCardPresent;
  doc["uptime"] = millis() / 1000;

  // Aktuális idő
  JsonObject datetime = doc.createNestedObject("datetime");
  datetime["year"] = systemTime.year;
  datetime["month"] = systemTime.month;
  datetime["day"] = systemTime.day;
  datetime["hour"] = systemTime.hour;
  datetime["minute"] = systemTime.minute;
  datetime["second"] = systemTime.second;

  // LED szalagok állapota
  JsonArray strips = doc.createNestedArray("strips");
  for (int i = 0; i < 3 && i < ledStripCount; i++) {
    JsonObject strip = strips.createNestedObject();
    strip["id"] = i + 1;
    strip["enabled"] = ledStrips[i].enabled;
    strip["brightness"] = ledStrips[i].brightness;
    strip["effect"] = ledStrips[i].effect;

    JsonArray color = strip.createNestedArray("color");
    color.add(ledStrips[i].color[0]);
    color.add(ledStrips[i].color[1]);
    color.add(ledStrips[i].color[2]);
  }

  String result;
  serializeJson(doc, result);
  return result;
}

String createMemoryJson() {
  // Pontos memória mérés
  extern char _end;
  char* heapend = (char*)malloc(4);
  if (heapend) free(heapend);
  register char* stack_ptr asm("sp");

  char* ramstart = (char*)0x20000000;
  char* ramend = (char*)0x20008000;

  int totalRam = ramend - ramstart;
  int stackUsed = ramend - stack_ptr;
  int freeRam = stack_ptr - heapend;

  struct mallinfo mi = mallinfo();

  StaticJsonDocument<512> doc;
  doc["totalRam"] = totalRam;
  doc["heapUsed"] = mi.uordblks;
  doc["heapFree"] = mi.fordblks;
  doc["stackUsed"] = stackUsed;
  doc["freeRam"] = freeRam;
  doc["fragmentation"] = mi.fsmblks;
  doc["usagePercent"] = ((totalRam - freeRam) * 100) / totalRam;

  // Memória állapot
  if (freeRam < 2048) {
    doc["status"] = "critical";
    doc["message"] = "Kritikus memória szint";
  } else if (freeRam < 4096) {
    doc["status"] = "warning";
    doc["message"] = "Alacsony memória szint";
  } else {
    doc["status"] = "ok";
    doc["message"] = "Normális memória használat";
  }

  String result;
  serializeJson(doc, result);
  return result;
}

String urlDecode(const String& input) {
  String output = "";
  for (int i = 0; i < input.length(); i++) {
    if (input[i] == '%' && i + 2 < input.length()) {
      String hex = input.substring(i + 1, i + 3);
      char c = strtol(hex.c_str(), NULL, 16);
      output += c;
      i += 2;
    } else if (input[i] == '+') {
      output += ' ';
    } else {
      output += input[i];
    }
  }
  return output;
}

void printMemoryInfo() {
  // Arduino UNO R4 WiFi pontos memória mérés
  // Renesas RA4M1 ARM Cortex-M4 processzor

  // Stack pointer és heap pointer lekérése
  extern char _end;                  // Heap kezdete (linker által definiált)
  extern char _sdata;                // SRAM kezdete
  extern char _stack;                // Stack kezdete
  char* heapend = (char*)malloc(4);  // Jelenlegi heap vége
  if (heapend) free(heapend);        // Felszabadítjuk a teszt allokációt

  // Stack pointer aktuális pozíciója (ARM specifikus)
  register char* stack_ptr asm("sp");

  // Arduino UNO R4 WiFi memória layout
  // SRAM: 0x20000000 - 0x20008000 (32KB)
  char* ramstart = (char*)0x20000000;
  char* ramend = (char*)0x20008000;

  // Heap és stack közötti szabad terület
  int totalRam = ramend - ramstart;
  int heapUsed = heapend - &_end;
  int stackUsed = ramend - stack_ptr;
  int freeRam = stack_ptr - heapend;

  // Malloc információk
  struct mallinfo mi = mallinfo();

  DEBUG_PRINTLN("=== PONTOS MEMÓRIA JELENTÉS ===");
  DEBUG_PRINT("Teljes SRAM: ");
  DEBUG_PRINT(totalRam);
  DEBUG_PRINTLN(" byte");
  DEBUG_PRINT("Heap használva: ");
  DEBUG_PRINT(mi.uordblks);
  DEBUG_PRINTLN(" byte");
  DEBUG_PRINT("Heap szabad: ");
  DEBUG_PRINT(mi.fordblks);
  DEBUG_PRINTLN(" byte");
  DEBUG_PRINT("Stack használva: ");
  DEBUG_PRINT(stackUsed);
  DEBUG_PRINTLN(" byte");
  DEBUG_PRINT("Szabad RAM: ");
  DEBUG_PRINT(freeRam);
  DEBUG_PRINTLN(" byte");
  DEBUG_PRINT("Heap fragmentáció: ");
  DEBUG_PRINT(mi.fsmblks);
  DEBUG_PRINTLN(" blokk");

  // Memória használat százalékban
  int usedPercent = ((totalRam - freeRam) * 100) / totalRam;
  DEBUG_PRINT("Memória használat: ");
  DEBUG_PRINT(usedPercent);
  DEBUG_PRINTLN("%");

  // Figyelmeztetések
  if (freeRam < 2048) {
    DEBUG_PRINTLN("⚠️ KRITIKUS: Kevés a szabad memória!");
  } else if (freeRam < 4096) {
    DEBUG_PRINTLN("⚠️ FIGYELEM: Alacsony memória szint!");
  } else {
    DEBUG_PRINTLN("✅ Memória használat normális");
  }

  // Heap részletek
  DEBUG_PRINT("Max heap méret: ");
  DEBUG_PRINT(mi.arena);
  DEBUG_PRINTLN(" byte");

  // JAVÍTOTT RÉSZ: HEX formátum külön kezelése
  DEBUG_PRINT("Heap teteje: 0x");
  DEBUG_PRINTLN(String((uintptr_t)heapend, HEX));

  DEBUG_PRINT("Stack teteje: 0x");
  DEBUG_PRINTLN(String((uintptr_t)stack_ptr, HEX));

  DEBUG_PRINTLN("==============================");
}

void handleConsoleAPI(WiFiClient& client, arduino::String data) {
  int logCount = 0;  
  int logIndex = 0;  
  
  // Az 'url' helyett a függvénynek átadott 'data' változót használjuk
  if (data == "/api/console/logs") {
    String logs = getRecentLogs();
    sendJsonResponse(client, logs);
  } 
  else if (data == "/api/console/stats") {
    String stats = createConsoleStatsJson();
    sendJsonResponse(client, stats);
  }
  else if (data == "/api/console/clear") {
    logCount = 0;
    logIndex = 0;
    sendJsonResponse(client, "{\"success\":true,\"message\":\"Console cleared\"}");
  }
  else {
    sendErrorResponse(client, "Unknown console API endpoint");
  }
}


// ================ CONSOLE LOG RENDSZER ================

// Console WebSocket szerver
WiFiServer consoleServer(81);
String recentLogs[100];
int logIndex = 0;
int logCount = 0;
unsigned long lastLogTime = 0;

// ================ BASIC LOG FUNCTIONS ================

void addToLogBuffer(String message, String type = "info") {
#if !ENABLE_CONSOLE_LOG_BUFFER
  (void)message;
  (void)type;
  return;
#else
  String timestamp = "";
  
  // Egyszerű timestamp millis() alapján
  unsigned long uptime = millis() / 1000;
  int hours = uptime / 3600;
  int minutes = (uptime % 3600) / 60;
  int seconds = uptime % 60;
  timestamp = "[" + String(hours < 10 ? "0" : "") + String(hours) + 
              ":" + String(minutes < 10 ? "0" : "") + String(minutes) + 
              ":" + String(seconds < 10 ? "0" : "") + String(seconds) + "] ";
  
  String logEntry = "{\"timestamp\":\"" + timestamp + "\",\"type\":\"" + type + "\",\"message\":\"" + message + "\"}";
  
  recentLogs[logIndex] = logEntry;
  logIndex = (logIndex + 1) % 100;
  if (logCount < 100) logCount++;
  
  lastLogTime = millis();
#endif
}

String getRecentLogs() {
  String result = "[";
  
  for (int i = 0; i < logCount; i++) {
    int idx = (logIndex - logCount + i + 100) % 100;
    if (i > 0) result += ",";
    result += recentLogs[idx];
  }
  
  result += "]";
  return result;
}

// Enhanced debug macros - extern deklarációk nélkül
void debugPrintln(String message) {
  Serial.println(message);
  addToLogBuffer(message, "info");
}

void debugPrint(String message) {
  Serial.print(message);
}

void logError(String message) {
  Serial.println("[ERROR] " + message);
  addToLogBuffer(message, "error");
}

void logWarning(String message) {
  Serial.println("[WARNING] " + message);
  addToLogBuffer(message, "warn");
}

void logSuccess(String message) {
  Serial.println("[SUCCESS] " + message);
  addToLogBuffer(message, "success");
}

void logInfo(String message) {
  Serial.println("[INFO] " + message);
  addToLogBuffer(message, "info");
}

// ================ WEBSOCKET FUNCTIONS ================

void setupConsoleWebSocket() {
#if ENABLE_CONSOLE_LOG_BUFFER
  consoleServer.begin();
  debugPrintln("Console WebSocket server started on port 81");
  addToLogBuffer("Console WebSocket server started on port 81", "success");
#endif
}

void sendWebSocketMessage(WiFiClient& client, String message) {
  // Egyszerű WebSocket frame küldés
  client.write(0x81); // Text frame
  
  if (message.length() < 126) {
    client.write(message.length());
  } else {
    client.write(126);
    client.write((message.length() >> 8) & 0xFF);
    client.write(message.length() & 0xFF);
  }
  
  client.print(message);
}

void handleWebSocketConsole(WiFiClient& client) {
  if (client.connected()) {
    String request = client.readStringUntil('\n');
    request.trim();
    
    // Egyszerű WebSocket handshake
    if (request.indexOf("Upgrade: websocket") != -1) {
      // WebSocket handshake válasz
      client.println("HTTP/1.1 101 Switching Protocols");
      client.println("Upgrade: websocket");
      client.println("Connection: Upgrade");
      client.println("Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
      client.println();
      
      // Küldj kezdeti adatokat
      sendWebSocketMessage(client, "{\"type\":\"connected\",\"message\":\"Console connected to Arduino\"}");
      
      // Küldj néhány log üzenetet
      String logs = getRecentLogs();
      sendWebSocketMessage(client, "{\"type\":\"logs\",\"data\":" + logs + "}");
      
      logSuccess("WebSocket console client connected");
    }
  }
  
  client.stop();
}

void handleConsoleClients() {
#if ENABLE_CONSOLE_LOG_BUFFER
  WiFiClient client = consoleServer.available();
  if (client) {
    handleWebSocketConsole(client);
  }
#endif
}

// ================ CONSOLE API ================

// Ez a függvény a fő fájlban lesz implementálva, mert ott vannak a külső függvények
void handleConsoleAPI(WiFiClient& client, String url);

// Egyszerűsített stats JSON - extern változók nélkül
String createConsoleStatsJson() {
  StaticJsonDocument<512> doc;
  
  doc["logCount"] = logCount;
  doc["lastLogTime"] = lastLogTime;
  doc["uptime"] = millis() / 1000;
  
  // Arduino UNO R4 WiFi memória mérés
  extern char _end;
  char* heapend = (char*)malloc(4);
  if (heapend) free(heapend);
  register char* stack_ptr asm("sp");
  int freeRam = stack_ptr - heapend;
  
  doc["freeMemory"] = freeRam;
  doc["wifiSignal"] = WiFi.RSSI();
  doc["connectedClients"] = 1;
  
  // Alapvető rendszer info
  doc["system"]["wifiConnected"] = (WiFi.status() == WL_CONNECTED);
  doc["system"]["consoleActive"] = true;
  
  String result;
  serializeJson(doc, result);
  return result;
}

// ================ UTILITY FUNCTIONS ================

void broadcastSystemEvent(String event, String type = "info") {
  addToLogBuffer(event, type);
}

void logWiFiSuccess() {
  String message = "WiFi connected: " + WiFi.localIP().toString();
  logSuccess(message);
  broadcastSystemEvent(message, "success");
}

void logNTPSuccess() {
  String message = "NTP time synchronized successfully";
  logSuccess(message);
  broadcastSystemEvent(message, "success");
}

void logLEDChange(int ledId, bool enabled, int brightness) {
  String message = "LED " + String(ledId) + " " + (enabled ? "ON" : "OFF") + 
                   " (brightness: " + String(brightness) + ")";
  logInfo(message);
  broadcastSystemEvent(message, "info");
}

void logScheduleActivation(int hour, int minute) {
  String message = "Schedule activated: " + String(hour) + ":" + 
                   (minute < 10 ? "0" : "") + String(minute);
  logSuccess(message);
  broadcastSystemEvent(message, "success");
}

void logPIRTrigger(int pirId, int ledId) {
  String message = "PIR " + String(pirId) + " triggered, LED " + String(ledId) + " activated";
  logInfo(message);
  broadcastSystemEvent(message, "info");
}

void logMemoryWarning() {
  extern char _end;
  char* heapend = (char*)malloc(4);
  if (heapend) free(heapend);
  register char* stack_ptr asm("sp");
  
  int freeRam = stack_ptr - heapend;
  
  if (freeRam < 2048) {
    String message = "CRITICAL: Low memory: " + String(freeRam) + " bytes free";
    logError(message);
    broadcastSystemEvent(message, "error");
  } else if (freeRam < 4096) {
    String message = "WARNING: Low memory: " + String(freeRam) + " bytes free";
    logWarning(message);
    broadcastSystemEvent(message, "warn");
  }
}

void logPerformanceStats() {
  static unsigned long lastLoopTime = 0;
  static unsigned long maxLoopTime = 0;
  
  unsigned long currentTime = millis();
  
  if (lastLoopTime > 0) {
    unsigned long loopDuration = currentTime - lastLoopTime;
    if (loopDuration > maxLoopTime) {
      maxLoopTime = loopDuration;
    }
    
    if (loopDuration > 100) { // Ha egy loop több mint 100ms
      String message = "PERFORMANCE: Slow loop detected: " + String(loopDuration) + "ms";
      logWarning(message);
      broadcastSystemEvent(message, "warn");
    }
  }
  
  lastLoopTime = currentTime;
}

void printStartupBanner() {
  debugPrintln("");
  debugPrintln("===============================");
  debugPrintln("Arduino LED Vezérlő - v2.0");
  debugPrintln("Enhanced Console Integration");
  debugPrintln("===============================");
  debugPrintln("");
  
  logSuccess("System starting up...");
  logInfo("Console integration active");
  logInfo("WebSocket server will start on port 81");
}
