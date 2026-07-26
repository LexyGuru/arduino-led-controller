/*
 * Arduino LED Controller Lite 3.1
 * UNO R4 WiFi: LED, PIR, helyi API, OTA. SD kartya es Arduino-oldali
 * utemezes nincs: az utemezeseket a Proxmox webszerver kezeli.
 *
 * Elso feltoltes USB-n. A firmware ezutan OTA-frissitest fogad a halozaton.
 */
#include <WiFiS3.h>
#include <Adafruit_NeoPixel.h>
#include <ArduinoOTA.h>
#include <EEPROM.h>
#include <Arduino_LED_Matrix.h>
#include <time.h>
#include <stdarg.h>
#include "secrets.h"

#define FIRMWARE_VERSION "4.1.12"
#define DEVICE_NAME "arduino-led-controller"
#ifndef API_SHARED_SECRET
#define API_SHARED_SECRET "CHANGE_THIS_TO_A_LONG_RANDOM_API_SECRET"
#endif
#ifndef API_PRIVATE_PATH
#define API_PRIVATE_PATH "/CHANGE_THIS_TO_A_LONG_RANDOM_API_PATH"
#endif
#ifndef ENABLE_PIR_SENSORS
#define ENABLE_PIR_SENSORS 0
#endif
#ifndef ENABLE_PHYSICAL_BUTTONS
#define ENABLE_PHYSICAL_BUTTONS 0
#endif
constexpr uint16_t HTTP_API_PORT = 80;
constexpr uint16_t OTA_UPLOAD_PORT = 65280;
constexpr uint16_t MDNS_PORT = 5353;
constexpr uint8_t STRIP_COUNT = 3;
constexpr uint16_t PIXELS = 300;
constexpr uint8_t LED_PINS[STRIP_COUNT] = {6, 7, 8};
constexpr uint8_t PIR_PINS[STRIP_COUNT] = {2, 3, 4};
constexpr uint8_t BUTTON_MODE = A0, BUTTON_UP = A1, BUTTON_DOWN = A2;
constexpr unsigned long PIR_TIMEOUT = 60000, PIR_DEBOUNCE = 200, WIFI_RETRY = 15000, EFFECT_FRAME = 50, SCHEDULE_AUDIT_INTERVAL = 30000;
constexpr uint32_t NETWORK_SETTINGS_MAGIC = 0x4C454431UL; // "LED1"
constexpr uint16_t NETWORK_SETTINGS_VERSION = 1;
constexpr uint16_t SCHEDULE_EEPROM_OFFSET = 256;
constexpr uint8_t SCHEDULE_MAX = 60;
// A WiFi/OTA adatoktól és az időzítésektől elkülönítve tároljuk. Így a
// nyilvános GitHub firmware-frissítés nem írja felül az USB-n megadott titkot.
constexpr uint16_t API_SETTINGS_EEPROM_OFFSET = 2300;
constexpr uint32_t API_SETTINGS_MAGIC = 0x41504931UL; // "API1"
constexpr uint16_t API_SETTINGS_VERSION = 1;
// A WiFiS3 modul több rövid TCP-kapcsolatot tud várakoztatni, de a főprogram
// csak sorban dolgozhatja fel őket. Egy körben ennyit ürítünk ki a várakozó
// sorból, hogy a Proxmox és az asztali alkalmazás ne akadályozza egymást.
constexpr uint8_t HTTP_CLIENTS_PER_LOOP = 1;
constexpr uint8_t CONSOLE_LOGS_PER_RESPONSE = 4;
constexpr uint8_t LOG_CAPACITY = 32;
constexpr size_t HTTP_BODY_BUFFER_SIZE = 2304;
constexpr size_t HTTP_WRITE_CHUNK_SIZE = 512;
constexpr unsigned long HTTP_FIRST_BYTE_TIMEOUT = 180;
constexpr unsigned long HTTP_READ_TIMEOUT = 220;
constexpr uint32_t SCHEDULE_MAGIC = 0x53434831UL; // "SCH1"
enum Effect : uint8_t { STATIC = 0, BLINK, BREATHE, RAINBOW, CHASE };

struct Led { bool enabled; uint8_t brightness, effect, speed, red, green, blue; };
struct Log { uint32_t id; unsigned long timestamp; const char* type; char message[128]; };
struct NetworkSettings {
  uint32_t magic;
  uint16_t version;
  char ssid[33];
  char password[65];
  char otaPassword[65];
  uint32_t checksum;
};
struct ApiSettings {
  uint32_t magic;
  uint16_t version;
  char privatePath[49];
  char sharedSecret[65];
  uint32_t checksum;
};
struct __attribute__((packed)) StoredLed { uint8_t apply, enabled, brightness, effect, speed, red, green, blue; };
struct __attribute__((packed)) StoredSchedule { uint8_t day, hour, minute; StoredLed leds[STRIP_COUNT]; };
struct __attribute__((packed)) ScheduleHeader { uint32_t magic; uint8_t version, count; uint32_t checksum; };

// FONTOS: ezt a tipust a fajl elejen kell deklaralni. Az Arduino IDE az .ino
// fajlokhoz automatikusan fuggvenyprototipusokat general. Ha a tipus csak a
// fajl kozepen szerepel, a generalt prototipusok megelőzik a deklaraciojat,
// es a forditas "FixedBuffer was not declared" hibaval leall.
struct FixedBuffer {
  char* data;
  size_t capacity;
  size_t length;
  bool valid;
};

