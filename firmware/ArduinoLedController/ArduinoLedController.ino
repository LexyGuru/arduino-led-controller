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
#include "secrets.h"

#define FIRMWARE_VERSION "4.0.0"
#define DEVICE_NAME "arduino-led-controller"
#ifndef ENABLE_PIR_SENSORS
#define ENABLE_PIR_SENSORS 0
#endif
#ifndef ENABLE_PHYSICAL_BUTTONS
#define ENABLE_PHYSICAL_BUTTONS 0
#endif
constexpr uint8_t STRIP_COUNT = 3;
constexpr uint16_t PIXELS = 300;
constexpr uint8_t LED_PINS[STRIP_COUNT] = {6, 7, 8};
constexpr uint8_t PIR_PINS[STRIP_COUNT] = {2, 3, 4};
constexpr uint8_t BUTTON_MODE = A0, BUTTON_UP = A1, BUTTON_DOWN = A2;
constexpr unsigned long PIR_TIMEOUT = 60000, PIR_DEBOUNCE = 200, WIFI_RETRY = 15000, EFFECT_FRAME = 50;
constexpr uint32_t NETWORK_SETTINGS_MAGIC = 0x4C454431UL; // "LED1"
constexpr uint16_t NETWORK_SETTINGS_VERSION = 1;
constexpr uint16_t SCHEDULE_EEPROM_OFFSET = 256;
constexpr uint8_t SCHEDULE_MAX = 60;
constexpr uint32_t SCHEDULE_MAGIC = 0x53434831UL; // "SCH1"
enum Effect : uint8_t { STATIC = 0, BLINK, BREATHE, RAINBOW, CHASE };

struct Led { bool enabled; uint8_t brightness, effect, speed, red, green, blue; };
struct Log { unsigned long timestamp; const char* type; char message[88]; };
struct NetworkSettings {
  uint32_t magic;
  uint16_t version;
  char ssid[33];
  char password[65];
  char otaPassword[65];
  uint32_t checksum;
};
struct __attribute__((packed)) StoredLed { uint8_t apply, enabled, brightness, effect, speed, red, green, blue; };
struct __attribute__((packed)) StoredSchedule { uint8_t day, hour, minute; StoredLed leds[STRIP_COUNT]; };
struct __attribute__((packed)) ScheduleHeader { uint32_t magic; uint8_t version, count; uint32_t checksum; };
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
WiFiServer server(80);
Led leds[STRIP_COUNT]; Log logs[50];
bool pirRaw[STRIP_COUNT] = {}, pirActive[STRIP_COUNT] = {}, otaReady = false, timeSynced = false, wifiReported = false;
unsigned long pirChanged[STRIP_COUNT] = {}, lastMotion[STRIP_COUNT] = {}, lastWifi = 0, lastFrame = 0, lastTimeCheck = 0;
uint8_t logStart = 0, logSize = 0;
NetworkSettings networkSettings = {};
bool networkSettingsStored = false;
StoredSchedule schedules[SCHEDULE_MAX] = {};
uint8_t scheduleCount = 0;
bool schedulesStored = false;
unsigned long lastClockEpoch = 0, lastClockMillis = 0, lastScheduleMinute = 0xFFFFFFFFUL;

void renderAll(bool force = false);

void showMatrix(uint8_t frame[8][12]) { matrix.renderBitmap(frame, 8, 12); }

