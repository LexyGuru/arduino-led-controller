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
#include "secrets.h"

#define FIRMWARE_VERSION "3.1.1"
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
enum Effect : uint8_t { STATIC = 0, BLINK, BREATHE, RAINBOW, CHASE };

struct Led { bool enabled; uint8_t brightness, effect, red, green, blue; };
struct Log { unsigned long timestamp; const char* type; char message[88]; };
struct NetworkSettings {
  uint32_t magic;
  uint16_t version;
  char ssid[33];
  char password[65];
  char otaPassword[65];
  uint32_t checksum;
};
Adafruit_NeoPixel strip[STRIP_COUNT] = {
  Adafruit_NeoPixel(PIXELS, LED_PINS[0], NEO_GRB + NEO_KHZ800),
  Adafruit_NeoPixel(PIXELS, LED_PINS[1], NEO_GRB + NEO_KHZ800),
  Adafruit_NeoPixel(PIXELS, LED_PINS[2], NEO_GRB + NEO_KHZ800)
};
WiFiServer server(80);
Led leds[STRIP_COUNT]; Log logs[50];
bool pirRaw[STRIP_COUNT] = {}, pirActive[STRIP_COUNT] = {}, otaReady = false, timeSynced = false, wifiReported = false;
unsigned long pirChanged[STRIP_COUNT] = {}, lastMotion[STRIP_COUNT] = {}, lastWifi = 0, lastFrame = 0, lastTimeCheck = 0;
uint8_t logStart = 0, logSize = 0;
NetworkSettings networkSettings = {};
bool networkSettingsStored = false;

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

void connectWifi() { if (WiFi.status() != WL_CONNECTED) { WiFi.begin(networkSettings.ssid, networkSettings.password); lastWifi = millis(); logEvent("info", "WiFi kapcsolodas inditva"); } }
void reportWifiConnected() {
  if (WiFi.status() != WL_CONNECTED) { wifiReported = false; return; }
  if (wifiReported) return;
  wifiReported = true;
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
  showOtaIndicator(0, 70, 255);
}
void otaBeforeApply() {
  logEvent("success", "OTA kesz - zold jelzes, ujrainditas");
  showOtaIndicator(0, 255, 60);
}
void otaTransferError(int code, const char*) {
  char message[88];
  snprintf(message, sizeof(message), "OTA hiba: %d - piros jelzes", code);
  logEvent("error", message);
  showOtaIndicator(255, 0, 0);
}
void startOta() {
  if (WiFi.status() == WL_CONNECTED && !otaReady) {
    ArduinoOTA.onStart(otaTransferStarted);
    ArduinoOTA.beforeApply(otaBeforeApply);
    ArduinoOTA.onError(otaTransferError);
    ArduinoOTA.begin(WiFi.localIP(), DEVICE_NAME, networkSettings.otaPassword, InternalStorage);
    otaReady = true; logEvent("success", "OTA frissites fogado szolgaltatas aktiv");
  }
}

uint32_t color(uint8_t i, float scale = 1.0f) { return strip[i].Color(leds[i].red * scale, leds[i].green * scale, leds[i].blue * scale); }
void render(uint8_t i) {
  if (!leds[i].enabled) { strip[i].clear(); strip[i].show(); return; }
  strip[i].setBrightness(leds[i].brightness);
  switch (leds[i].effect) {
    case BLINK: if ((millis() / 500) % 2 == 0) strip[i].fill(color(i)); else strip[i].clear(); break;
    case BREATHE: strip[i].fill(color(i, (sin(millis() / 900.0f) + 1.0f) / 2.0f)); break;
    case RAINBOW: for (uint16_t p = 0; p < strip[i].numPixels(); p++) strip[i].setPixelColor(p, strip[i].gamma32(strip[i].ColorHSV(((millis() / 20) + p * 65535UL / strip[i].numPixels()) & 0xffff))); break;
    case CHASE: { strip[i].clear(); int pos = (millis() / 90) % strip[i].numPixels(); for (int j = -3; j <= 3; j++) strip[i].setPixelColor((pos + j + strip[i].numPixels()) % strip[i].numPixels(), color(i, 1.0f - abs(j) / 4.0f)); break; }
    default: strip[i].fill(color(i)); break;
  }
  strip[i].show();
}
void renderAll(bool force = false) {
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
  String out = "{\"connected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",\"timesynced\":" + String(timeSynced ? "true" : "false");
  out += ",\"networkConfigStored\":" + String(networkSettingsStored ? "true" : "false");
  out += ",\"scheduler\":\"server\",\"firmwareVersion\":\"" FIRMWARE_VERSION "\",\"otaEnabled\":" + String(otaReady ? "true" : "false") + ",\"pirSensorsEnabled\":" + String(ENABLE_PIR_SENSORS ? "true" : "false") + ",\"physicalButtonsEnabled\":" + String(ENABLE_PHYSICAL_BUTTONS ? "true" : "false") + ",\"uptime\":" + String(millis() / 1000) + ",\"rssi\":" + String(WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0) + ",\"strips\":[";
  for (uint8_t i = 0; i < STRIP_COUNT; i++) { if (i) out += ','; out += "{\"id\":" + String(i + 1) + ",\"enabled\":" + String(leds[i].enabled ? "true" : "false") + ",\"brightness\":" + String(leds[i].brightness) + ",\"effect\":" + String(leds[i].effect) + ",\"color\":[" + String(leds[i].red) + ',' + String(leds[i].green) + ',' + String(leds[i].blue) + "]}"; }
  return out + "]}";
}
String logsJson() { String out = "["; for (uint8_t i = 0; i < logSize; i++) { if (i) out += ','; Log& e = logs[(logStart + i) % 50]; out += "{\"timestamp\":\"" + String(e.timestamp) + "s\",\"type\":\"" + e.type + "\",\"message\":\"" + escapeJson(e.message) + "\"}"; } return out + "]"; }
void sendJson(WiFiClient& c, const String& body, int code = 200) { c.print(code == 200 ? "HTTP/1.1 200 OK\r\n" : "HTTP/1.1 400 Bad Request\r\n"); c.print("Content-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\nContent-Length: "); c.print(body.length()); c.print("\r\n\r\n"); c.print(body); }
int valueInt(const String& query, const char* name, int fallback, int low, int high) { int from = query.indexOf(String(name) + '='); if (from < 0) return fallback; from += strlen(name) + 1; int to = query.indexOf('&', from); if (to < 0) to = query.length(); return constrain(query.substring(from, to).toInt(), low, high); }
bool valueBool(const String& query, const char* name, bool fallback) { int from = query.indexOf(String(name) + '='); if (from < 0) return fallback; from += strlen(name) + 1; int to = query.indexOf('&', from); if (to < 0) to = query.length(); String value = query.substring(from, to); return value == "1" || value == "true"; }