// Kezi prototipusok: megakadalyozzak, hogy az Arduino elofeldolgozo hibas
// sorrendben generalja le ezeket a FixedBuffer tipust hasznalo deklaraciokat.
void resetBuffer(FixedBuffer& buffer, char* storage, size_t capacity);
bool appendRaw(FixedBuffer& buffer, const char* value);
bool appendChar(FixedBuffer& buffer, char value);
bool appendFormat(FixedBuffer& buffer, const char* format, ...);
bool appendJsonEscaped(FixedBuffer& buffer, const char* source);
Adafruit_NeoPixel strip[STRIP_COUNT] = {
  Adafruit_NeoPixel(PIXELS, LED_PINS[0], NEO_GRB + NEO_KHZ800),
  Adafruit_NeoPixel(PIXELS, LED_PINS[1], NEO_GRB + NEO_KHZ800),
  Adafruit_NeoPixel(PIXELS, LED_PINS[2], NEO_GRB + NEO_KHZ800)
};
ArduinoLEDMatrix matrix;
uint8_t MATRIX_BOOT[8][12] = {
  {0,0,0,0,1,1,1,1,0,0,0,0},{0,0,0,1,0,0,0,0,1,0,0,0},{0,0,1,0,1,0,0,1,0,1,0,0},{0,1,0,0,0,1,1,0,0,0,1,0},
  {0,1,0,0,0,1,1,0,0,0,1,0},{0,0,1,0,1,0,0,1,0,1,0,0},{0,0,0,1,0,0,0,0,1,0,0,0},{0,0,0,0,1,1,1,1,0,0,0,0}
};
uint8_t MATRIX_WIFI[8][12] = {
  {0,0,0,0,0,1,1,0,0,0,0,0},{0,0,0,1,1,0,0,1,1,0,0,0},{0,0,1,0,0,0,0,0,0,1,0,0},{0,1,0,0,1,1,1,1,0,0,1,0},
  {1,0,0,1,0,0,0,0,1,0,0,1},{0,0,0,0,0,1,1,0,0,0,0,0},{0,0,0,0,1,0,0,1,0,0,0,0},{0,0,0,0,0,1,1,0,0,0,0,0}
};
uint8_t MATRIX_OK[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},{0,0,0,0,0,0,0,0,0,0,1,0},{0,0,0,0,0,0,0,0,0,1,0,0},{0,0,0,0,0,0,0,0,1,0,0,0},
  {1,0,0,0,0,0,0,1,0,0,0,0},{0,1,0,0,0,0,1,0,0,0,0,0},{0,0,1,0,0,1,0,0,0,0,0,0},{0,0,0,1,1,0,0,0,0,0,0,0}
};
uint8_t MATRIX_OTA[8][12] = {
  {0,0,0,0,0,1,1,0,0,0,0,0},{0,0,0,0,1,1,1,1,0,0,0,0},{0,0,0,1,1,0,0,1,1,0,0,0},{0,0,1,1,1,0,0,1,1,1,0,0},
  {0,0,0,0,1,1,1,1,0,0,0,0},{0,0,0,0,0,1,1,0,0,0,0,0},{0,0,0,0,0,1,1,0,0,0,0,0},{0,0,0,0,0,1,1,0,0,0,0,0}
};
uint8_t MATRIX_ERROR[8][12] = {
  {1,0,0,0,0,0,0,0,0,0,0,1},{0,1,0,0,0,0,0,0,0,0,1,0},{0,0,1,0,0,0,0,0,0,1,0,0},{0,0,0,1,0,0,0,0,1,0,0,0},
  {0,0,0,0,1,0,0,1,0,0,0,0},{0,0,0,0,1,0,0,1,0,0,0,0},{0,0,0,1,0,0,0,0,1,0,0,0},{0,0,1,0,0,0,0,0,0,1,0,0}
};
WiFiServer server(HTTP_API_PORT);
Led leds[STRIP_COUNT]; Log logs[LOG_CAPACITY];
bool pirRaw[STRIP_COUNT] = {}, pirActive[STRIP_COUNT] = {}, otaReady = false, timeSynced = false, wifiReported = false;
unsigned long pirChanged[STRIP_COUNT] = {}, lastMotion[STRIP_COUNT] = {}, lastWifi = 0, lastFrame = 0, lastTimeCheck = 0;
uint8_t logStart = 0, logSize = 0;
uint32_t nextLogId = 1;
unsigned long httpRequests = 0, httpTimeouts = 0;
unsigned long httpRejected = 0, httpWriteFailures = 0;
uint8_t httpMaxBatch = 0;
char lastHttpClientIp[16] = "-", lastHttpPath[48] = "-";
unsigned long lastHttpClientAt = 0, lastHttpClientLog = 0;
NetworkSettings networkSettings = {};
bool networkSettingsStored = false;
ApiSettings apiSettings = {};
bool apiSettingsStored = false;
StoredSchedule schedules[SCHEDULE_MAX] = {};
uint8_t scheduleCount = 0;
bool schedulesStored = false;
unsigned long lastClockEpoch = 0, lastClockMillis = 0, lastScheduleMinute = 0xFFFFFFFFUL, lastScheduleAudit = 0;
char httpBodyBuffer[HTTP_BODY_BUFFER_SIZE] = {};

void renderAll(bool force = false);

void showMatrix(uint8_t frame[8][12]) { matrix.renderBitmap(frame, 8, 12); }

void storeConsoleLine(const char* type, const char* message, bool includeTypeOnSerial) {
  uint8_t position = (logStart + logSize) % LOG_CAPACITY;
  if (logSize == LOG_CAPACITY) logStart = (logStart + 1) % LOG_CAPACITY; else logSize++;
  logs[position].id = nextLogId++;
  logs[position].timestamp = millis() / 1000;
  logs[position].type = type;
  strncpy(logs[position].message, message, sizeof(logs[position].message) - 1);
  logs[position].message[sizeof(logs[position].message) - 1] = 0;
  if (includeTypeOnSerial) { Serial.print('['); Serial.print(type); Serial.print("] "); }
  Serial.println(message);
}
void logEvent(const char* type, const char* message) { storeConsoleLine(type, message, true); }
void consoleLine(const char* message) { storeConsoleLine("console", message, false); }

uint32_t settingsChecksum(const NetworkSettings& settings) {
  const uint8_t* bytes = reinterpret_cast<const uint8_t*>(&settings);
  uint32_t result = 2166136261UL;
  for (size_t i = 0; i < sizeof(NetworkSettings) - sizeof(settings.checksum); i++) result = (result ^ bytes[i]) * 16777619UL;
  return result;
}
void copyText(char* target, size_t targetSize, const char* source) {
  if (!targetSize) return;
  strncpy(target, source ? source : "", targetSize - 1);
  target[targetSize - 1] = 0;
}
bool isPlaceholder(const char* value) {
  return !value || !value[0] || strcmp(value, "YOUR_WIFI_NAME") == 0 || strcmp(value, "YOUR_WIFI_PASSWORD") == 0 || strcmp(value, "CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD") == 0 || strcmp(value, "CHANGE_THIS_TO_A_LONG_RANDOM_API_SECRET") == 0 || strcmp(value, "/CHANGE_THIS_TO_A_LONG_RANDOM_API_PATH") == 0;
}
bool compiledNetworkSettingsUsable() { return !isPlaceholder(WIFI_SSID) && !isPlaceholder(WIFI_PASSWORD) && !isPlaceholder(OTA_PASSWORD); }
bool settingsValid(const NetworkSettings& settings) {
  return settings.magic == NETWORK_SETTINGS_MAGIC && settings.version == NETWORK_SETTINGS_VERSION && settings.checksum == settingsChecksum(settings) && !isPlaceholder(settings.ssid) && !isPlaceholder(settings.password) && !isPlaceholder(settings.otaPassword);
}
bool compiledSettingsDiffer(const NetworkSettings& settings) {
  return strcmp(settings.ssid, WIFI_SSID) != 0 || strcmp(settings.password, WIFI_PASSWORD) != 0 || strcmp(settings.otaPassword, OTA_PASSWORD) != 0;
}
void saveCompiledNetworkSettings() {
  memset(&networkSettings, 0, sizeof(networkSettings));
  networkSettings.magic = NETWORK_SETTINGS_MAGIC;
  networkSettings.version = NETWORK_SETTINGS_VERSION;
  copyText(networkSettings.ssid, sizeof(networkSettings.ssid), WIFI_SSID);
  copyText(networkSettings.password, sizeof(networkSettings.password), WIFI_PASSWORD);
  copyText(networkSettings.otaPassword, sizeof(networkSettings.otaPassword), OTA_PASSWORD);
  networkSettings.checksum = settingsChecksum(networkSettings);
  EEPROM.put(0, networkSettings);
  networkSettingsStored = true;
}
void loadNetworkSettings() {
  EEPROM.get(0, networkSettings);
  const bool storedIsValid = settingsValid(networkSettings);
  if (compiledNetworkSettingsUsable() && (!storedIsValid || compiledSettingsDiffer(networkSettings))) {
    saveCompiledNetworkSettings();
    logEvent("success", "WiFi es OTA beallitas EEPROM-be mentve");
    return;
  }
  if (storedIsValid) {
    networkSettingsStored = true;
    logEvent("success", "WiFi es OTA beallitas EEPROM-bol betoltve");
    return;
  }
  // A publikus GitHub-build csak mintaadatokat tartalmaz. Ilyenkor szandekosan
  // nem irunk semmit az EEPROM-be, hogy egy kesobbi USB-s kezdeti feltoltes
  // biztonsagosan el tudja menteni a valodi halozati adatokat.
  memset(&networkSettings, 0, sizeof(networkSettings));
  copyText(networkSettings.ssid, sizeof(networkSettings.ssid), WIFI_SSID);
  copyText(networkSettings.password, sizeof(networkSettings.password), WIFI_PASSWORD);
  copyText(networkSettings.otaPassword, sizeof(networkSettings.otaPassword), OTA_PASSWORD);
  logEvent("error", "Nincs ervenyes WiFi beallitas; USB-s kezdeti feltoltes kell");
}