void logEvent(const char* type, const char* message) {
  uint8_t position = (logStart + logSize) % 50;
  if (logSize == 50) logStart = (logStart + 1) % 50; else logSize++;
  logs[position].timestamp = millis() / 1000; logs[position].type = type;
  strncpy(logs[position].message, message, sizeof(logs[position].message) - 1);
  logs[position].message[sizeof(logs[position].message) - 1] = 0;
  Serial.print('['); Serial.print(type); Serial.print("] "); Serial.println(message);
}

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
  return !value || !value[0] || strcmp(value, "YOUR_WIFI_NAME") == 0 || strcmp(value, "YOUR_WIFI_PASSWORD") == 0 || strcmp(value, "CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD") == 0;
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
void runArduinoSchedules() {
  uint8_t day, hour, minute; if (!localScheduleTime(day, hour, minute)) return;
  unsigned long key = (lastClockEpoch + (millis() - lastClockMillis) / 1000) / 60; if (key == lastScheduleMinute) return; lastScheduleMinute = key;
  for (uint8_t s = 0; s < scheduleCount; s++) if (schedules[s].day == day && schedules[s].hour == hour && schedules[s].minute == minute) {
    for (uint8_t i = 0; i < STRIP_COUNT; i++) { StoredLed& source = schedules[s].leds[i]; if (!source.apply) continue; leds[i] = { source.enabled != 0, source.brightness, source.effect, source.speed, source.red, source.green, source.blue }; }
    char message[72]; snprintf(message, sizeof(message), "Arduino idozites lefutott: %d %02d:%02d", day, hour, minute); logEvent("success", message); renderAll(true);
  }
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
  char message[88];
  snprintf(message, sizeof(message), "WiFi kesz: %u.%u.%u.%u, jel: %d dBm", ip[0], ip[1], ip[2], ip[3], WiFi.RSSI());
  logEvent("success", message);
  Serial.println("==========================================");
  Serial.print("Eszkoz: "); Serial.println(DEVICE_NAME);
  Serial.print("Firmware: "); Serial.println(FIRMWARE_VERSION);
  Serial.print("WiFi modul firmware: "); Serial.println(WiFi.firmwareVersion());
  Serial.print("IP cim: "); Serial.println(ip);
  Serial.print("Jelerosseg: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
  Serial.print("PIR figyeles: "); Serial.println(ENABLE_PIR_SENSORS ? "BE" : "KI (nincs szenzor)");
  Serial.print("Fizikai gombok: "); Serial.println(ENABLE_PHYSICAL_BUTTONS ? "BE" : "KI");
  Serial.println("Web API: http://<IP>/api/status");
  Serial.println("==========================================");
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
  if (wifiHasAddress() && !otaReady) {
    ArduinoOTA.onStart(otaTransferStarted);
    ArduinoOTA.beforeApply(otaBeforeApply);
    ArduinoOTA.onError(otaTransferError);
    ArduinoOTA.begin(WiFi.localIP(), DEVICE_NAME, networkSettings.otaPassword, InternalStorage);
    otaReady = true; logEvent("success", "OTA frissites fogado szolgaltatas aktiv (3232 port)");
  }
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

String escapeJson(const char* source) { String out; while (*source) { if (*source == '"' || *source == '\\') out += '\\'; out += *source++; } return out; }
String statusJson() {
  String out = "{\"connected\":" + String(wifiHasAddress() ? "true" : "false") + ",\"timesynced\":" + String(timeSynced ? "true" : "false");
  out += ",\"networkConfigStored\":" + String(networkSettingsStored ? "true" : "false");
  out += ",\"scheduler\":\"arduino-eeprom\",\"scheduleCount\":" + String(scheduleCount) + ",\"firmwareVersion\":\"" FIRMWARE_VERSION "\",\"otaEnabled\":" + String(otaReady ? "true" : "false") + ",\"matrixEnabled\":true,\"pirSensorsEnabled\":" + String(ENABLE_PIR_SENSORS ? "true" : "false") + ",\"physicalButtonsEnabled\":" + String(ENABLE_PHYSICAL_BUTTONS ? "true" : "false") + ",\"uptime\":" + String(millis() / 1000) + ",\"rssi\":" + String(wifiHasAddress() ? WiFi.RSSI() : 0) + ",\"strips\":[";
  for (uint8_t i = 0; i < STRIP_COUNT; i++) { if (i) out += ','; out += "{\"id\":" + String(i + 1) + ",\"enabled\":" + String(leds[i].enabled ? "true" : "false") + ",\"brightness\":" + String(leds[i].brightness) + ",\"effect\":" + String(leds[i].effect) + ",\"speed\":" + String(leds[i].speed) + ",\"color\":[" + String(leds[i].red) + ',' + String(leds[i].green) + ',' + String(leds[i].blue) + "]}"; }
  return out + "]}";
}
String logsJson() { String out = "["; for (uint8_t i = 0; i < logSize; i++) { if (i) out += ','; Log& e = logs[(logStart + i) % 50]; out += "{\"timestamp\":\"" + String(e.timestamp) + "s\",\"type\":\"" + e.type + "\",\"message\":\"" + escapeJson(e.message) + "\"}"; } return out + "]"; }
void sendJson(WiFiClient& c, const String& body, int code = 200) { c.print(code == 200 ? "HTTP/1.1 200 OK\r\n" : "HTTP/1.1 400 Bad Request\r\n"); c.print("Content-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\nContent-Length: "); c.print(body.length()); c.print("\r\n\r\n"); c.print(body); }
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
  if (base == "/api/schedules/upload") { String payload = queryAt < 0 ? "" : path.substring(queryAt + 1); if (!payload.startsWith("payload=")) { sendJson(c, "{\"error\":\"Hianyzik a payload\"}", 400); return; } if (!importSchedulesHex(payload.substring(8))) { sendJson(c, "{\"error\":\"Ervenytelen idozitesi adat\"}", 400); return; } char message[64]; snprintf(message, sizeof(message), "Arduino idozites mentve: %d bejegyzes", scheduleCount); logEvent("success", message); sendJson(c, "{\"success\":true,\"count\":" + String(scheduleCount) + "}"); return; }
  if (base == "/api/schedules/chunk") { String query = queryAt < 0 ? "" : path.substring(queryAt + 1); int index = valueInt(query, "index", -1, -1, SCHEDULE_MAX - 1), total = valueInt(query, "total", 0, 0, SCHEDULE_MAX); int payloadAt = query.indexOf("payload="); if (index < 0 || total < 1 || index >= total || payloadAt < 0 || !decodeScheduleHex(query.substring(payloadAt + 8), schedules[index])) { sendJson(c, "{\"error\":\"Ervenytelen idozitesi reszlet\"}", 400); return; } if (index + 1 == total) { saveSchedules(total); char message[64]; snprintf(message, sizeof(message), "Arduino idozites mentve: %d bejegyzes", scheduleCount); logEvent("success", message); } sendJson(c, "{\"success\":true,\"count\":" + String(index + 1 == total ? scheduleCount : 0) + "}"); return; }
  if (base == "/api/schedules/clear") { memset(schedules, 0, sizeof(schedules)); saveSchedules(0); logEvent("info", "Arduino idozites torolve"); sendJson(c, "{\"success\":true}"); return; }
  if (path == "/api/status" || path == "/api/led/status") { sendJson(c, statusJson()); return; }
  if (path == "/api/console/logs") { sendJson(c, logsJson()); return; }
  if (path == "/api/console/stats") { String body = "{\"logCount\":" + String(logSize) + ",\"uptime\":" + String(millis() / 1000) + ",\"wifiSignal\":" + String(wifiHasAddress() ? WiFi.RSSI() : 0) + ",\"system\":{\"wifiConnected\":" + String(wifiHasAddress() ? "true" : "false") + ",\"consoleActive\":true}}"; sendJson(c, body); return; }
  if (path == "/api/console/clear") { logStart = 0; logSize = 0; sendJson(c, "{\"success\":true}"); return; }
  if (path == "/api/all-on" || path == "/api/all-off") { bool state = path == "/api/all-on"; for (uint8_t i = 0; i < STRIP_COUNT; i++) leds[i].enabled = state; logEvent("info", state ? "Minden LED bekapcsolva" : "Minden LED kikapcsolva"); renderAll(true); sendJson(c, statusJson()); return; }
  if (path.startsWith("/api/led/")) { updateLed(path); sendJson(c, statusJson()); return; }
  sendJson(c, "{\"error\":\"Ismeretlen API vegpont\"}", 400);
}
void handleHttp() {
  WiFiClient c = server.available(); if (!c) return; unsigned long started = millis(); while (c.connected() && !c.available() && millis() - started < 1500) delay(1); if (!c.available()) { c.stop(); return; }
  String line = c.readStringUntil('\n'); line.trim(); while (c.available()) { String header = c.readStringUntil('\n'); if (header == "\r" || header.length() == 0) break; }
  int a = line.indexOf(' '), b = line.indexOf(' ', a + 1); if (a < 0 || b < 0) { c.stop(); return; } String method = line.substring(0, a), path = line.substring(a + 1, b);
  if (method == "OPTIONS") c.print("HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET,POST,OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nConnection: close\r\n\r\n"); else if (method == "GET" || method == "POST") route(c, path); else sendJson(c, "{\"error\":\"Nem tamogatott metodus\"}", 400);
  delay(20); c.stop();
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
  loadSchedules();
  connectWifi(); server.begin();
}
void loop() {
  if (!wifiHasAddress()) {
    wifiReported = false;
    if (millis() - lastWifi > WIFI_RETRY) { otaReady = false; connectWifi(); }
  }
  if (wifiHasAddress()) {
    reportWifiConnected();
    startOta(); ArduinoOTA.poll();
    if (millis() - lastTimeCheck > 60000 || !timeSynced) { lastTimeCheck = millis(); unsigned long epoch = WiFi.getTime(); if (epoch > 1700000000UL) { bool firstSync = !timeSynced; lastClockEpoch = epoch; lastClockMillis = millis(); timeSynced = true; if (firstSync) logEvent("success", "NTP ido szinkronizalva"); } }
    runArduinoSchedules();
  }
  handleHttp(); handlePir(); handleButtons(); renderAll();
}