void updateLed(const String& path) {
  int question = path.indexOf('?'), end = question < 0 ? path.length() : question, id = path.substring(9, end).toInt(); if (id < 1 || id > STRIP_COUNT) return;
  Led& led = leds[id - 1]; String query = question < 0 ? "" : path.substring(question + 1);
  led.enabled = valueBool(query, "enabled", led.enabled); led.brightness = valueInt(query, "brightness", led.brightness, 0, 255); led.effect = valueInt(query, "effect", led.effect, 0, 4);
  int colorAt = query.indexOf("color="); if (colorAt >= 0) { String raw = query.substring(colorAt + 6); int stop = raw.indexOf('&'); if (stop >= 0) raw = raw.substring(0, stop); int a = raw.indexOf(','), b = raw.indexOf(',', a + 1); if (a >= 0 && b >= 0) { led.red = constrain(raw.substring(0, a).toInt(), 0, 255); led.green = constrain(raw.substring(a + 1, b).toInt(), 0, 255); led.blue = constrain(raw.substring(b + 1).toInt(), 0, 255); } }
  logEvent("info", "LED beallitas modositva"); renderAll(true);
}
void route(WiFiClient& c, const String& path) {
  if (path == "/api/status" || path == "/api/led/status") { sendJson(c, statusJson()); return; }
  if (path == "/api/console/logs") { sendJson(c, logsJson()); return; }
  if (path == "/api/console/stats") { String body = "{\"logCount\":" + String(logSize) + ",\"uptime\":" + String(millis() / 1000) + ",\"wifiSignal\":" + String(WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0) + ",\"system\":{\"wifiConnected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",\"consoleActive\":true}}"; sendJson(c, body); return; }
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
    strip[i].begin(); strip[i].clear(); strip[i].show(); leds[i] = {false, 60, STATIC, 0, 0, 255};
#if ENABLE_PIR_SENSORS
    pinMode(PIR_PINS[i], INPUT);
#endif
  }
#if ENABLE_PHYSICAL_BUTTONS
  pinMode(BUTTON_MODE, INPUT_PULLUP); pinMode(BUTTON_UP, INPUT_PULLUP); pinMode(BUTTON_DOWN, INPUT_PULLUP);
#endif
  logEvent("success", "Arduino LED Controller Lite indul");
  logEvent("info", ENABLE_PIR_SENSORS ? "PIR figyeles bekapcsolva" : "PIR figyeles kikapcsolva (nincs szenzor)");
  logEvent("info", ENABLE_PHYSICAL_BUTTONS ? "Fizikai gombok bekapcsolva" : "Fizikai gombok kikapcsolva");
  loadNetworkSettings();
  connectWifi(); server.begin();
}
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiReported = false;
    if (millis() - lastWifi > WIFI_RETRY) { otaReady = false; connectWifi(); }
  }
  if (WiFi.status() == WL_CONNECTED) {
    reportWifiConnected();
    startOta(); ArduinoOTA.poll();
    if (millis() - lastTimeCheck > 60000) { lastTimeCheck = millis(); timeSynced = WiFi.getTime() > 0; }
  }
  handleHttp(); handlePir(); handleButtons(); renderAll();
}