uint32_t apiSettingsChecksum(const ApiSettings& settings) {
  const uint8_t* bytes = reinterpret_cast<const uint8_t*>(&settings);
  uint32_t result = 2166136261UL;
  for (size_t i = 0; i < sizeof(ApiSettings) - sizeof(settings.checksum); i++) result = (result ^ bytes[i]) * 16777619UL;
  return result;
}
bool privatePathValid(const char* value) {
  if (isPlaceholder(value) || value[0] != '/' || strlen(value) < 18 || strlen(value) >= sizeof(apiSettings.privatePath)) return false;
  for (const char* item = value + 1; *item; item++) if (!((*item >= 'a' && *item <= 'z') || (*item >= 'A' && *item <= 'Z') || (*item >= '0' && *item <= '9') || *item == '-' || *item == '_')) return false;
  return true;
}
bool apiSecretValid(const char* value) { return !isPlaceholder(value) && strlen(value) >= 24 && strlen(value) < sizeof(apiSettings.sharedSecret); }
bool apiSettingsValid(const ApiSettings& settings) {
  return settings.magic == API_SETTINGS_MAGIC && settings.version == API_SETTINGS_VERSION && settings.checksum == apiSettingsChecksum(settings) && privatePathValid(settings.privatePath) && apiSecretValid(settings.sharedSecret);
}
void saveCompiledApiSettings() {
  memset(&apiSettings, 0, sizeof(apiSettings));
  apiSettings.magic = API_SETTINGS_MAGIC; apiSettings.version = API_SETTINGS_VERSION;
  copyText(apiSettings.privatePath, sizeof(apiSettings.privatePath), API_PRIVATE_PATH);
  copyText(apiSettings.sharedSecret, sizeof(apiSettings.sharedSecret), API_SHARED_SECRET);
  apiSettings.checksum = apiSettingsChecksum(apiSettings);
  EEPROM.put(API_SETTINGS_EEPROM_OFFSET, apiSettings);
  apiSettingsStored = true;
}
void loadApiSettings() {
  EEPROM.get(API_SETTINGS_EEPROM_OFFSET, apiSettings);
  const bool storedIsValid = apiSettingsValid(apiSettings);
  const bool compiledIsValid = privatePathValid(API_PRIVATE_PATH) && apiSecretValid(API_SHARED_SECRET);
  if (compiledIsValid && (!storedIsValid || strcmp(apiSettings.privatePath, API_PRIVATE_PATH) != 0 || strcmp(apiSettings.sharedSecret, API_SHARED_SECRET) != 0)) {
    saveCompiledApiSettings(); logEvent("success", "Vedett API beallitas EEPROM-be mentve"); return;
  }
  if (storedIsValid) { apiSettingsStored = true; logEvent("success", "Vedett API beallitas EEPROM-bol betoltve"); return; }
  memset(&apiSettings, 0, sizeof(apiSettings));
  logEvent("error", "Vedett API nincs beallitva; USB-s kezdeti feltoltes kell");
}

uint32_t scheduleChecksum(const StoredSchedule* entries, uint8_t count) {
  uint32_t value = 2166136261UL;
  const uint8_t* bytes = reinterpret_cast<const uint8_t*>(entries);
  for (size_t i = 0; i < sizeof(StoredSchedule) * count; i++) value = (value ^ bytes[i]) * 16777619UL;
  return value;
}
void loadSchedules() {
  ScheduleHeader header = {};
  EEPROM.get(SCHEDULE_EEPROM_OFFSET, header);
  if (header.magic != SCHEDULE_MAGIC || header.version != 1 || header.count > SCHEDULE_MAX) return;
  EEPROM.get(SCHEDULE_EEPROM_OFFSET + sizeof(ScheduleHeader), schedules);
  if (header.checksum != scheduleChecksum(schedules, header.count)) { logEvent("error", "Idozitesi EEPROM ellenorzes sikertelen"); return; }
  scheduleCount = header.count; schedulesStored = true;
  char message[64]; snprintf(message, sizeof(message), "Arduino idozites betoltve: %d bejegyzes", scheduleCount); logEvent("success", message);
}
bool saveSchedules(uint8_t count) {
  if (count > SCHEDULE_MAX) return false;
  ScheduleHeader header = { SCHEDULE_MAGIC, 1, count, scheduleChecksum(schedules, count) };
  EEPROM.put(SCHEDULE_EEPROM_OFFSET, header);
  EEPROM.put(SCHEDULE_EEPROM_OFFSET + sizeof(ScheduleHeader), schedules);
  scheduleCount = count; schedulesStored = true;
  return true;
}
int hexValue(char value) { if (value >= '0' && value <= '9') return value - '0'; if (value >= 'a' && value <= 'f') return value - 'a' + 10; if (value >= 'A' && value <= 'F') return value - 'A' + 10; return -1; }
bool decodeScheduleHex(const String& payload, StoredSchedule& entry) {
  const size_t bytes = sizeof(StoredSchedule);
  if (payload.length() != bytes * 2) return false;
  uint8_t* target = reinterpret_cast<uint8_t*>(&entry);
  for (size_t i = 0; i < payload.length(); i += 2) { int high = hexValue(payload[i]), low = hexValue(payload[i + 1]); if (high < 0 || low < 0) return false; target[i / 2] = (high << 4) | low; }
  return entry.day >= 1 && entry.day <= 7 && entry.hour <= 23 && entry.minute <= 59;
}
String encodeScheduleHex(const StoredSchedule& entry) {
  static const char HEX_DIGITS[] = "0123456789abcdef";
  const uint8_t* source = reinterpret_cast<const uint8_t*>(&entry);
  String payload;
  if (!payload.reserve(sizeof(StoredSchedule) * 2)) return "";
  for (size_t i = 0; i < sizeof(StoredSchedule); i++) {
    payload += HEX_DIGITS[(source[i] >> 4) & 0x0f];
    payload += HEX_DIGITS[source[i] & 0x0f];
  }
  return payload;
}

bool importSchedulesHex(const String& payload) {
  const size_t recordChars = sizeof(StoredSchedule) * 2;
  if (payload.length() % recordChars != 0) return false;
  uint8_t count = payload.length() / recordChars; if (count > SCHEDULE_MAX) return false;
  for (uint8_t i = 0; i < count; i++) if (!decodeScheduleHex(payload.substring(i * recordChars, (i + 1) * recordChars), schedules[i])) return false;
  return saveSchedules(count);
}
bool euSummerTime(const tm& utc) {
  int month = utc.tm_mon + 1, day = utc.tm_mday;
  if (month < 3 || month > 10) return false;
  if (month > 3 && month < 10) return true;
  int lastSunday = day + ((utc.tm_wday + 7 - 0) % 7); // only used below with month-end calculation
  (void)lastSunday;
  int daysInMonth = month == 3 ? 31 : 31;
  int weekdayLast = (utc.tm_wday + (daysInMonth - day)) % 7;
  int last = daysInMonth - weekdayLast;
  if (month == 3) return day > last || (day == last && utc.tm_hour >= 1);
  return day < last || (day == last && utc.tm_hour < 1);
}
bool localScheduleTime(uint8_t& day, uint8_t& hour, uint8_t& minute) {
  if (!timeSynced) return false;
  time_t utcEpoch = lastClockEpoch + (millis() - lastClockMillis) / 1000;
  tm utc = *gmtime(&utcEpoch); utcEpoch += 3600 + (euSummerTime(utc) ? 3600 : 0);
  tm local = *gmtime(&utcEpoch); day = local.tm_wday == 0 ? 7 : local.tm_wday; hour = local.tm_hour; minute = local.tm_min; return true;
}
bool ledMatchesStored(const Led& current, const StoredLed& expected) {
  return current.enabled == (expected.enabled != 0) && current.brightness == expected.brightness &&
    current.effect == expected.effect && current.speed == expected.speed && current.red == expected.red &&
    current.green == expected.green && current.blue == expected.blue;
}
void applyStoredLed(uint8_t stripIndex, const StoredLed& source) {
  leds[stripIndex] = { source.enabled != 0, source.brightness, source.effect, source.speed, source.red, source.green, source.blue };
}
void reconcileArduinoSchedules(bool forceCheck = false) {
  if (!scheduleCount || !timeSynced) return;
  const unsigned long now = millis();
  if (!forceCheck && lastScheduleAudit && now - lastScheduleAudit < SCHEDULE_AUDIT_INTERVAL) return;
  lastScheduleAudit = now;

  uint8_t day, hour, minute; if (!localScheduleTime(day, hour, minute)) return;
  const uint16_t currentWeekMinute = (day - 1) * 1440U + hour * 60U + minute;
  bool changed = false;

  for (uint8_t stripIndex = 0; stripIndex < STRIP_COUNT; stripIndex++) {
    int16_t selected = -1;
    int32_t selectedMinute = -1;

    // Eloszor az aktualis heti pillanatig keressuk a legutobbi ervenyes rekordot.
    for (uint8_t s = 0; s < scheduleCount; s++) {
      if (!schedules[s].leds[stripIndex].apply) continue;
      const uint16_t eventMinute = (schedules[s].day - 1) * 1440U + schedules[s].hour * 60U + schedules[s].minute;
      if (eventMinute <= currentWeekMinute && eventMinute >= selectedMinute) { selected = s; selectedMinute = eventMinute; }
    }
    // Ha hetfon a legelso esemeny elott vagyunk, az elozo het utolso rekordja ervenyes.
    if (selected < 0) {
      for (uint8_t s = 0; s < scheduleCount; s++) {
        if (!schedules[s].leds[stripIndex].apply) continue;
        const uint16_t eventMinute = (schedules[s].day - 1) * 1440U + schedules[s].hour * 60U + schedules[s].minute;
        if (eventMinute >= selectedMinute) { selected = s; selectedMinute = eventMinute; }
      }
    }

    if (selected >= 0) {
      const StoredLed& expected = schedules[selected].leds[stripIndex];
      if (!ledMatchesStored(leds[stripIndex], expected)) { applyStoredLed(stripIndex, expected); changed = true; }
    }
  }

  if (changed) {
    char message[88];
    snprintf(message, sizeof(message), "Idozites allapot helyreallitva: %d %02d:%02d", day, hour, minute);
    logEvent("success", message);
    renderAll(true);
  }
}
void runArduinoSchedules() {
  uint8_t day, hour, minute; if (!localScheduleTime(day, hour, minute)) return;
  const unsigned long key = (lastClockEpoch + (millis() - lastClockMillis) / 1000) / 60;
  const bool newMinute = key != lastScheduleMinute;
  if (newMinute) lastScheduleMinute = key;
  reconcileArduinoSchedules(newMinute);
}

bool wifiHasAddress() {
  if (WiFi.status() != WL_CONNECTED) return false;
  IPAddress ip = WiFi.localIP();
  return ip[0] || ip[1] || ip[2] || ip[3];
}

void connectWifi() {
  if (!wifiHasAddress()) {
    showMatrix(MATRIX_WIFI);
    WiFi.begin(networkSettings.ssid, networkSettings.password);
    lastWifi = millis();
    logEvent("info", "WiFi kapcsolodas inditva");
  }
}
void reportWifiConnected() {
  if (!wifiHasAddress()) { wifiReported = false; return; }
  if (wifiReported) return;

  wifiReported = true;
  showMatrix(MATRIX_OK);
  IPAddress ip = WiFi.localIP();

  char message[128];
  snprintf(message, sizeof(message),
    "WiFi kesz: %u.%u.%u.%u, jel: %d dBm, HTTP: %u, OTA: %u",
    ip[0], ip[1], ip[2], ip[3], WiFi.RSSI(), HTTP_API_PORT, OTA_UPLOAD_PORT);
  logEvent("success", message);

  consoleLine("");
  consoleLine("==========================================");
  snprintf(message, sizeof(message), "Eszkoz:              %s", DEVICE_NAME); consoleLine(message);
  snprintf(message, sizeof(message), "Firmware:            %s", FIRMWARE_VERSION); consoleLine(message);
  snprintf(message, sizeof(message), "WiFi modul firmware: %s", WiFi.firmwareVersion()); consoleLine(message);
  snprintf(message, sizeof(message), "IP cim:              %u.%u.%u.%u", ip[0], ip[1], ip[2], ip[3]); consoleLine(message);
  snprintf(message, sizeof(message), "Jelerosseg:           %d dBm", WiFi.RSSI()); consoleLine(message);
  consoleLine("------------------------------------------");
  snprintf(message, sizeof(message), "Web API:             http://%u.%u.%u.%u:%u/api/status", ip[0], ip[1], ip[2], ip[3], HTTP_API_PORT); consoleLine(message);
  snprintf(message, sizeof(message), "OTA feltoltes:       %u.%u.%u.%u:%u", ip[0], ip[1], ip[2], ip[3], OTA_UPLOAD_PORT); consoleLine(message);
  snprintf(message, sizeof(message), "mDNS felismeres:     INAKTIV (stabilitasi okbol)"); consoleLine(message);
  consoleLine("------------------------------------------");
  snprintf(message, sizeof(message), "OTA szolgaltatas:    %s", otaReady ? "AKTIV" : "INAKTIV"); consoleLine(message);
  snprintf(message, sizeof(message), "OTA jelszo:          %s", networkSettings.otaPassword[0] ? "BEALLITVA" : "HIANYZIK"); consoleLine(message);
  snprintf(message, sizeof(message), "PIR figyeles:        %s", ENABLE_PIR_SENSORS ? "BE" : "KI (nincs szenzor)"); consoleLine(message);
  snprintf(message, sizeof(message), "Fizikai gombok:      %s", ENABLE_PHYSICAL_BUTTONS ? "BE" : "KI"); consoleLine(message);
  consoleLine("==========================================");
  consoleLine("");
}

void showOtaIndicator(uint8_t red, uint8_t green, uint8_t blue, uint8_t brightness = 80) {
  for (uint8_t i = 0; i < STRIP_COUNT; i++) {
    strip[i].setBrightness(brightness);
    strip[i].fill(strip[i].Color(red, green, blue));
    strip[i].show();
  }
}
void otaTransferStarted() {
  logEvent("info", "OTA atvitel elindult - kek fenyes jelzes");
  showMatrix(MATRIX_OTA);
  showOtaIndicator(0, 70, 255);
}
void otaBeforeApply() {
  logEvent("success", "OTA kesz - zold jelzes, ujrainditas");
  showMatrix(MATRIX_OK);
  showOtaIndicator(0, 255, 60);
}
void otaTransferError(int code, const char*) {
  char message[88];
  snprintf(message, sizeof(message), "OTA hiba: %d - piros jelzes", code);
  logEvent("error", message);
  showMatrix(MATRIX_ERROR);
  showOtaIndicator(255, 0, 0);
}
void startOta() {
  if (!wifiHasAddress() || otaReady) return;

  ArduinoOTA.onStart(otaTransferStarted);
  ArduinoOTA.beforeApply(otaBeforeApply);
  ArduinoOTA.onError(otaTransferError);
  ArduinoOTA.begin(WiFi.localIP(), DEVICE_NAME, networkSettings.otaPassword, InternalStorage);
  otaReady = true;

  IPAddress ip = WiFi.localIP();
  char message[112];
  snprintf(message, sizeof(message),
    "OTA fogado szolgaltatas aktiv: %u.%u.%u.%u:%u",
    ip[0], ip[1], ip[2], ip[3], OTA_UPLOAD_PORT);
  logEvent("success", message);

  snprintf(message, sizeof(message),
    "OTA szolgaltatas aktiv: %u.%u.%u.%u:%u",
    ip[0], ip[1], ip[2], ip[3], OTA_UPLOAD_PORT);
  consoleLine(message);
}

float effectScale(uint8_t speed) { return 0.25f + (constrain(speed, 1, 100) / 100.0f) * 3.75f; }
unsigned long effectDuration(unsigned long base, uint8_t speed) { return max(1UL, static_cast<unsigned long>(base / effectScale(speed))); }
uint32_t color(uint8_t i, float scale = 1.0f) { return strip[i].Color(leds[i].red * scale, leds[i].green * scale, leds[i].blue * scale); }
void render(uint8_t i) {
  if (!leds[i].enabled) { strip[i].clear(); strip[i].show(); return; }
  strip[i].setBrightness(leds[i].brightness);
  switch (leds[i].effect) {
    case BLINK: if ((millis() / effectDuration(500, leds[i].speed)) % 2 == 0) strip[i].fill(color(i)); else strip[i].clear(); break;
    case BREATHE: strip[i].fill(color(i, (sin(millis() / (900.0f / effectScale(leds[i].speed))) + 1.0f) / 2.0f)); break;
    case RAINBOW: for (uint16_t p = 0; p < strip[i].numPixels(); p++) strip[i].setPixelColor(p, strip[i].gamma32(strip[i].ColorHSV(((millis() / effectDuration(20, leds[i].speed)) + p * 65535UL / strip[i].numPixels()) & 0xffff))); break;
    case CHASE: { strip[i].clear(); int pos = (millis() / effectDuration(90, leds[i].speed)) % strip[i].numPixels(); for (int j = -3; j <= 3; j++) strip[i].setPixelColor((pos + j + strip[i].numPixels()) % strip[i].numPixels(), color(i, 1.0f - abs(j) / 4.0f)); break; }
    default: strip[i].fill(color(i)); break;
  }
  strip[i].show();
}
void renderAll(bool force) {
  bool animated = false; for (uint8_t i = 0; i < STRIP_COUNT; i++) if (leds[i].enabled && leds[i].effect != STATIC) animated = true;
  if (!force && (!animated || millis() - lastFrame < EFFECT_FRAME)) return;
  lastFrame = millis(); for (uint8_t i = 0; i < STRIP_COUNT; i++) render(i);
}

void handlePir() {
#if !ENABLE_PIR_SENSORS
  return;
#else
  unsigned long now = millis();
  for (uint8_t i = 0; i < STRIP_COUNT; i++) {
    bool raw = digitalRead(PIR_PINS[i]) == HIGH;
    if (raw != pirRaw[i]) { pirRaw[i] = raw; pirChanged[i] = now; }
    if (pirRaw[i] && now - pirChanged[i] >= PIR_DEBOUNCE) { lastMotion[i] = now; if (!pirActive[i]) { pirActive[i] = true; leds[i].enabled = true; logEvent("info", "PIR mozgas erzekelve"); renderAll(true); } }
    if (pirActive[i] && now - lastMotion[i] > PIR_TIMEOUT) { pirActive[i] = false; leds[i].enabled = false; logEvent("info", "PIR idotullepes, LED kikapcsolva"); renderAll(true); }
  }
#endif
}
void handleButtons() {
#if !ENABLE_PHYSICAL_BUTTONS
  return;
#else
  static bool lastMode = HIGH, lastUp = HIGH, lastDown = HIGH; static unsigned long lastCheck = 0;
  if (millis() - lastCheck < 50) return; lastCheck = millis();
  bool mode = digitalRead(BUTTON_MODE), up = digitalRead(BUTTON_UP), down = digitalRead(BUTTON_DOWN);
  if (mode == LOW && lastMode == HIGH) { for (uint8_t i = 0; i < STRIP_COUNT; i++) leds[i].effect = (leds[i].effect + 1) % 5; logEvent("info", "Gomb: effekt valtas"); renderAll(true); }
  if (up == LOW && lastUp == HIGH) { for (uint8_t i = 0; i < STRIP_COUNT; i++) leds[i].brightness = min(255, leds[i].brightness + 25); renderAll(true); }
  if (down == LOW && lastDown == HIGH) { for (uint8_t i = 0; i < STRIP_COUNT; i++) leds[i].brightness = max(0, leds[i].brightness - 25); renderAll(true); }
  lastMode = mode; lastUp = up; lastDown = down;
#endif
}

void resetBuffer(FixedBuffer& buffer, char* storage, size_t capacity) {
  buffer.data = storage;
  buffer.capacity = capacity;
  buffer.length = 0;
  buffer.valid = capacity > 0;
  if (capacity) storage[0] = 0;
}

bool appendRaw(FixedBuffer& buffer, const char* value) {
  if (!buffer.valid || !value) return false;
  const size_t valueLength = strlen(value);
  if (buffer.length + valueLength >= buffer.capacity) { buffer.valid = false; return false; }
  memcpy(buffer.data + buffer.length, value, valueLength);
  buffer.length += valueLength;
  buffer.data[buffer.length] = 0;
  return true;
}

bool appendChar(FixedBuffer& buffer, char value) {
  if (!buffer.valid || buffer.length + 1 >= buffer.capacity) { buffer.valid = false; return false; }
  buffer.data[buffer.length++] = value;
  buffer.data[buffer.length] = 0;
  return true;
}

bool appendFormat(FixedBuffer& buffer, const char* format, ...) {
  if (!buffer.valid) return false;
  va_list args;
  va_start(args, format);
  const size_t remaining = buffer.capacity - buffer.length;
  const int written = vsnprintf(buffer.data + buffer.length, remaining, format, args);
  va_end(args);
  if (written < 0 || static_cast<size_t>(written) >= remaining) {
    buffer.valid = false;
    return false;
  }
  buffer.length += static_cast<size_t>(written);
  return true;
}

bool appendJsonEscaped(FixedBuffer& buffer, const char* source) {
  if (!source) return true;
  while (*source) {
    const unsigned char value = static_cast<unsigned char>(*source++);
    if (value == '"' || value == '\\') {
      if (!appendChar(buffer, '\\')) return false;
      if (!appendChar(buffer, static_cast<char>(value))) return false;
    } else if (value == '\n') {
      if (!appendRaw(buffer, "\\n")) return false;
    } else if (value == '\r') {
      if (!appendRaw(buffer, "\\r")) return false;
    } else if (value == '\t') {
      if (!appendRaw(buffer, "\\t")) return false;
    } else if (value >= 0x20) {
      if (!appendChar(buffer, static_cast<char>(value))) return false;
    }
  }
  return true;
}

bool writeClientData(WiFiClient& client, const char* data, size_t length) {
  size_t offset = 0;
  while (offset < length) {
    const size_t remaining = length - offset;
    const size_t chunk = remaining > HTTP_WRITE_CHUNK_SIZE ? HTTP_WRITE_CHUNK_SIZE : remaining;
    const size_t written = client.write(reinterpret_cast<const uint8_t*>(data + offset), chunk);
    if (written == 0) {
      httpWriteFailures++;
      return false;
    }
    offset += written;
  }
  return true;
}

bool sendJsonBuffer(WiFiClient& client, const char* body, size_t bodyLength, int code = 200) {
  char header[176];
  const char* status = code == 200 ? "200 OK" : (code == 503 ? "503 Service Unavailable" : "400 Bad Request");
  const int headerLength = snprintf(header, sizeof(header),
    "HTTP/1.1 %s\r\n"
    "Content-Type: application/json; charset=utf-8\r\n"
    "Connection: close\r\n"
    "Cache-Control: no-store\r\n"
    "Content-Length: %lu\r\n\r\n",
    status, static_cast<unsigned long>(bodyLength));
  if (headerLength <= 0 || static_cast<size_t>(headerLength) >= sizeof(header)) {
    httpWriteFailures++;
    return false;
  }
  if (!writeClientData(client, header, static_cast<size_t>(headerLength))) return false;
  return writeClientData(client, body, bodyLength);
}

void sendJsonLiteral(WiFiClient& client, const char* body, int code = 200) {
  sendJsonBuffer(client, body, strlen(body), code);
}

bool buildStatusJson(size_t& bodyLength) {
  FixedBuffer buffer;
  resetBuffer(buffer, httpBodyBuffer, sizeof(httpBodyBuffer));
  IPAddress currentIp = WiFi.localIP();
  const char* connected = wifiHasAddress() ? "true" : "false";
  const char* synced = timeSynced ? "true" : "false";

  appendFormat(buffer,
    "{\"connected\":%s,\"timesynced\":%s,"
    "\"deviceName\":\"%s\",\"hostname\":\"\",\"localHostname\":\"\","
    "\"ipAddress\":\"%u.%u.%u.%u\",\"mdnsEnabled\":false,"
    "\"networkConfigStored\":%s,\"scheduler\":\"arduino-eeprom\","
    "\"scheduleCount\":%u,\"consoleLogCount\":%u,\"consoleLastId\":%lu,"
    "\"firmwareVersion\":\"%s\",\"httpPort\":%u,\"otaPort\":%u,\"mdnsPort\":%u,"
    "\"otaEnabled\":%s,\"otaPasswordConfigured\":%s,\"apiProtected\":%s,"
    "\"matrixEnabled\":true,\"pirSensorsEnabled\":%s,\"physicalButtonsEnabled\":%s,"
    "\"uptime\":%lu,\"rssi\":%ld,"
    "\"http\":{\"requests\":%lu,\"timeouts\":%lu,\"rejected\":%lu,"
    "\"writeFailures\":%lu,\"maxBatch\":%u,\"lastClientIp\":\"",
    connected, synced, DEVICE_NAME,
    currentIp[0], currentIp[1], currentIp[2], currentIp[3],
    networkSettingsStored ? "true" : "false",
    scheduleCount, logSize, static_cast<unsigned long>(nextLogId ? nextLogId - 1 : 0),
    FIRMWARE_VERSION, HTTP_API_PORT, OTA_UPLOAD_PORT, MDNS_PORT,
    otaReady ? "true" : "false",
    networkSettings.otaPassword[0] ? "true" : "false",
    apiSettingsStored ? "true" : "false",
    ENABLE_PIR_SENSORS ? "true" : "false",
    ENABLE_PHYSICAL_BUTTONS ? "true" : "false",
    millis() / 1000, static_cast<long>(wifiHasAddress() ? WiFi.RSSI() : 0),
    httpRequests, httpTimeouts, httpRejected, httpWriteFailures, httpMaxBatch);

  appendJsonEscaped(buffer, lastHttpClientIp);
  appendRaw(buffer, "\",\"lastPath\":\"");
  appendJsonEscaped(buffer, lastHttpPath);
  appendFormat(buffer, "\",\"lastClientAge\":%lu},\"strips\":[",
    lastHttpClientAt ? (millis() - lastHttpClientAt) / 1000 : 0);

  for (uint8_t i = 0; i < STRIP_COUNT; i++) {
    if (i) appendChar(buffer, ',');
    appendFormat(buffer,
      "{\"id\":%u,\"enabled\":%s,\"brightness\":%u,\"effect\":%u,"
      "\"speed\":%u,\"color\":[%u,%u,%u]}",
      i + 1, leds[i].enabled ? "true" : "false", leds[i].brightness,
      leds[i].effect, leds[i].speed, leds[i].red, leds[i].green, leds[i].blue);
  }
  appendRaw(buffer, "]}");
  bodyLength = buffer.length;
  return buffer.valid;
}

void sendStatusJson(WiFiClient& client) {
  size_t bodyLength = 0;
  if (!buildStatusJson(bodyLength)) {
    sendJsonLiteral(client, "{\"error\":\"Statusz valasz memoriahiba\"}", 503);
    return;
  }
  sendJsonBuffer(client, httpBodyBuffer, bodyLength);
}

void sendLogsJson(WiFiClient& client, uint32_t afterId = 0) {
  const uint32_t currentLastId = nextLogId ? nextLogId - 1 : 0;
  if (afterId > currentLastId) afterId = 0;

  uint8_t selected[CONSOLE_LOGS_PER_RESPONSE] = {};
  uint8_t selectedCount = 0;
  uint32_t responseLastId = afterId;
  for (uint8_t i = 0; i < logSize && selectedCount < CONSOLE_LOGS_PER_RESPONSE; i++) {
    const uint8_t index = (logStart + i) % LOG_CAPACITY;
    if (logs[index].id <= afterId) continue;
    selected[selectedCount++] = index;
    responseLastId = logs[index].id;
  }

  FixedBuffer buffer;
  resetBuffer(buffer, httpBodyBuffer, sizeof(httpBodyBuffer));
  appendFormat(buffer, "{\"lastId\":%lu,\"logs\":[", static_cast<unsigned long>(responseLastId));
  for (uint8_t i = 0; i < selectedCount; i++) {
    const Log& entry = logs[selected[i]];
    if (i) appendChar(buffer, ',');
    appendFormat(buffer, "{\"id\":%lu,\"timestamp\":\"%lus\",\"type\":\"",
      static_cast<unsigned long>(entry.id), entry.timestamp);
    appendJsonEscaped(buffer, entry.type);
    appendRaw(buffer, "\",\"message\":\"");
    appendJsonEscaped(buffer, entry.message);
    appendRaw(buffer, "\"}");
  }
  appendRaw(buffer, "]}");

  if (!buffer.valid) {
    sendJsonLiteral(client, "{\"lastId\":0,\"logs\":[],\"error\":\"Konzol valasz memoriahiba\"}", 503);
    return;
  }
  sendJsonBuffer(client, httpBodyBuffer, buffer.length);
}

void sendConsoleStatsJson(WiFiClient& client) {
  FixedBuffer buffer;
  resetBuffer(buffer, httpBodyBuffer, sizeof(httpBodyBuffer));
  appendFormat(buffer,
    "{\"logCount\":%u,\"uptime\":%lu,\"wifiSignal\":%ld,"
    "\"http\":{\"requests\":%lu,\"timeouts\":%lu,\"rejected\":%lu,"
    "\"writeFailures\":%lu,\"maxBatch\":%u},"
    "\"system\":{\"wifiConnected\":%s,\"consoleActive\":true}}",
    logSize, millis() / 1000, static_cast<long>(wifiHasAddress() ? WiFi.RSSI() : 0),
    httpRequests, httpTimeouts, httpRejected, httpWriteFailures, httpMaxBatch,
    wifiHasAddress() ? "true" : "false");
  if (!buffer.valid) {
    sendJsonLiteral(client, "{\"error\":\"Konzol statisztika memoriahiba\"}", 503);
    return;
  }
  sendJsonBuffer(client, httpBodyBuffer, buffer.length);
}

void sendJson(WiFiClient& client, const String& body, int code = 200) {
  sendJsonBuffer(client, body.c_str(), body.length(), code);
}
void rememberHttpClient(WiFiClient& c, const char* method, const String& path, bool timedOut = false) {
  IPAddress remote = c.remoteIP();
  char ip[16]; snprintf(ip, sizeof(ip), "%u.%u.%u.%u", remote[0], remote[1], remote[2], remote[3]);
  String cleanPath = path.substring(0, path.indexOf('?') < 0 ? path.length() : path.indexOf('?'));
  strncpy(lastHttpClientIp, ip, sizeof(lastHttpClientIp) - 1); lastHttpClientIp[sizeof(lastHttpClientIp) - 1] = 0;
  strncpy(lastHttpPath, cleanPath.c_str(), sizeof(lastHttpPath) - 1); lastHttpPath[sizeof(lastHttpPath) - 1] = 0;
  lastHttpClientAt = millis();
  // A statusz- es konzolpolling sajat magat ne naplozza vissza a konzolba.
  // Csak timeoutot, illetve valodi vezerlesi kerest irunk a gyurupufferbe.
  const bool pollingRequest = strcmp(lastHttpPath, "/api/status") == 0 ||
    strcmp(lastHttpPath, "/api/led/status") == 0 ||
    strcmp(lastHttpPath, "/api/console/logs") == 0 ||
    strcmp(lastHttpPath, "/api/console/stats") == 0;
  if (timedOut || (!pollingRequest && (!lastHttpClientLog || millis() - lastHttpClientLog >= 15000))) {
    char message[88];
    snprintf(message, sizeof(message), timedOut ? "HTTP kliens %s: adat timeout" : "HTTP kliens %s: %s %s", ip, method, lastHttpPath);
    logEvent(timedOut ? "warn" : "info", message); lastHttpClientLog = millis();
  }
}
int valueInt(const String& query, const char* name, int fallback, int low, int high) { int from = query.indexOf(String(name) + '='); if (from < 0) return fallback; from += strlen(name) + 1; int to = query.indexOf('&', from); if (to < 0) to = query.length(); return constrain(query.substring(from, to).toInt(), low, high); }
bool valueBool(const String& query, const char* name, bool fallback) { int from = query.indexOf(String(name) + '='); if (from < 0) return fallback; from += strlen(name) + 1; int to = query.indexOf('&', from); if (to < 0) to = query.length(); String value = query.substring(from, to); return value == "1" || value == "true"; }

void updateLed(const String& path) {
  int question = path.indexOf('?'), end = question < 0 ? path.length() : question, id = path.substring(9, end).toInt(); if (id < 1 || id > STRIP_COUNT) return;
  Led& led = leds[id - 1]; String query = question < 0 ? "" : path.substring(question + 1);
  led.enabled = valueBool(query, "enabled", led.enabled); led.brightness = valueInt(query, "brightness", led.brightness, 0, 255); led.effect = valueInt(query, "effect", led.effect, 0, 4); led.speed = valueInt(query, "speed", led.speed, 1, 100);
  int colorAt = query.indexOf("color="); if (colorAt >= 0) { String raw = query.substring(colorAt + 6); int stop = raw.indexOf('&'); if (stop >= 0) raw = raw.substring(0, stop); int a = raw.indexOf(','), b = raw.indexOf(',', a + 1); if (a >= 0 && b >= 0) { led.red = constrain(raw.substring(0, a).toInt(), 0, 255); led.green = constrain(raw.substring(a + 1, b).toInt(), 0, 255); led.blue = constrain(raw.substring(b + 1).toInt(), 0, 255); } }
  char message[112];
  snprintf(message, sizeof(message), "LED %d: %s | fenyerő: %d | effekt: %d | sebesseg: %d | RGB: %d,%d,%d", id, led.enabled ? "BE" : "KI", led.brightness, led.effect, led.speed, led.red, led.green, led.blue);
  logEvent("info", message); renderAll(true);
}
void route(WiFiClient& c, const String& path) {
  int queryAt = path.indexOf('?'); String base = queryAt < 0 ? path : path.substring(0, queryAt);
  if (base == "/api/schedules/export") {
    String query = queryAt < 0 ? "" : path.substring(queryAt + 1);
    int index = valueInt(query, "index", -1, -1, SCHEDULE_MAX - 1);
    if (index < 0 || index >= scheduleCount) {
      sendJson(c, "{\"error\":\"Ervenytelen idozitesi index\"}", 400);
      return;
    }
    String payload = encodeScheduleHex(schedules[index]);
    if (!payload.length()) {
      sendJson(c, "{\"error\":\"Idozitesi export memoriahiba\"}", 400);
      return;
    }
    String response;
    if (!response.reserve(120)) {
      sendJson(c, "{\"error\":\"Idozitesi export memoriahiba\"}", 400);
      return;
    }
    response = "{\"success\":true,\"index\":" + String(index) + ",\"count\":" + String(scheduleCount) + ",\"payload\":\"" + payload + "\"}";
    sendJson(c, response);
    return;
  }
  if (base == "/api/schedules/upload") { String payload = queryAt < 0 ? "" : path.substring(queryAt + 1); if (!payload.startsWith("payload=")) { sendJson(c, "{\"error\":\"Hianyzik a payload\"}", 400); return; } if (!importSchedulesHex(payload.substring(8))) { sendJson(c, "{\"error\":\"Ervenytelen idozitesi adat\"}", 400); return; } char message[64]; snprintf(message, sizeof(message), "Arduino idozites mentve: %d bejegyzes", scheduleCount); logEvent("success", message); sendJson(c, "{\"success\":true,\"count\":" + String(scheduleCount) + "}"); return; }
  if (base == "/api/schedules/chunk") { String query = queryAt < 0 ? "" : path.substring(queryAt + 1); int index = valueInt(query, "index", -1, -1, SCHEDULE_MAX - 1), total = valueInt(query, "total", 0, 0, SCHEDULE_MAX); int payloadAt = query.indexOf("payload="); if (index < 0 || total < 1 || index >= total || payloadAt < 0 || !decodeScheduleHex(query.substring(payloadAt + 8), schedules[index])) { sendJson(c, "{\"error\":\"Ervenytelen idozitesi reszlet\"}", 400); return; } if (index + 1 == total) { saveSchedules(total); char message[64]; snprintf(message, sizeof(message), "Arduino idozites mentve: %d bejegyzes", scheduleCount); logEvent("success", message); } sendJson(c, "{\"success\":true,\"count\":" + String(index + 1 == total ? scheduleCount : 0) + "}"); return; }
  if (base == "/api/schedules/clear") { memset(schedules, 0, sizeof(schedules)); saveSchedules(0); logEvent("info", "Arduino idozites torolve"); sendJson(c, "{\"success\":true}"); return; }
  if (base == "/api/status" || base == "/api/led/status") { sendStatusJson(c); return; }
  if (base == "/api/console/logs") { String query = queryAt < 0 ? "" : path.substring(queryAt + 1); uint32_t afterId = (uint32_t)valueInt(query, "after", 0, 0, 2147483647); sendLogsJson(c, afterId); return; }
  if (base == "/api/console/stats") { sendConsoleStatsJson(c); return; }
  if (base == "/api/console/clear") { logStart = 0; logSize = 0; sendJsonLiteral(c, "{\"success\":true}"); return; }
  if (base == "/api/all-on" || base == "/api/all-off") { bool state = base == "/api/all-on"; for (uint8_t i = 0; i < STRIP_COUNT; i++) leds[i].enabled = state; logEvent("info", state ? "Minden LED bekapcsolva" : "Minden LED kikapcsolva"); renderAll(true); sendStatusJson(c); return; }
  if (base.startsWith("/api/led/")) { updateLed(path); sendStatusJson(c); return; }
  sendJson(c, "{\"error\":\"Ismeretlen API vegpont\"}", 400);
}

bool constantTimeEquals(const String& supplied, const char* expected) {
  const size_t expectedLength = strlen(expected);
  if (supplied.length() != expectedLength) return false;
  uint8_t difference = 0;
  for (size_t i = 0; i < expectedLength; i++) difference |= supplied[i] ^ expected[i];
  return difference == 0;
}
bool extractQueryValue(const String& query, const char* name, String& value) {
  const String prefix = String(name) + "=";
  int start = 0;
  while (start < query.length()) {
    int end = query.indexOf('&', start); if (end < 0) end = query.length();
    if (query.substring(start, end).startsWith(prefix)) { value = query.substring(start + prefix.length(), end); return true; }
    start = end + 1;
  }
  return false;
}
bool unwrapProtectedPath(const String& requestPath, String& apiPath) {
  if (!apiSettingsStored) return false;
  const int queryAt = requestPath.indexOf('?');
  const String base = queryAt < 0 ? requestPath : requestPath.substring(0, queryAt);
  const String prefix = String(apiSettings.privatePath) + "/api/";
  if (!base.startsWith(prefix)) return false;
  String supplied;
  const String query = queryAt < 0 ? "" : requestPath.substring(queryAt + 1);
  if (!extractQueryValue(query, "k", supplied) || !constantTimeEquals(supplied, apiSettings.sharedSecret)) return false;
  apiPath = base.substring(strlen(apiSettings.privatePath));
  // A hitelesítő paramétert nem adjuk tovább az alkalmazáslogikának. Így a
  // nagyobb ütemezési payload végét sem szennyezi meg az API-kulcs.
  String cleanQuery; int start = 0;
  while (start < query.length()) {
    int end = query.indexOf('&', start); if (end < 0) end = query.length();
    String item = query.substring(start, end);
    if (!item.startsWith("k=")) { if (cleanQuery.length()) cleanQuery += '&'; cleanQuery += item; }
    start = end + 1;
  }
  if (cleanQuery.length()) apiPath += "?" + cleanQuery;
  return true;
}
bool readRequestLine(WiFiClient& c, char* output, size_t outputSize) {
  size_t length = 0; const unsigned long started = millis();
  while (millis() - started < HTTP_READ_TIMEOUT) {
    if (!c.available()) { delay(1); continue; }
    char item = c.read();
    if (item == '\n') { output[length] = 0; return length > 0; }
    if (item == '\r') continue;
    if (length + 1 >= outputSize) return false;
    output[length++] = item;
  }
  return false;
}
bool drainHttpHeaders(WiFiClient& client) {
  bool lineHasData = false;
  const unsigned long started = millis();
  while (millis() - started < HTTP_READ_TIMEOUT) {
    if (!client.available()) { delay(1); continue; }
    const char value = static_cast<char>(client.read());
    if (value == '\n') {
      if (!lineHasData) return true;
      lineHasData = false;
    } else if (value != '\r') {
      lineHasData = true;
    }
  }
  return false;
}
void handleHttp() {
  uint8_t batch = 0;
  while (batch < HTTP_CLIENTS_PER_LOOP) {
    WiFiClient c = server.available();
    if (!c) break;
    batch++; httpRequests++;
    unsigned long started = millis();
    while (!c.available() && millis() - started < HTTP_FIRST_BYTE_TIMEOUT) delay(1);
    if (!c.available()) { httpTimeouts++; rememberHttpClient(c, "-", "-", true); c.stop(); continue; }

    char requestLine[256];
    if (!readRequestLine(c, requestLine, sizeof(requestLine))) { httpRejected++; c.stop(); continue; }
    String line(requestLine); line.trim();
    int a = line.indexOf(' '), b = line.indexOf(' ', a + 1);
    if (a >= 0 && b >= 0) {
      String method = line.substring(0, a), requestedPath = line.substring(a + 1, b), path;
      // A rossz útvonalú vagy kulcs nélküli kérésnél szándékosan nem olvassuk
      // el a fejléceket és nem küldünk választ. Ez védi a kevés RAM-ot.
      if ((method != "GET" && method != "POST") || !unwrapProtectedPath(requestedPath, path)) { httpRejected++; c.stop(); continue; }
      c.setTimeout(HTTP_READ_TIMEOUT);
      if (!drainHttpHeaders(c)) { httpTimeouts++; rememberHttpClient(c, method.c_str(), path, true); c.stop(); continue; }
      rememberHttpClient(c, method.c_str(), path);
      route(c, path);
    } else { httpRejected++; }
    // Rövid idő a WiFi modulnak a válasz továbbítására, majd azonnal jöhet a
    // következő várakozó kapcsolat.
    delay(8); c.stop();
  }
  if (batch > httpMaxBatch) httpMaxBatch = batch;
}
void setup() {
  Serial.begin(115200); delay(300);
  for (uint8_t i = 0; i < STRIP_COUNT; i++) {
    strip[i].begin(); strip[i].clear(); strip[i].show(); leds[i] = {false, 60, STATIC, 50, 0, 0, 255};
#if ENABLE_PIR_SENSORS
    pinMode(PIR_PINS[i], INPUT);
#endif
  }
#if ENABLE_PHYSICAL_BUTTONS
  pinMode(BUTTON_MODE, INPUT_PULLUP); pinMode(BUTTON_UP, INPUT_PULLUP); pinMode(BUTTON_DOWN, INPUT_PULLUP);
#endif
  matrix.begin(); showMatrix(MATRIX_BOOT);
  logEvent("success", "Arduino LED Controller Lite indul");
  char bootInfo[112];
  snprintf(bootInfo, sizeof(bootInfo), "Firmware: %s | Arduino UNO R4 WiFi | Matrix: BE", FIRMWARE_VERSION);
  logEvent("info", bootInfo);
  snprintf(bootInfo, sizeof(bootInfo), "LED szalagok: %d | PIR: %s | Gombok: %s", STRIP_COUNT, ENABLE_PIR_SENSORS ? "BE" : "KI", ENABLE_PHYSICAL_BUTTONS ? "BE" : "KI");
  logEvent("info", bootInfo);
  logEvent("info", ENABLE_PIR_SENSORS ? "PIR figyeles bekapcsolva" : "PIR figyeles kikapcsolva (nincs szenzor)");
  logEvent("info", ENABLE_PHYSICAL_BUTTONS ? "Fizikai gombok bekapcsolva" : "Fizikai gombok kikapcsolva");
  loadNetworkSettings();
  loadApiSettings();
  loadSchedules();
  connectWifi(); server.begin();
}
void loop() {
  if (!wifiHasAddress()) {
    wifiReported = false;
    if (millis() - lastWifi > WIFI_RETRY) { otaReady = false; connectWifi(); }
  }
  if (wifiHasAddress()) {
    startOta();
    reportWifiConnected();
    if (otaReady) ArduinoOTA.poll();
    if (millis() - lastTimeCheck > 60000 || !timeSynced) { lastTimeCheck = millis(); unsigned long epoch = WiFi.getTime(); if (epoch > 1700000000UL) { bool firstSync = !timeSynced; lastClockEpoch = epoch; lastClockMillis = millis(); timeSynced = true; if (firstSync) logEvent("success", "NTP ido szinkronizalva"); } }
    runArduinoSchedules();
  }
  handleHttp(); handlePir(); handleButtons(); renderAll();
}
