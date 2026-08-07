/*
 * Arduino LED Controller – 4.3.0-beta.6
 * F14 Complete: Direct API v1, JSON body, header-only auth, A/B EEPROM és
 * tranzakciós schedule. A Tauri újratervezésének stabil firmware-alapja.
 */
#include <WiFiS3.h>
#include <WiFiUdp.h>
#include <Adafruit_NeoPixel.h>
#define NO_OTA_PORT
#include <ArduinoOTA.h>
#include <EEPROM.h>
#include <Arduino_LED_Matrix.h>
#include <time.h>
#include <stdarg.h>
#include "secrets.h"

#define FIRMWARE_VERSION "5.0.0-beta.6"
#define FIRMWARE_FEATURE "f14-direct-api-v1-only-storage-udp-ntp-dst-ota-exclusive"
#define OTA_MAINTENANCE_MODE_V1 1
#define DIRECT_API_VERSION "1.0.0"
#define DEVICE_NAME "arduino-led-controller"
#define API_DEVICE_KEY_HEADER "X-Device-Key"

#ifndef API_SHARED_SECRET
#define API_SHARED_SECRET "CHANGE_THIS_TO_A_LONG_RANDOM_API_SECRET"
#endif
#ifndef API_PRIVATE_PATH
#define API_PRIVATE_PATH "/CHANGE_THIS_TO_A_LONG_RANDOM_API_PATH"
#endif
#ifdef API_ALLOW_QUERY_KEY_FALLBACK
#undef API_ALLOW_QUERY_KEY_FALLBACK
#endif
#define API_ALLOW_QUERY_KEY_FALLBACK 0
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
constexpr uint8_t SCHEDULE_MAX = 60;
constexpr uint16_t SCHEDULE_EEPROM_OFFSET = 256;
constexpr uint16_t API_SETTINGS_EEPROM_OFFSET = 2300;
constexpr uint16_t TIME_SETTINGS_EEPROM_OFFSET = 4608;
// F14 Complete A/B storage layout (UNO R4 WiFi 8192-byte EEPROM).
constexpr uint16_t CONFIG_SLOT_A_OFFSET = 0;
constexpr uint16_t CONFIG_SLOT_B_OFFSET = 384;
constexpr uint16_t SCHEDULE_SLOT_A_OFFSET = 768;
constexpr uint16_t SCHEDULE_SLOT_B_OFFSET = 2560;
constexpr uint16_t CONFIG_SLOT_SIZE = 384;
constexpr uint16_t SCHEDULE_SLOT_SIZE = 1792;
constexpr uint32_t CONFIG_SLOT_MAGIC = 0x43464732UL; // CFG2
constexpr uint32_t SCHEDULE_SLOT_MAGIC_V2 = 0x53434832UL; // SCH2
constexpr uint16_t STORAGE_SCHEMA_VERSION = 2;
constexpr uint8_t SLOT_STATE_EMPTY = 0;
constexpr uint8_t SLOT_STATE_WRITING = 1;
constexpr uint8_t SLOT_STATE_VALID = 2;
constexpr uint32_t NETWORK_SETTINGS_MAGIC = 0x4C454431UL;
constexpr uint16_t NETWORK_SETTINGS_VERSION = 1;
constexpr uint32_t API_SETTINGS_MAGIC = 0x41504931UL;
constexpr uint16_t API_SETTINGS_VERSION = 1;
constexpr uint32_t TIME_SETTINGS_MAGIC = 0x54494D31UL;
constexpr uint16_t TIME_SETTINGS_VERSION = 1;
constexpr uint32_t SCHEDULE_MAGIC = 0x53434831UL;
constexpr uint16_t MINUTES_PER_WEEK = 10080U;
constexpr uint32_t MANUAL_OVERRIDE_INDEFINITE = 0xFFFFFFFFUL;
constexpr unsigned long MANUAL_OVERRIDE_UNSYNCED_MAX_MS = 15UL * 60UL * 1000UL;
constexpr unsigned long NTP_SYNC_INTERVAL_MS = 6UL * 60UL * 60UL * 1000UL;
constexpr unsigned long NTP_INITIAL_RETRY_INTERVAL_MS = 30000UL;
constexpr unsigned long NTP_UDP_TIMEOUT_MS = 2500UL;
constexpr uint16_t NTP_LOCAL_PORT = 2391;
constexpr uint16_t NTP_REMOTE_PORT = 123;
constexpr uint32_t NTP_UNIX_OFFSET = 2208988800UL;
constexpr unsigned long NTP_VALID_EPOCH_MIN = 1700000000UL;
constexpr uint8_t HTTP_CLIENTS_PER_LOOP = 1;
constexpr uint8_t LOG_CAPACITY = 12;
constexpr uint8_t CONSOLE_LOGS_PER_RESPONSE = 8;
constexpr size_t HTTP_BODY_BUFFER_SIZE = 2560;
constexpr size_t HTTP_RESPONSE_HEADER_SIZE = 192;
constexpr size_t HTTP_WRITE_CHUNK_SIZE = 512;
constexpr unsigned long HTTP_WRITE_INTER_CHUNK_DELAY_MS = 1UL;
constexpr size_t HTTP_REQUEST_LINE_SIZE = 256;
constexpr size_t HTTP_HEADER_LINE_SIZE = 192;
constexpr size_t SERIAL_COMMAND_SIZE = 160;
constexpr unsigned long PIR_TIMEOUT = 60000UL;
constexpr unsigned long PIR_DEBOUNCE = 200UL;
constexpr unsigned long WIFI_RETRY = 15000UL;
constexpr unsigned long EFFECT_FRAME = 50UL;
constexpr unsigned long SCHEDULE_AUDIT_INTERVAL = 30000UL;
constexpr unsigned long HTTP_FIRST_BYTE_TIMEOUT = 200UL;
constexpr unsigned long HTTP_READ_TIMEOUT = 350UL;
constexpr unsigned long HTTP_RESPONSE_SETTLE_DELAY_MS = 8UL;
constexpr unsigned long HTTP_POLLING_SUMMARY_INTERVAL = 30000UL;
constexpr unsigned long HTTP_TRACE_MAX_TIME = 600000UL;
constexpr unsigned long WIFI_LINK_PROBE_INTERVAL_MS = 15000UL;
constexpr unsigned long WIFI_RSSI_REFRESH_INTERVAL_MS = 30000UL;
constexpr unsigned long NTP_UNSYNCED_RETRY_INTERVAL_MS = NTP_INITIAL_RETRY_INTERVAL_MS;
constexpr unsigned long OTA_PREPARE_WINDOW = 30000UL;
constexpr unsigned long OTA_ERROR_INDICATOR_TIME = 5000UL;
constexpr unsigned long REMOTE_REBOOT_DELAY_MS = 750UL;

enum Effect : uint8_t { STATIC = 0, BLINK, BREATHE, RAINBOW, CHASE };
enum HttpHeaderReadResult : uint8_t {
  HTTP_HEADERS_OK = 0, HTTP_HEADERS_TIMEOUT, HTTP_HEADERS_INVALID,
  HTTP_HEADERS_DUPLICATE_DEVICE_KEY
};
enum HttpAuthResult : uint8_t {
  HTTP_AUTH_OK_HEADER = 0, HTTP_AUTH_OK_QUERY_FALLBACK, HTTP_AUTH_MISSING,
  HTTP_AUTH_INVALID, HTTP_AUTH_PATH_REJECTED, HTTP_AUTH_HEADER_INVALID
};

struct Led {
  bool enabled;
  uint8_t brightness, effect, speed, red, green, blue;
};
struct Log {
  uint32_t id;
  unsigned long timestamp;
  char type[12];
  char message[80];
};
struct NetworkSettings {
  uint32_t magic;
  uint16_t version;
  char ssid[33], password[65], otaPassword[65];
  uint32_t checksum;
};
struct ApiSettings {
  uint32_t magic;
  uint16_t version;
  char privatePath[49], sharedSecret[65];
  uint32_t checksum;
};
struct TimeSettings {
  uint32_t magic;
  uint16_t version;
  char timezoneId[48];
  int16_t currentUtcOffsetMinutes;
  uint32_t nextTransitionEpoch;
  int16_t nextUtcOffsetMinutes;
  uint32_t checksum;
};
struct __attribute__((packed)) StoredLed {
  uint8_t apply, enabled, brightness, effect, speed, red, green, blue;
};
struct __attribute__((packed)) StoredSchedule {
  uint8_t day, hour, minute;
  StoredLed leds[STRIP_COUNT];
};
struct __attribute__((packed)) ScheduleHeader {
  uint32_t magic;
  uint8_t version, count;
  uint32_t checksum;
};
struct __attribute__((packed)) StorageSlotHeader {
  uint32_t magic;
  uint16_t schemaVersion;
  uint16_t payloadLength;
  uint32_t generation;
  uint32_t checksum;
  uint8_t state;
  uint8_t count;
  uint8_t reserved[6];
};
struct __attribute__((packed)) ConfigPayload {
  NetworkSettings network;
  ApiSettings api;
};
static_assert(sizeof(StorageSlotHeader) == 24, "StorageSlotHeader layout changed");
static_assert(sizeof(ConfigPayload) + sizeof(StorageSlotHeader) <= CONFIG_SLOT_SIZE,
  "Config A/B slot too small");
static_assert(sizeof(StoredSchedule) * SCHEDULE_MAX + sizeof(StorageSlotHeader) <= SCHEDULE_SLOT_SIZE,
  "Schedule A/B slot too small");
static_assert(sizeof(StoredLed) == 8, "StoredLed EEPROM layout changed");
static_assert(sizeof(StoredSchedule) == 27, "StoredSchedule EEPROM layout changed");
static_assert(sizeof(ScheduleHeader) == 10, "ScheduleHeader EEPROM layout changed");
static_assert(LOG_CAPACITY <= 32, "F14.1 RAM log capacity is too large");
static_assert(HTTP_BODY_BUFFER_SIZE <= 2560, "F14.1 HTTP buffer is too large");
static_assert(HTTP_WRITE_CHUNK_SIZE <= 512, "UNO R4 WiFi response chunk is too large");
struct FixedBuffer {
  char* data;
  size_t capacity, length;
  bool valid;
};
struct HttpRequestContext {
  uint32_t requestId;
  unsigned long startedAt;
  char clientIp[16], method[8], path[96];
  HttpAuthResult authResult;
  int responseCode;
  bool polling;
};

void resetBuffer(FixedBuffer&, char*, size_t);
bool appendRaw(FixedBuffer&, const char*);
bool appendChar(FixedBuffer&, char);
bool appendFormat(FixedBuffer&, const char*, ...);
bool appendJsonEscaped(FixedBuffer&, const char*);
void renderAll(bool force = false);
void refreshManualOverrideDeadlines();
void printConnectionBlock();
void rebootDevice();
void processPendingRemoteReboot();

Adafruit_NeoPixel strip[STRIP_COUNT] = {
  Adafruit_NeoPixel(PIXELS, LED_PINS[0], NEO_GRB + NEO_KHZ800),
  Adafruit_NeoPixel(PIXELS, LED_PINS[1], NEO_GRB + NEO_KHZ800),
  Adafruit_NeoPixel(PIXELS, LED_PINS[2], NEO_GRB + NEO_KHZ800)
};
ArduinoLEDMatrix matrix;
WiFiServer server(HTTP_API_PORT);
WiFiUDP ntpUdp;

uint8_t MATRIX_BOOT[8][12] = {
 {0,0,0,0,1,1,1,1,0,0,0,0},{0,0,0,1,0,0,0,0,1,0,0,0},
 {0,0,1,0,1,0,0,1,0,1,0,0},{0,1,0,0,0,1,1,0,0,0,1,0},
 {0,1,0,0,0,1,1,0,0,0,1,0},{0,0,1,0,1,0,0,1,0,1,0,0},
 {0,0,0,1,0,0,0,0,1,0,0,0},{0,0,0,0,1,1,1,1,0,0,0,0}
};
uint8_t MATRIX_WIFI[8][12] = {
 {0,0,0,0,0,1,1,0,0,0,0,0},{0,0,0,1,1,0,0,1,1,0,0,0},
 {0,0,1,0,0,0,0,0,0,1,0,0},{0,1,0,0,1,1,1,1,0,0,1,0},
 {1,0,0,1,0,0,0,0,1,0,0,1},{0,0,0,0,0,1,1,0,0,0,0,0},
 {0,0,0,0,1,0,0,1,0,0,0,0},{0,0,0,0,0,1,1,0,0,0,0,0}
};
uint8_t MATRIX_OK[8][12] = {
 {0,0,0,0,0,0,0,0,0,0,0,0},{0,0,0,0,0,0,0,0,0,0,1,0},
 {0,0,0,0,0,0,0,0,0,1,0,0},{0,0,0,0,0,0,0,0,1,0,0,0},
 {1,0,0,0,0,0,0,1,0,0,0,0},{0,1,0,0,0,0,1,0,0,0,0,0},
 {0,0,1,0,0,1,0,0,0,0,0,0},{0,0,0,1,1,0,0,0,0,0,0,0}
};
uint8_t MATRIX_OTA[8][12] = {
 {0,0,0,0,0,1,1,0,0,0,0,0},{0,0,0,0,1,1,1,1,0,0,0,0},
 {0,0,0,1,1,0,0,1,1,0,0,0},{0,0,1,1,1,0,0,1,1,1,0,0},
 {0,0,0,0,1,1,1,1,0,0,0,0},{0,0,0,0,0,1,1,0,0,0,0,0},
 {0,0,0,0,0,1,1,0,0,0,0,0},{0,0,0,0,0,1,1,0,0,0,0,0}
};
uint8_t MATRIX_ERROR[8][12] = {
 {1,0,0,0,0,0,0,0,0,0,0,1},{0,1,0,0,0,0,0,0,0,0,1,0},
 {0,0,1,0,0,0,0,0,0,1,0,0},{0,0,0,1,0,0,0,0,1,0,0,0},
 {0,0,0,0,1,0,0,1,0,0,0,0},{0,0,0,0,1,0,0,1,0,0,0,0},
 {0,0,0,1,0,0,0,0,1,0,0,0},{0,0,1,0,0,0,0,0,0,1,0,0}
};

Led leds[STRIP_COUNT];
Log logs[LOG_CAPACITY];
NetworkSettings networkSettings = {};
ApiSettings apiSettings = {};
TimeSettings timeSettings = {};
bool timeSettingsStored = false;
char ntpLastServer[48] = "";
uint8_t ntpLastServerIndex = 0;
const char* NTP_SERVERS[] = {
  "0.europe.pool.ntp.org",
  "1.europe.pool.ntp.org",
  "time.cloudflare.com",
  "time.google.com",
  "time.apple.com",
  "pool.ntp.org",
  "0.pool.ntp.org",
  "1.pool.ntp.org"
};
constexpr uint8_t NTP_SERVER_COUNT = sizeof(NTP_SERVERS) / sizeof(NTP_SERVERS[0]);
StoredSchedule schedules[SCHEDULE_MAX] = {};
bool networkSettingsStored = false, apiSettingsStored = false;
bool schedulesStored = false, otaReady = false, otaTransferActive = false, otaExclusiveMode = false;
bool timeSynced = false, wifiReported = false, cachedWifiConnected = false;
bool pirRaw[STRIP_COUNT] = {}, pirActive[STRIP_COUNT] = {};
bool manualOverride[STRIP_COUNT] = {}, httpTraceEnabled = false;
IPAddress cachedWifiIp(0,0,0,0);
long cachedWifiRssi = 0;
uint8_t logStart = 0, logSize = 0, scheduleCount = 0, httpMaxBatch = 0;
uint32_t nextLogId = 1, nextHttpRequestId = 1, bootId = 0;
uint32_t deviceKeyFingerprint = 0, scheduleRevision = 0;
uint32_t configGeneration = 0;
uint16_t activeConfigSlotOffset = 0, activeScheduleSlotOffset = 0;
bool legacyStorageMigrated = false;
bool scheduleTransactionActive = false;
uint32_t scheduleTransactionId = 0, scheduleTransactionGeneration = 0;
uint32_t scheduleTransactionExpectedRevision = 0;
uint16_t scheduleTransactionSlotOffset = 0;
uint8_t scheduleTransactionTotal = 0;
uint64_t scheduleTransactionReceivedMask = 0;
bool remoteRebootPending = false;
unsigned long remoteRebootAt = 0;
unsigned long httpRequests = 0, httpTimeouts = 0, httpRejected = 0;
unsigned long httpWriteFailures = 0, httpHeaderAuthAccepted = 0;
unsigned long httpQueryFallbackAccepted = 0, httpSuccessResponses = 0;
unsigned long httpClientErrorResponses = 0, httpServerErrorResponses = 0;
unsigned long httpPollingRequests = 0, httpPollingSuccess = 0;
unsigned long httpPollingErrors = 0, httpPollingTotalDuration = 0;
unsigned long httpSummaryStartedAt = 0, httpTraceStartedAt = 0;
unsigned long otaRestartCount = 0, lastOtaRestartAt = 0;
unsigned long otaPrepareUntil = 0, otaErrorIndicatorUntil = 0;
unsigned long otaLastTransferStartedAt = 0, otaLastErrorAt = 0;
int otaLastErrorCode = 0;
unsigned long lastWifiLinkProbe = 0, lastWifiRssiRefresh = 0, lastWifi = 0;
unsigned long lastFrame = 0, lastTimeCheck = 0, lastClockEpoch = 0;
unsigned long lastClockMillis = 0, lastScheduleMinute = 0xFFFFFFFFUL;
unsigned long lastScheduleAudit = 0, pirChanged[STRIP_COUNT] = {};
unsigned long ntpAttemptCount = 0, ntpFailureCount = 0, ntpSuccessCount = 0;
unsigned long ntpLastSuccessAt = 0, ntpLastFailureAt = 0;
unsigned long schedulerLastRunAt = 0, schedulerLastAppliedAt = 0;
bool clockWifiWasAvailable = false, ntpUdpActive = false;
unsigned long lastMotion[STRIP_COUNT] = {};
uint32_t manualOverrideUntilMinute[STRIP_COUNT] = {};
unsigned long manualOverrideFallbackUntilMillis[STRIP_COUNT] = {};
int16_t schedulerLastSelectedIndex[STRIP_COUNT] = {-1, -1, -1};
uint8_t schedulerLastBlockedReason[STRIP_COUNT] = {};
char deviceId[20] = "ALC-UNKNOWN", lastHttpClientIp[16] = "-";
char lastHttpPath[96] = "-", lastHttpMethod[8] = "-", lastHttpAuth[24] = "-";
int lastHttpResponseCode = 0;
unsigned long lastHttpDurationMs = 0, lastHttpClientAt = 0;
char httpBodyBuffer[HTTP_BODY_BUFFER_SIZE] = {};
char httpHeaderBuffer[HTTP_RESPONSE_HEADER_SIZE] = {};
char serialCommandBuffer[SERIAL_COMMAND_SIZE] = {};
size_t serialCommandLength = 0;
size_t currentContentLength = 0;
bool currentContentTypeJson = false;

void showMatrix(uint8_t frame[8][12]) { matrix.renderBitmap(frame, 8, 12); }
void copyText(char* target, size_t size, const char* source) {
  if (!target || !size) return;
  strncpy(target, source ? source : "", size - 1);
  target[size - 1] = 0;
}
uint32_t fnv1a(const uint8_t* data, size_t length) {
  uint32_t value = 2166136261UL;
  for (size_t i = 0; i < length; i++) value = (value ^ data[i]) * 16777619UL;
  return value;
}
uint32_t fnv1aText(const char* value) {
  return value ? fnv1a(reinterpret_cast<const uint8_t*>(value), strlen(value)) : 0;
}
void fingerprintText(uint32_t value, char* output, size_t size) {
  snprintf(output, size, "%04lX-%04lX",
    static_cast<unsigned long>((value >> 16) & 0xFFFFUL),
    static_cast<unsigned long>(value & 0xFFFFUL));
}
void ipToText(const IPAddress& ip, char* output, size_t size) {
  snprintf(output, size, "%u.%u.%u.%u", ip[0], ip[1], ip[2], ip[3]);
}
bool isPlaceholder(const char* value) {
  return !value || !value[0] ||
    strcmp(value, "YOUR_WIFI_NAME") == 0 ||
    strcmp(value, "YOUR_WIFI_PASSWORD") == 0 ||
    strcmp(value, "CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD") == 0 ||
    strcmp(value, "CHANGE_THIS_TO_A_LONG_RANDOM_API_SECRET") == 0 ||
    strcmp(value, "/CHANGE_THIS_TO_A_LONG_RANDOM_API_PATH") == 0;
}
void resetBuffer(FixedBuffer& b, char* data, size_t capacity) {
  b = {data, capacity, 0, data && capacity};
  if (b.valid) data[0] = 0;
}
bool appendRaw(FixedBuffer& b, const char* value) {
  if (!b.valid || !value) return false;
  size_t n = strlen(value);
  if (b.length + n >= b.capacity) return b.valid = false;
  memcpy(b.data + b.length, value, n);
  b.length += n;
  b.data[b.length] = 0;
  return true;
}
bool appendChar(FixedBuffer& b, char value) {
  if (!b.valid || b.length + 1 >= b.capacity) return b.valid = false;
  b.data[b.length++] = value;
  b.data[b.length] = 0;
  return true;
}
bool appendFormat(FixedBuffer& b, const char* format, ...) {
  if (!b.valid) return false;
  va_list args;
  va_start(args, format);
  size_t remaining = b.capacity - b.length;
  int written = vsnprintf(b.data + b.length, remaining, format, args);
  va_end(args);
  if (written < 0 || static_cast<size_t>(written) >= remaining) return b.valid = false;
  b.length += written;
  return true;
}
bool appendJsonEscaped(FixedBuffer& b, const char* source) {
  if (!source) return true;
  while (*source) {
    unsigned char v = *source++;
    if (v == '"' || v == '\\') {
      if (!appendChar(b, '\\') || !appendChar(b, v)) return false;
    } else if (v == '\n') {
      if (!appendRaw(b, "\\n")) return false;
    } else if (v == '\r') {
      if (!appendRaw(b, "\\r")) return false;
    } else if (v == '\t') {
      if (!appendRaw(b, "\\t")) return false;
    } else if (v >= 0x20 && !appendChar(b, v)) return false;
  }
  return true;
}

void storeConsoleLine(const char* type, const char* message, bool prefix) {
  uint8_t position = (logStart + logSize) % LOG_CAPACITY;
  if (logSize == LOG_CAPACITY) logStart = (logStart + 1) % LOG_CAPACITY;
  else logSize++;
  logs[position].id = nextLogId++;
  logs[position].timestamp = millis() / 1000UL;
  copyText(logs[position].type, sizeof(logs[position].type), type);
  copyText(logs[position].message, sizeof(logs[position].message), message);
  if (prefix) { Serial.print('['); Serial.print(type); Serial.print("] "); }
  Serial.println(message);
}
void logEvent(const char* type, const char* message) {
  if (otaExclusiveMode) return;
  storeConsoleLine(type, message, true);
}
void consoleLine(const char* message) {
  storeConsoleLine("console", message, false);
}
void clearRamLogs() { logStart = 0; logSize = 0; }


uint32_t fnv1aUpdate(uint32_t value, const uint8_t* data, size_t length) {
  for (size_t i = 0; i < length; i++) value = (value ^ data[i]) * 16777619UL;
  return value;
}
bool eepromBytesEqual(uint16_t offset, const uint8_t* expected, size_t length) {
  for (size_t i = 0; i < length; i++) {
    if (EEPROM.read(offset + i) != expected[i]) return false;
  }
  return true;
}
void eepromWriteBytes(uint16_t offset, const uint8_t* data, size_t length) {
  for (size_t i = 0; i < length; i++) EEPROM.update(offset + i, data[i]);
}
void eepromReadBytes(uint16_t offset, uint8_t* data, size_t length) {
  for (size_t i = 0; i < length; i++) data[i] = EEPROM.read(offset + i);
}
uint32_t eepromChecksum(uint16_t offset, size_t length) {
  uint32_t value = 2166136261UL;
  for (size_t i = 0; i < length; i++) {
    uint8_t byteValue = EEPROM.read(offset + i);
    value = (value ^ byteValue) * 16777619UL;
  }
  return value;
}
bool readSlotHeader(uint16_t offset, uint32_t magic, uint16_t maxPayload,
    StorageSlotHeader& header) {
  eepromReadBytes(offset, reinterpret_cast<uint8_t*>(&header), sizeof(header));
  return slotHeaderValid(header, magic, maxPayload) &&
    eepromChecksum(offset + sizeof(header), header.payloadLength) == header.checksum;
}
bool slotHeaderValid(const StorageSlotHeader& h, uint32_t magic,
    uint16_t maxPayload) {
  return h.magic == magic && h.schemaVersion == STORAGE_SCHEMA_VERSION &&
    h.state == SLOT_STATE_VALID && h.payloadLength <= maxPayload;
}
bool writeSlot(uint16_t offset, uint32_t magic, uint32_t generation,
    uint8_t count, const uint8_t* payload, uint16_t payloadLength) {
  StorageSlotHeader h = {magic, STORAGE_SCHEMA_VERSION, payloadLength,
    generation, fnv1a(payload, payloadLength), SLOT_STATE_WRITING, count, {0}};
  eepromWriteBytes(offset, reinterpret_cast<const uint8_t*>(&h), sizeof(h));
  eepromWriteBytes(offset + sizeof(h), payload, payloadLength);
  if (!eepromBytesEqual(offset + sizeof(h), payload, payloadLength)) return false;
  h.state = SLOT_STATE_VALID;
  eepromWriteBytes(offset, reinterpret_cast<const uint8_t*>(&h), sizeof(h));
  StorageSlotHeader verify = {};
  eepromReadBytes(offset, reinterpret_cast<uint8_t*>(&verify), sizeof(verify));
  return slotHeaderValid(verify, magic, payloadLength) &&
    verify.generation == generation && verify.checksum == h.checksum;
}
bool readValidSlot(uint16_t offset, uint32_t magic, uint16_t maxPayload,
    StorageSlotHeader& h, uint8_t* payload) {
  eepromReadBytes(offset, reinterpret_cast<uint8_t*>(&h), sizeof(h));
  if (!slotHeaderValid(h, magic, maxPayload)) return false;
  eepromReadBytes(offset + sizeof(h), payload, h.payloadLength);
  return fnv1a(payload, h.payloadLength) == h.checksum;
}
uint16_t inactiveScheduleSlotOffset() {
  return activeScheduleSlotOffset == SCHEDULE_SLOT_A_OFFSET
    ? SCHEDULE_SLOT_B_OFFSET : SCHEDULE_SLOT_A_OFFSET;
}
uint16_t inactiveConfigSlotOffset() {
  return activeConfigSlotOffset == CONFIG_SLOT_A_OFFSET
    ? CONFIG_SLOT_B_OFFSET : CONFIG_SLOT_A_OFFSET;
}
bool saveConfigAb() {
  ConfigPayload payload = {networkSettings, apiSettings};
  uint16_t target = inactiveConfigSlotOffset();
  uint32_t generation = configGeneration + 1;
  if (!writeSlot(target, CONFIG_SLOT_MAGIC, generation, 0,
      reinterpret_cast<const uint8_t*>(&payload), sizeof(payload))) return false;
  activeConfigSlotOffset = target;
  configGeneration = generation;
  networkSettingsStored = networkSettingsValid(networkSettings);
  apiSettingsStored = apiSettingsValid(apiSettings);
  return networkSettingsStored && apiSettingsStored;
}
void loadPersistentConfig() {
  StorageSlotHeader ah = {}, bh = {};
  bool av = readSlotHeader(CONFIG_SLOT_A_OFFSET, CONFIG_SLOT_MAGIC,
    sizeof(ConfigPayload), ah);
  bool bv = readSlotHeader(CONFIG_SLOT_B_OFFSET, CONFIG_SLOT_MAGIC,
    sizeof(ConfigPayload), bh);
  if (av || bv) {
    bool useB = bv && (!av || bh.generation > ah.generation);
    uint16_t selectedOffset = useB ? CONFIG_SLOT_B_OFFSET : CONFIG_SLOT_A_OFFSET;
    StorageSlotHeader selectedHeader = useB ? bh : ah;
    ConfigPayload selected = {};
    eepromReadBytes(selectedOffset + sizeof(StorageSlotHeader),
      reinterpret_cast<uint8_t*>(&selected), sizeof(selected));
    activeConfigSlotOffset = selectedOffset;
    configGeneration = selectedHeader.generation;
    networkSettings = selected.network;
    apiSettings = selected.api;
    networkSettingsStored = networkSettingsValid(networkSettings);
    apiSettingsStored = apiSettingsValid(apiSettings);
  } else {
    NetworkSettings legacyNetwork = {};
    ApiSettings legacyApi = {};
    EEPROM.get(0, legacyNetwork);
    EEPROM.get(API_SETTINGS_EEPROM_OFFSET, legacyApi);
    if (networkSettingsValid(legacyNetwork)) networkSettings = legacyNetwork;
    else {
      memset(&networkSettings, 0, sizeof(networkSettings));
      networkSettings.magic = NETWORK_SETTINGS_MAGIC;
      networkSettings.version = NETWORK_SETTINGS_VERSION;
      copyText(networkSettings.ssid, sizeof(networkSettings.ssid), WIFI_SSID);
      copyText(networkSettings.password, sizeof(networkSettings.password), WIFI_PASSWORD);
      copyText(networkSettings.otaPassword, sizeof(networkSettings.otaPassword), OTA_PASSWORD);
      networkSettings.checksum = settingsChecksum(networkSettings);
    }
    if (apiSettingsValid(legacyApi)) apiSettings = legacyApi;
    else {
      memset(&apiSettings, 0, sizeof(apiSettings));
      apiSettings.magic = API_SETTINGS_MAGIC;
      apiSettings.version = API_SETTINGS_VERSION;
      copyText(apiSettings.privatePath, sizeof(apiSettings.privatePath), API_PRIVATE_PATH);
      copyText(apiSettings.sharedSecret, sizeof(apiSettings.sharedSecret), API_SHARED_SECRET);
      apiSettings.checksum = apiSettingsChecksum(apiSettings);
    }
    networkSettingsStored = networkSettingsValid(networkSettings);
    apiSettingsStored = apiSettingsValid(apiSettings);
    if (networkSettingsStored && apiSettingsStored && saveConfigAb()) {
      legacyStorageMigrated = true;
      logEvent("success", "Legacy konfiguracio A/B storage-ba migralva");
    }
  }
  deviceKeyFingerprint = apiSettingsStored ? fnv1aText(apiSettings.sharedSecret) : 0;
  logEvent(networkSettingsStored && apiSettingsStored ? "success" : "error",
    networkSettingsStored && apiSettingsStored
      ? "A/B WiFi, OTA es API konfiguracio betoltve"
      : "Nincs ervenyes konfiguracio");
}

uint32_t settingsChecksum(const NetworkSettings& s) {
  return fnv1a(reinterpret_cast<const uint8_t*>(&s),
    sizeof(NetworkSettings) - sizeof(s.checksum));
}
uint32_t apiSettingsChecksum(const ApiSettings& s) {
  return fnv1a(reinterpret_cast<const uint8_t*>(&s),
    sizeof(ApiSettings) - sizeof(s.checksum));
}
bool privatePathValid(const char* value) {
  if (isPlaceholder(value) || value[0] != '/') return false;
  size_t length = strlen(value);
  if (length < 18 || length >= sizeof(apiSettings.privatePath)) return false;
  for (const char* p = value + 1; *p; p++) {
    bool valid = isalnum(*p) || *p == '-' || *p == '_';
    if (!valid) return false;
  }
  return true;
}
bool apiSecretValid(const char* value) {
  return !isPlaceholder(value) && strlen(value) >= 24 &&
    strlen(value) < sizeof(apiSettings.sharedSecret);
}
bool networkSettingsValid(const NetworkSettings& s) {
  return s.magic == NETWORK_SETTINGS_MAGIC &&
    s.version == NETWORK_SETTINGS_VERSION &&
    s.checksum == settingsChecksum(s) &&
    !isPlaceholder(s.ssid) && !isPlaceholder(s.password) &&
    !isPlaceholder(s.otaPassword);
}
bool apiSettingsValid(const ApiSettings& s) {
  return s.magic == API_SETTINGS_MAGIC &&
    s.version == API_SETTINGS_VERSION &&
    s.checksum == apiSettingsChecksum(s) &&
    privatePathValid(s.privatePath) && apiSecretValid(s.sharedSecret);
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
  bool stored = networkSettingsValid(networkSettings);
  bool compiled = !isPlaceholder(WIFI_SSID) && !isPlaceholder(WIFI_PASSWORD) &&
    !isPlaceholder(OTA_PASSWORD);
  bool differs = stored && (strcmp(networkSettings.ssid, WIFI_SSID) ||
    strcmp(networkSettings.password, WIFI_PASSWORD) ||
    strcmp(networkSettings.otaPassword, OTA_PASSWORD));
  if (compiled && (!stored || differs)) {
    saveCompiledNetworkSettings();
    logEvent("success", "WiFi es OTA beallitas EEPROM-be mentve");
  } else if (stored) {
    networkSettingsStored = true;
    logEvent("success", "WiFi es OTA beallitas EEPROM-bol betoltve");
  } else {
    memset(&networkSettings, 0, sizeof(networkSettings));
    copyText(networkSettings.ssid, sizeof(networkSettings.ssid), WIFI_SSID);
    copyText(networkSettings.password, sizeof(networkSettings.password), WIFI_PASSWORD);
    copyText(networkSettings.otaPassword, sizeof(networkSettings.otaPassword), OTA_PASSWORD);
    logEvent("error", "Nincs ervenyes WiFi beallitas; USB-s feltoltes kell");
  }
}
void saveCompiledApiSettings() {
  memset(&apiSettings, 0, sizeof(apiSettings));
  apiSettings.magic = API_SETTINGS_MAGIC;
  apiSettings.version = API_SETTINGS_VERSION;
  copyText(apiSettings.privatePath, sizeof(apiSettings.privatePath), API_PRIVATE_PATH);
  copyText(apiSettings.sharedSecret, sizeof(apiSettings.sharedSecret), API_SHARED_SECRET);
  apiSettings.checksum = apiSettingsChecksum(apiSettings);
  EEPROM.put(API_SETTINGS_EEPROM_OFFSET, apiSettings);
  apiSettingsStored = true;
  deviceKeyFingerprint = fnv1aText(apiSettings.sharedSecret);
}
void loadApiSettings() {
  EEPROM.get(API_SETTINGS_EEPROM_OFFSET, apiSettings);
  bool stored = apiSettingsValid(apiSettings);
  bool compiled = privatePathValid(API_PRIVATE_PATH) && apiSecretValid(API_SHARED_SECRET);
  bool differs = stored && (strcmp(apiSettings.privatePath, API_PRIVATE_PATH) ||
    strcmp(apiSettings.sharedSecret, API_SHARED_SECRET));
  if (compiled && (!stored || differs)) {
    saveCompiledApiSettings();
    logEvent("success", "Vedett API beallitas EEPROM-be mentve");
  } else if (stored) {
    apiSettingsStored = true;
    deviceKeyFingerprint = fnv1aText(apiSettings.sharedSecret);
    logEvent("success", "Vedett API beallitas EEPROM-bol betoltve");
  } else {
    memset(&apiSettings, 0, sizeof(apiSettings));
    logEvent("error", "Vedett API nincs beallitva; USB-s feltoltes kell");
  }
}

uint32_t scheduleChecksum(const StoredSchedule* entries, uint8_t count) {
  return fnv1a(reinterpret_cast<const uint8_t*>(entries),
    sizeof(StoredSchedule) * count);
}

void loadSchedules() {
  StorageSlotHeader ah = {}, bh = {};
  bool av = readSlotHeader(SCHEDULE_SLOT_A_OFFSET, SCHEDULE_SLOT_MAGIC_V2,
    sizeof(StoredSchedule) * SCHEDULE_MAX, ah);
  bool bv = readSlotHeader(SCHEDULE_SLOT_B_OFFSET, SCHEDULE_SLOT_MAGIC_V2,
    sizeof(StoredSchedule) * SCHEDULE_MAX, bh);
  if (av || bv) {
    bool useB = bv && (!av || bh.generation > ah.generation);
    StorageSlotHeader selectedHeader = useB ? bh : ah;
    uint16_t selectedOffset = useB ? SCHEDULE_SLOT_B_OFFSET : SCHEDULE_SLOT_A_OFFSET;
    memset(schedules, 0, sizeof(schedules));
    eepromReadBytes(selectedOffset + sizeof(StorageSlotHeader),
      reinterpret_cast<uint8_t*>(schedules), selectedHeader.payloadLength);
    scheduleCount = selectedHeader.count;
    scheduleRevision = selectedHeader.generation;
    activeScheduleSlotOffset = selectedOffset;
    schedulesStored = true;
    logEvent("success", "A/B schedule EEPROM-bol betoltve");
    return;
  }
  ScheduleHeader legacy = {};
  EEPROM.get(SCHEDULE_EEPROM_OFFSET, legacy);
  if (legacy.magic == SCHEDULE_MAGIC && legacy.version == 1 &&
      legacy.count <= SCHEDULE_MAX) {
    EEPROM.get(SCHEDULE_EEPROM_OFFSET + sizeof(ScheduleHeader), schedules);
    if (legacy.checksum == scheduleChecksum(schedules, legacy.count)) {
      scheduleCount = legacy.count;
      scheduleRevision = 0;
      if (saveSchedules(scheduleCount)) {
        legacyStorageMigrated = true;
        logEvent("success", "Legacy schedule A/B storage-ba migralva");
        return;
      }
    }
  }
  memset(schedules, 0, sizeof(schedules));
  scheduleCount = 0;
  scheduleRevision = 0;
  schedulesStored = false;
  logEvent("warn", "Nincs ervenyes schedule; ures allapot indul");
}
void reconcileArduinoSchedules(bool force);

bool saveSchedules(uint8_t count) {
  if (count > SCHEDULE_MAX) return false;
  uint16_t target = inactiveScheduleSlotOffset();
  uint32_t generation = scheduleRevision + 1;
  uint16_t payloadLength = sizeof(StoredSchedule) * count;
  if (!writeSlot(target, SCHEDULE_SLOT_MAGIC_V2, generation, count,
      reinterpret_cast<const uint8_t*>(schedules), payloadLength)) return false;
  StorageSlotHeader verify = {};
  if (!readSlotHeader(target, SCHEDULE_SLOT_MAGIC_V2,
      sizeof(StoredSchedule) * SCHEDULE_MAX, verify)) return false;
  if (verify.count != count || verify.generation != generation ||
      verify.payloadLength != payloadLength) return false;
  activeScheduleSlotOffset = target;
  scheduleCount = count;
  scheduleRevision = generation;
  schedulesStored = true;
  refreshManualOverrideDeadlines();
  lastScheduleAudit = 0;
  if (timeSynced) reconcileArduinoSchedules(true);
  logEvent("success", "Schedule A/B slotba mentve es visszaellenorizve");
  return true;
}
int hexValue(char v) {
  if (v >= '0' && v <= '9') return v - '0';
  if (v >= 'a' && v <= 'f') return v - 'a' + 10;
  if (v >= 'A' && v <= 'F') return v - 'A' + 10;
  return -1;
}
bool decodeScheduleHex(const String& payload, StoredSchedule& entry) {
  if (payload.length() != sizeof(StoredSchedule) * 2) return false;
  uint8_t* target = reinterpret_cast<uint8_t*>(&entry);
  for (size_t i = 0; i < payload.length(); i += 2) {
    int hi = hexValue(payload[i]), lo = hexValue(payload[i + 1]);
    if (hi < 0 || lo < 0) return false;
    target[i / 2] = (hi << 4) | lo;
  }
  return entry.day >= 1 && entry.day <= 7 && entry.hour <= 23 &&
    entry.minute <= 59;
}
String encodeScheduleHex(const StoredSchedule& entry) {
  static const char HEX_DIGITS[] = "0123456789abcdef";
  const uint8_t* source = reinterpret_cast<const uint8_t*>(&entry);
  String out;
  if (!out.reserve(sizeof(StoredSchedule) * 2)) return "";
  for (size_t i = 0; i < sizeof(StoredSchedule); i++) {
    out += HEX_DIGITS[(source[i] >> 4) & 15];
    out += HEX_DIGITS[source[i] & 15];
  }
  return out;
}
bool importSchedulesHex(const String& payload) {
  size_t chars = sizeof(StoredSchedule) * 2;
  if (payload.length() % chars) return false;
  uint8_t count = payload.length() / chars;
  if (count > SCHEDULE_MAX) return false;
  // Kétmenetes ellenőrzés: nem foglalunk 1620 bájtos lokális tömböt a stacken.
  StoredSchedule decoded = {};
  for (uint8_t i = 0; i < count; i++) {
    if (!decodeScheduleHex(payload.substring(i * chars, (i + 1) * chars),
      decoded)) return false;
  }

  for (uint8_t i = 0; i < count; i++) {
    if (!decodeScheduleHex(payload.substring(i * chars, (i + 1) * chars),
      schedules[i])) return false;
  }

  if (count < SCHEDULE_MAX) {
    memset(schedules + count, 0,
      sizeof(StoredSchedule) * (SCHEDULE_MAX - count));
  }

  return saveSchedules(count);
}

uint32_t timeSettingsChecksum(const TimeSettings& settings) {
  return fnv1a(
    reinterpret_cast<const uint8_t*>(&settings),
    sizeof(TimeSettings) - sizeof(settings.checksum)
  );
}
bool timezoneIdValid(const char* value) {
  size_t length = strlen(value);
  if (length < 1 || length >= sizeof(timeSettings.timezoneId)) return false;
  for (const char* p = value; *p; p++) {
    bool valid = isalnum(*p) || *p == '/' || *p == '_' || *p == '-' || *p == '+';
    if (!valid) return false;
  }
  return true;
}
bool timeSettingsValid(const TimeSettings& settings) {
  return settings.magic == TIME_SETTINGS_MAGIC &&
    settings.version == TIME_SETTINGS_VERSION &&
    timezoneIdValid(settings.timezoneId) &&
    settings.currentUtcOffsetMinutes >= -840 &&
    settings.currentUtcOffsetMinutes <= 840 &&
    settings.nextUtcOffsetMinutes >= -840 &&
    settings.nextUtcOffsetMinutes <= 840 &&
    settings.checksum == timeSettingsChecksum(settings);
}
void saveTimeSettings() {
  timeSettings.magic = TIME_SETTINGS_MAGIC;
  timeSettings.version = TIME_SETTINGS_VERSION;
  timeSettings.checksum = timeSettingsChecksum(timeSettings);
  EEPROM.put(TIME_SETTINGS_EEPROM_OFFSET, timeSettings);
  TimeSettings verify = {};
  EEPROM.get(TIME_SETTINGS_EEPROM_OFFSET, verify);
  timeSettingsStored = timeSettingsValid(verify);
}
void loadTimeSettings() {
  EEPROM.get(TIME_SETTINGS_EEPROM_OFFSET, timeSettings);
  if (timeSettingsValid(timeSettings)) {
    timeSettingsStored = true;
    logEvent("success", "Idozona beallitas EEPROM-bol betoltve");
    return;
  }
  memset(&timeSettings, 0, sizeof(timeSettings));
  timeSettings.magic = TIME_SETTINGS_MAGIC;
  timeSettings.version = TIME_SETTINGS_VERSION;
  copyText(timeSettings.timezoneId, sizeof(timeSettings.timezoneId), "Europe/Vienna");
  timeSettings.currentUtcOffsetMinutes = 60;
  timeSettings.nextTransitionEpoch = 0;
  timeSettings.nextUtcOffsetMinutes = 60;
  saveTimeSettings();
  logEvent("warn", "Idozona alapertelmezett: Europe/Vienna");
}
int64_t daysFromCivil(int year, unsigned month, unsigned day) {
  year -= month <= 2;
  const int era = (year >= 0 ? year : year - 399) / 400;
  const unsigned yoe = static_cast<unsigned>(year - era * 400);
  const int adjustedMonth =
    static_cast<int>(month) + (month > 2 ? -3 : 9);
  const unsigned doy =
    (153U * static_cast<unsigned>(adjustedMonth) + 2U) /
      5U + day - 1U;
  const unsigned doe = yoe * 365U + yoe / 4U - yoe / 100U + doy;
  return static_cast<int64_t>(era) * 146097LL +
    static_cast<int64_t>(doe) - 719468LL;
}
unsigned long utcEpochForDate(int year, unsigned month, unsigned day,
    unsigned hour = 0) {
  int64_t seconds = daysFromCivil(year, month, day) * 86400LL +
    static_cast<int64_t>(hour) * 3600LL;
  return seconds > 0 ? static_cast<unsigned long>(seconds) : 0UL;
}
uint8_t weekdaySundayZero(int year, unsigned month, unsigned day) {
  int64_t days = daysFromCivil(year, month, day);
  int value = static_cast<int>((days + 4LL) % 7LL);
  return static_cast<uint8_t>(value < 0 ? value + 7 : value);
}
uint8_t daysInMonth(int year, uint8_t month) {
  static const uint8_t DAYS[] = {31,28,31,30,31,30,31,31,30,31,30,31};
  if (month != 2) return DAYS[month - 1];
  bool leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
  return leap ? 29 : 28;
}
uint8_t lastSundayOfMonth(int year, uint8_t month) {
  uint8_t last = daysInMonth(year, month);
  return last - weekdaySundayZero(year, month, last);
}
bool isCentralEuropeanTimezone(const char* timezoneId) {
  static const char* ZONES[] = {
    "Europe/Vienna", "Europe/Berlin", "Europe/Bratislava",
    "Europe/Budapest", "Europe/Prague", "Europe/Ljubljana",
    "Europe/Zagreb", "Europe/Warsaw", "Europe/Rome",
    "Europe/Paris", "Europe/Amsterdam", "Europe/Brussels",
    "Europe/Luxembourg", "Europe/Madrid", "Europe/Stockholm",
    "Europe/Oslo", "Europe/Copenhagen"
  };
  for (const char* zone : ZONES) if (!strcmp(timezoneId, zone)) return true;
  return false;
}
void centralEuropeanTimezoneState(unsigned long epoch, int16_t& offset,
    uint32_t& nextTransition, int16_t& nextOffset, bool& dstActive) {
  time_t raw = static_cast<time_t>(epoch);
  tm utc = *gmtime(&raw);
  int year = utc.tm_year + 1900;
  uint32_t spring = utcEpochForDate(year, 3, lastSundayOfMonth(year, 3), 1);
  uint32_t autumn = utcEpochForDate(year, 10, lastSundayOfMonth(year, 10), 1);
  if (epoch < spring) {
    offset = 60; nextTransition = spring; nextOffset = 120; dstActive = false;
  } else if (epoch < autumn) {
    offset = 120; nextTransition = autumn; nextOffset = 60; dstActive = true;
  } else {
    offset = 60;
    nextTransition = utcEpochForDate(year + 1, 3, lastSundayOfMonth(year + 1, 3), 1);
    nextOffset = 120; dstActive = false;
  }
}
bool autonomousTimezoneState(unsigned long epoch, int16_t& offset,
    uint32_t& nextTransition, int16_t& nextOffset, bool& dstActive) {
  if (!epoch || !isCentralEuropeanTimezone(timeSettings.timezoneId)) return false;
  centralEuropeanTimezoneState(epoch, offset, nextTransition, nextOffset, dstActive);
  return true;
}
void refreshAutonomousTimezoneState(unsigned long epoch, bool persist) {
  int16_t offset = 0, nextOffset = 0;
  uint32_t nextTransition = 0;
  bool dstActive = false;
  if (!autonomousTimezoneState(epoch, offset, nextTransition, nextOffset, dstActive)) return;
  bool changed =
    timeSettings.currentUtcOffsetMinutes != offset ||
    timeSettings.nextTransitionEpoch != nextTransition ||
    timeSettings.nextUtcOffsetMinutes != nextOffset;
  timeSettings.currentUtcOffsetMinutes = offset;
  timeSettings.nextTransitionEpoch = nextTransition;
  timeSettings.nextUtcOffsetMinutes = nextOffset;
  if (changed && persist) {
    saveTimeSettings();
    logEvent("info", "Idozona es DST szabaly autonom modon frissitve");
  }
}
int16_t utcOffsetMinutesForEpoch(unsigned long epoch) {
  int16_t offset = 0, nextOffset = 0;
  uint32_t nextTransition = 0;
  bool dstActive = false;
  if (autonomousTimezoneState(epoch, offset, nextTransition, nextOffset, dstActive)) return offset;
  if (timeSettings.nextTransitionEpoch > 0 &&
      epoch >= timeSettings.nextTransitionEpoch) return timeSettings.nextUtcOffsetMinutes;
  return timeSettings.currentUtcOffsetMinutes;
}
unsigned long localClockEpoch() {
  unsigned long utcEpoch = currentClockEpoch();
  if (!utcEpoch) return 0;
  int32_t offsetSeconds =
    static_cast<int32_t>(utcOffsetMinutesForEpoch(utcEpoch)) * 60L;
  return static_cast<unsigned long>(
    static_cast<int64_t>(utcEpoch) + offsetSeconds
  );
}
bool localScheduleTime(uint8_t& day, uint8_t& hour, uint8_t& minute) {
  if (!timeSynced) return false;
  time_t epoch = static_cast<time_t>(localClockEpoch());
  tm local = *gmtime(&epoch);
  day = local.tm_wday == 0 ? 7 : local.tm_wday;
  hour = local.tm_hour;
  minute = local.tm_min;
  return true;
}
bool startNtpUdpService() {
  if (ntpUdpActive) return true;
  if (!wifiHasAddress()) return false;
  ntpUdpActive = ntpUdp.begin(NTP_LOCAL_PORT) != 0;
  return ntpUdpActive;
}
void stopNtpUdpService() {
  if (!ntpUdpActive) return;
  ntpUdp.stop();
  ntpUdpActive = false;
}
void stopNeoPixelsForOta() {
  for (uint8_t i = 0; i < STRIP_COUNT; i++) {
    strip[i].clear();
    strip[i].show();
  }
}
void enterOtaExclusiveMode() {
  otaExclusiveMode = true;
  stopNtpUdpService();
  stopNeoPixelsForOta();
  showMatrix(MATRIX_OTA);
}
void leaveOtaExclusiveMode() {
  otaExclusiveMode = false;
  if (wifiHasAddress()) startNtpUdpService();
}
bool readUdpNtp(const char* hostname, unsigned long& epochOut) {
  epochOut = 0;
  if (!ntpUdpActive && !startNtpUdpService()) return false;
  IPAddress address(0, 0, 0, 0);
  if (WiFi.hostByName(hostname, address) != 1) return false;

  byte packet[48] = {};
  packet[0] = 0b11100011;
  packet[1] = 0;
  packet[2] = 6;
  packet[3] = 0xEC;
  packet[12] = 49;
  packet[13] = 0x4E;
  packet[14] = 49;
  packet[15] = 52;

  while (ntpUdp.parsePacket() > 0) {
    byte discard[48];
    ntpUdp.read(discard, sizeof(discard));
  }

  if (!ntpUdp.beginPacket(address, NTP_REMOTE_PORT)) return false;
  if (ntpUdp.write(packet, sizeof(packet)) != sizeof(packet)) {
    ntpUdp.endPacket();
    return false;
  }
  if (!ntpUdp.endPacket()) return false;

  unsigned long startedAt = millis();
  while (millis() - startedAt < NTP_UDP_TIMEOUT_MS) {
    int packetSize = ntpUdp.parsePacket();
    if (packetSize >= 48) {
      byte response[48] = {};
      int readLength = ntpUdp.read(response, sizeof(response));
      if (readLength < 48) return false;
      uint32_t ntpSeconds =
        (static_cast<uint32_t>(response[40]) << 24) |
        (static_cast<uint32_t>(response[41]) << 16) |
        (static_cast<uint32_t>(response[42]) << 8) |
        static_cast<uint32_t>(response[43]);
      if (ntpSeconds <= NTP_UNIX_OFFSET) return false;
      epochOut = ntpSeconds - NTP_UNIX_OFFSET;
      return epochOut > NTP_VALID_EPOCH_MIN;
    }
    delay(10);
  }
  return false;
}
bool readAnyUdpNtp(unsigned long& epochOut) {
  for (uint8_t step = 0; step < NTP_SERVER_COUNT; step++) {
    uint8_t index = (ntpLastServerIndex + step) % NTP_SERVER_COUNT;
    if (readUdpNtp(NTP_SERVERS[index], epochOut)) {
      ntpLastServerIndex = index;
      copyText(ntpLastServer, sizeof(ntpLastServer), NTP_SERVERS[index]);
      return true;
    }
  }
  return false;
}
uint32_t currentClockMinuteKey() {
  return timeSynced
    ? static_cast<uint32_t>((lastClockEpoch +
      (millis() - lastClockMillis) / 1000UL) / 60UL)
    : 0;
}
bool nextScheduleDeltaMinutes(uint8_t led, uint16_t current, uint16_t& delta) {
  int32_t first = -1, next = -1;
  for (uint8_t i = 0; i < scheduleCount; i++) {
    if (!schedules[i].leds[led].apply) continue;
    uint16_t event = (schedules[i].day - 1) * 1440U +
      schedules[i].hour * 60U + schedules[i].minute;
    if (first < 0 || event < first) first = event;
    if (event > current && (next < 0 || event < next)) next = event;
  }
  if (next >= 0) { delta = next - current; return true; }
  if (first >= 0) { delta = MINUTES_PER_WEEK - current + first; return true; }
  return false;
}
void activateManualOverride(uint8_t led) {
  if (led >= STRIP_COUNT) return;
  manualOverride[led] = true;
  manualOverrideUntilMinute[led] = MANUAL_OVERRIDE_INDEFINITE;
  manualOverrideFallbackUntilMillis[led] = millis() + MANUAL_OVERRIDE_UNSYNCED_MAX_MS;
  uint8_t day, hour, minute;
  if (!localScheduleTime(day, hour, minute)) return;
  uint16_t current = (day - 1) * 1440U + hour * 60U + minute, delta = 0;
  if (nextScheduleDeltaMinutes(led, current, delta))
    manualOverrideUntilMinute[led] = currentClockMinuteKey() + delta;
}
void activateManualOverrideAll() {
  for (uint8_t i = 0; i < STRIP_COUNT; i++) activateManualOverride(i);
}
void refreshManualOverrideDeadlines() {
  for (uint8_t i = 0; i < STRIP_COUNT; i++)
    if (manualOverride[i]) activateManualOverride(i);
}
int32_t manualOverrideMinutesRemaining(uint8_t led) {
  if (led >= STRIP_COUNT || !manualOverride[led]) return 0;
  if (timeSynced && manualOverrideUntilMinute[led] != MANUAL_OVERRIDE_INDEFINITE) {
    int32_t left = manualOverrideUntilMinute[led] - currentClockMinuteKey();
    return left > 0 ? left : 0;
  }
  int32_t millisLeft = static_cast<int32_t>(manualOverrideFallbackUntilMillis[led] - millis());
  return millisLeft > 0 ? (millisLeft + 59999L) / 60000L : 0;
}
void applyStoredLed(uint8_t index, const StoredLed& source) {
  leds[index] = {source.enabled != 0, source.brightness, source.effect,
    source.speed, source.red, source.green, source.blue};
}
void reconcileArduinoSchedules(bool force = false) {
  if (!scheduleCount || !timeSynced) return;
  unsigned long now = millis();
  if (!force && lastScheduleAudit &&
      now - lastScheduleAudit < SCHEDULE_AUDIT_INTERVAL) return;
  lastScheduleAudit = now;
  schedulerLastRunAt = now;
  uint8_t day, hour, minute;
  if (!localScheduleTime(day, hour, minute)) return;
  uint16_t current = (day - 1) * 1440U + hour * 60U + minute;
  uint32_t key = currentClockMinuteKey();
  bool changed = false;
  for (uint8_t led = 0; led < STRIP_COUNT; led++) {
    schedulerLastSelectedIndex[led] = -1;
    schedulerLastBlockedReason[led] = 0;
    if (manualOverride[led]) {
      uint32_t until = manualOverrideUntilMinute[led];
      bool clockDeadlineActive = until != MANUAL_OVERRIDE_INDEFINITE &&
        static_cast<int32_t>(key - until) < 0;
      bool fallbackActive = until == MANUAL_OVERRIDE_INDEFINITE &&
        static_cast<int32_t>(manualOverrideFallbackUntilMillis[led] - now) > 0;
      if (clockDeadlineActive || fallbackActive) {
        schedulerLastBlockedReason[led] = 1;
        continue;
      }
      manualOverride[led] = false;
      manualOverrideUntilMinute[led] = 0;
      manualOverrideFallbackUntilMillis[led] = 0;
      logEvent("info", "Kezi LED felulbiralas lejart");
    }
    int16_t selected = -1;
    int32_t selectedRelative = -MINUTES_PER_WEEK - 1;
    for (uint8_t i = 0; i < scheduleCount; i++) {
      if (!schedules[i].leds[led].apply) continue;
      uint16_t event = (schedules[i].day - 1) * 1440U +
        schedules[i].hour * 60U + schedules[i].minute;
      int32_t relative = static_cast<int32_t>(event) - current;
      if (relative > 0) relative -= MINUTES_PER_WEEK;
      if (selected < 0 || relative > selectedRelative) {
        selected = i;
        selectedRelative = relative;
      }
    }
    schedulerLastSelectedIndex[led] = selected;
    if (selected >= 0) {
      StoredLed& expected = schedules[selected].leds[led];
      if (leds[led].enabled != (expected.enabled != 0) ||
          leds[led].brightness != expected.brightness ||
          leds[led].effect != expected.effect ||
          leds[led].speed != expected.speed ||
          leds[led].red != expected.red || leds[led].green != expected.green ||
          leds[led].blue != expected.blue) {
        applyStoredLed(led, expected);
        changed = true;
      }
    } else {
      schedulerLastBlockedReason[led] = 2;
    }
  }
  if (changed) {
    renderAll(true);
    schedulerLastAppliedAt = now;
    logEvent("info", "LED allapot schedule alapjan egyeztetve");
  }
}

unsigned long currentClockEpoch() {
  return timeSynced
    ? lastClockEpoch + (millis() - lastClockMillis) / 1000UL
    : 0;
}
void serviceClockSync(bool force = false) {
  bool available = wifiHasAddress();
  if (!available) {
    clockWifiWasAvailable = false;
    return;
  }

  unsigned long now = millis();
  unsigned long interval =
    timeSynced ? NTP_SYNC_INTERVAL_MS : NTP_UNSYNCED_RETRY_INTERVAL_MS;
  bool wifiReturned = !clockWifiWasAvailable;
  clockWifiWasAvailable = true;

  if (!force && !wifiReturned && lastTimeCheck &&
      now - lastTimeCheck < interval) return;

  lastTimeCheck = now;
  ntpAttemptCount++;

  unsigned long epoch = WiFi.getTime();
  bool usedUdpFallback = false;

  if (epoch <= NTP_VALID_EPOCH_MIN) {
    usedUdpFallback = true;
    if (!readAnyUdpNtp(epoch)) epoch = 0;
  } else {
    copyText(ntpLastServer, sizeof(ntpLastServer), "WiFi.getTime");
  }

  if (epoch <= NTP_VALID_EPOCH_MIN) {
    ntpFailureCount++;
    ntpLastFailureAt = now;
    if (!timeSynced || ntpFailureCount == 1 || ntpFailureCount % 10 == 0) {
      logEvent("warn",
        "NTP ido lekerese sikertelen minden szerverrol; ujraprobalas");
    }
    return;
  }

  bool first = !timeSynced;
  lastClockEpoch = epoch;
  lastClockMillis = now;
  timeSynced = true;
  refreshAutonomousTimezoneState(epoch, true);
  ntpSuccessCount++;
  ntpLastSuccessAt = now;

  if (first) {
    logEvent("success",
      usedUdpFallback
        ? "UDP NTP ido szinkronizalva"
        : "WiFi.getTime ido szinkronizalva");
    refreshManualOverrideDeadlines();
    lastScheduleMinute = 0xFFFFFFFFUL;
    reconcileArduinoSchedules(true);
  }
}
void runArduinoSchedules() {
  uint8_t day, hour, minute;
  if (!localScheduleTime(day, hour, minute)) return;
  uint32_t key = currentClockMinuteKey();
  if (key != lastScheduleMinute) {
    lastScheduleMinute = key;
    reconcileArduinoSchedules(true);
  } else {
    reconcileArduinoSchedules(false);
  }
}

void buildDeviceIdentity() {
  uint8_t mac[6] = {};
  WiFi.macAddress(mac);
  bool usable = false;
  for (uint8_t i = 0; i < 6; i++) usable = usable || mac[i];
  bootId = usable ? (fnv1a(mac, sizeof(mac)) ^ micros())
                  : (micros() ^ millis() ^ 0xA14F1401UL);
  if (usable) snprintf(deviceId, sizeof(deviceId), "ALC-%02X%02X%02X",
    mac[3], mac[4], mac[5]);
  else snprintf(deviceId, sizeof(deviceId), "ALC-%08lX",
    static_cast<unsigned long>(bootId));
}
void refreshWifiTelemetry(bool force) {
  unsigned long now = millis();
  if (force || !lastWifiLinkProbe ||
      now - lastWifiLinkProbe >= WIFI_LINK_PROBE_INTERVAL_MS) {
    lastWifiLinkProbe = now;
    cachedWifiConnected = WiFi.status() == WL_CONNECTED;
    cachedWifiIp = cachedWifiConnected ? WiFi.localIP() : IPAddress(0,0,0,0);
  }
  if (cachedWifiConnected && (force || !lastWifiRssiRefresh ||
      now - lastWifiRssiRefresh >= WIFI_RSSI_REFRESH_INTERVAL_MS)) {
    lastWifiRssiRefresh = now;
    cachedWifiRssi = WiFi.RSSI();
  }
}
bool wifiHasAddress() {
  return cachedWifiConnected &&
    (cachedWifiIp[0] || cachedWifiIp[1] || cachedWifiIp[2] || cachedWifiIp[3]);
}
void connectWifi() {
  lastWifi = millis();
  refreshWifiTelemetry(true);
  if (wifiHasAddress()) return;
  if (!networkSettingsStored) { showMatrix(MATRIX_ERROR); return; }
  showMatrix(MATRIX_WIFI);
  logEvent("info", "WiFi kapcsolodas inditva");
  WiFi.begin(networkSettings.ssid, networkSettings.password);
}
void printConnectionBlock() {
  char ip[16], fingerprint[16], line[192];
  ipToText(cachedWifiIp, ip, sizeof(ip));
  fingerprintText(deviceKeyFingerprint, fingerprint, sizeof(fingerprint));
  consoleLine("");
  consoleLine("==========================================");
  consoleLine("ARDUINO LED CONTROLLER - KAPCSOLAT");
  consoleLine("==========================================");
  snprintf(line, sizeof(line), "Eszkozazonosito:      %s", deviceId); consoleLine(line);
  snprintf(line, sizeof(line), "Boot ID:              %08lX",
    static_cast<unsigned long>(bootId)); consoleLine(line);
  snprintf(line, sizeof(line), "Firmware:             %s", FIRMWARE_VERSION); consoleLine(line);
  snprintf(line, sizeof(line), "Firmware funkcio:     %s", FIRMWARE_FEATURE); consoleLine(line);
  snprintf(line, sizeof(line), "Build:                %s %s", __DATE__, __TIME__); consoleLine(line);
  snprintf(line, sizeof(line), "Direct API verzio:    %s", DIRECT_API_VERSION); consoleLine(line);
  snprintf(line, sizeof(line), "Helyi IP:             %s", ip); consoleLine(line);
  snprintf(line, sizeof(line), "WiFi jelerosseg:      %ld dBm", cachedWifiRssi); consoleLine(line);
  snprintf(line, sizeof(line), "HTTP port:            %u", HTTP_API_PORT); consoleLine(line);
  snprintf(line, sizeof(line), "OTA port:             %u", OTA_UPLOAD_PORT); consoleLine(line);
  snprintf(line, sizeof(line), "Privat API:           %s",
    apiSettingsStored ? "BEALLITVA" : "HIANYZIK"); consoleLine(line);
  snprintf(line, sizeof(line), "Eszkozkulcs:          %s",
    apiSettingsStored ? "BEALLITVA" : "HIANYZIK"); consoleLine(line);
  snprintf(line, sizeof(line), "Kulcs ujjlenyomat:    %s",
    apiSettingsStored ? fingerprint : "-"); consoleLine(line);
  snprintf(line, sizeof(line), "Schedule:             %u / %u",
    scheduleCount, SCHEDULE_MAX); consoleLine(line);
  snprintf(line, sizeof(line), "Schedule checksum:    %08lX",
    static_cast<unsigned long>(scheduleChecksum(schedules, scheduleCount)));
  consoleLine(line);
  snprintf(line, sizeof(line), "Query fallback:       INAKTIV (FORRASKODBAN ZAROLT)");
  consoleLine(line);
  consoleLine("------------------------------------------");
  if (apiSettingsStored) {
    consoleLine("Teljes Direct API v1 status URL:");
    snprintf(line, sizeof(line), "http://%s:%u%s/api/v1/status",
      ip, HTTP_API_PORT, apiSettings.privatePath); consoleLine(line);
  } else {
    consoleLine("Status URL: NEM ELERHETO - API nincs beallitva");
  }
  consoleLine("Hitelesitesi fejlec:");
  consoleLine(API_DEVICE_KEY_HEADER);
  consoleLine("------------------------------------------");
  snprintf(line, sizeof(line), "OTA szolgaltatas:     %s",
    otaReady ? "AKTIV" : "INAKTIV"); consoleLine(line);
  snprintf(line, sizeof(line), "OTA jelszo:           %s",
    networkSettings.otaPassword[0] ? "BEALLITVA" : "HIANYZIK"); consoleLine(line);
  consoleLine("mDNS:                 INAKTIV (stabilitasi okbol)");
  consoleLine("Serial parancsok:     help");
  consoleLine("==========================================");
  consoleLine("");
}
void reportWifiConnected() {
  if (!wifiHasAddress() || wifiReported) return;
  wifiReported = true;
  showMatrix(MATRIX_OK);
  char ip[16], message[128];
  ipToText(cachedWifiIp, ip, sizeof(ip));
  snprintf(message, sizeof(message),
    "WiFi kesz: %s, jel: %ld dBm, HTTP: %u, OTA: %u",
    ip, cachedWifiRssi, HTTP_API_PORT, OTA_UPLOAD_PORT);
  logEvent("success", message);
  printConnectionBlock();
}

bool otaPrepareModeActive() {
  return otaPrepareUntil && static_cast<int32_t>(otaPrepareUntil - millis()) > 0;
}
bool otaErrorIndicatorActive() {
  return otaErrorIndicatorUntil &&
    static_cast<int32_t>(otaErrorIndicatorUntil - millis()) > 0;
}
unsigned long otaPrepareSecondsRemaining() {
  return otaPrepareModeActive() ? (otaPrepareUntil - millis() + 999UL) / 1000UL : 0;
}
void showOtaIndicator(uint8_t r, uint8_t g, uint8_t b, uint8_t brightness = 80) {
  for (uint8_t i = 0; i < STRIP_COUNT; i++) {
    strip[i].setBrightness(brightness);
    strip[i].fill(strip[i].Color(r,g,b));
    strip[i].show();
  }
}
void restoreNormalVisualState() {
  showMatrix(wifiHasAddress() ? MATRIX_OK : MATRIX_WIFI);
  renderAll(true);
}
void updateOtaVisualState() {
  if (otaPrepareUntil && !otaPrepareModeActive() && !otaTransferActive) {
    otaPrepareUntil = 0;
    leaveOtaExclusiveMode();
    restoreNormalVisualState();
  }
  if (otaErrorIndicatorUntil && !otaErrorIndicatorActive() && !otaTransferActive) {
    otaErrorIndicatorUntil = 0;
    restoreNormalVisualState();
  }
}
void otaTransferStarted() {
  otaExclusiveMode = true;
  otaTransferActive = true;
  otaPrepareUntil = otaErrorIndicatorUntil = 0;
  otaLastTransferStartedAt = millis();
  otaLastErrorCode = 0;
  showMatrix(MATRIX_OTA);
}
void otaBeforeApply() {
  showMatrix(MATRIX_OK);
}
void otaTransferError(int code, const char*) {
  otaTransferActive = false;
  otaPrepareUntil = 0;
  otaLastErrorCode = code;
  otaLastErrorAt = millis();
  otaErrorIndicatorUntil = millis() + OTA_ERROR_INDICATOR_TIME;
  leaveOtaExclusiveMode();
  char message[96];
  snprintf(message, sizeof(message), "OTA hiba: %d - piros jelzes %lu mp", code,
    OTA_ERROR_INDICATOR_TIME / 1000UL);
  logEvent("error", message);
  showMatrix(MATRIX_ERROR);
}
void startOta() {
  if (!wifiHasAddress() || otaReady || !networkSettings.otaPassword[0]) return;
  ArduinoOTA.onStart(otaTransferStarted);
  ArduinoOTA.beforeApply(otaBeforeApply);
  ArduinoOTA.onError(otaTransferError);
  IPAddress otaIp = WiFi.localIP();
  ArduinoOTA.begin(otaIp, DEVICE_NAME, networkSettings.otaPassword,
    InternalStorage);
  otaReady = true;
  char ip[16], message[112];
  ipToText(otaIp, ip, sizeof(ip));
  snprintf(message, sizeof(message), "OTA fogado aktiv: %s:%u", ip,
    OTA_UPLOAD_PORT);
  logEvent("success", message);
}
bool prepareOtaService() {
  if (!wifiHasAddress()) return false;
  if (!otaReady) startOta();
  if (!otaReady) return false;
  otaRestartCount++;
  lastOtaRestartAt = millis();
  otaPrepareUntil = millis() + OTA_PREPARE_WINDOW;
  otaErrorIndicatorUntil = 0;
  enterOtaExclusiveMode();
  return true;
}

float effectScale(uint8_t speed) {
  return 0.25f + constrain(static_cast<int>(speed), 1, 100) / 100.0f * 3.75f;
}
unsigned long effectDuration(unsigned long base, uint8_t speed) {
  return max(1UL, static_cast<unsigned long>(base / effectScale(speed)));
}
uint32_t ledColor(uint8_t i, float scale = 1.0f) {
  return strip[i].Color(leds[i].red * scale, leds[i].green * scale,
    leds[i].blue * scale);
}
void render(uint8_t i) {
  if (!leds[i].enabled) { strip[i].clear(); strip[i].show(); return; }
  strip[i].setBrightness(leds[i].brightness);
  unsigned long now = millis();
  switch (leds[i].effect) {
    case BLINK: {
      bool on = (now / effectDuration(700, leds[i].speed)) % 2 == 0;
      strip[i].fill(on ? ledColor(i) : 0);
      break;
    }
    case BREATHE: {
      unsigned long period = effectDuration(2500, leds[i].speed);
      float phase = (now % period) / static_cast<float>(period);
      float level = phase < .5f ? phase * 2 : (1 - phase) * 2;
      strip[i].fill(ledColor(i, .08f + .92f * level));
      break;
    }
    case RAINBOW: {
      uint16_t offset = now / effectDuration(12, leds[i].speed);
      for (uint16_t p = 0; p < PIXELS; p++) {
        uint16_t hue = (p * 65535UL / PIXELS + offset * 256UL) & 0xFFFFUL;
        strip[i].setPixelColor(p, strip[i].gamma32(strip[i].ColorHSV(hue)));
      }
      break;
    }
    case CHASE: {
      strip[i].clear();
      uint16_t head = (now / effectDuration(35, leds[i].speed)) % PIXELS;
      for (uint8_t tail = 0; tail < 8; tail++)
        strip[i].setPixelColor((head + PIXELS - tail) % PIXELS,
          ledColor(i, (8 - tail) / 8.0f));
      break;
    }
    default: strip[i].fill(ledColor(i)); break;
  }
  strip[i].show();
}
void renderAll(bool force) {
  if (!force && millis() - lastFrame < EFFECT_FRAME) return;
  lastFrame = millis();
  for (uint8_t i = 0; i < STRIP_COUNT; i++) render(i);
}
void handlePir() {
#if ENABLE_PIR_SENSORS
  for (uint8_t i = 0; i < STRIP_COUNT; i++) {
    bool current = digitalRead(PIR_PINS[i]) == HIGH;
    if (current != pirRaw[i] && millis() - pirChanged[i] >= PIR_DEBOUNCE) {
      pirRaw[i] = current; pirChanged[i] = millis();
      if (current) { pirActive[i] = true; lastMotion[i] = millis(); }
    }
    if (pirActive[i] && millis() - lastMotion[i] >= PIR_TIMEOUT)
      pirActive[i] = false;
  }
#endif
}
void handleButtons() {
#if ENABLE_PHYSICAL_BUTTONS
  static unsigned long lastButton = 0;
  if (millis() - lastButton < 250) return;
  if (digitalRead(BUTTON_MODE) == LOW) {
    lastButton = millis();
    for (uint8_t i = 0; i < STRIP_COUNT; i++) {
      leds[i].effect = (leds[i].effect + 1) % 5; activateManualOverride(i);
    }
    renderAll(true);
  } else if (digitalRead(BUTTON_UP) == LOW) {
    lastButton = millis();
    for (uint8_t i = 0; i < STRIP_COUNT; i++) {
      leds[i].brightness = min(255, leds[i].brightness + 10);
      activateManualOverride(i);
    }
    renderAll(true);
  } else if (digitalRead(BUTTON_DOWN) == LOW) {
    lastButton = millis();
    for (uint8_t i = 0; i < STRIP_COUNT; i++) {
      leds[i].brightness = max(0, leds[i].brightness - 10);
      activateManualOverride(i);
    }
    renderAll(true);
  }
#endif
}

const char* statusText(int code) {
  switch (code) {
    case 200: return "200 OK"; case 202: return "202 Accepted";
    case 400: return "400 Bad Request";
    case 401: return "401 Unauthorized"; case 404: return "404 Not Found";
    case 405: return "405 Method Not Allowed"; case 408: return "408 Request Timeout";
    case 409: return "409 Conflict";
    case 410: return "410 Gone"; case 413: return "413 Payload Too Large";
    case 422: return "422 Unprocessable Content";
    case 503: return "503 Service Unavailable";
    default: return "500 Internal Server Error";
  }
}
bool writeClientChunk(WiFiClient& c, const uint8_t* data, size_t length) {
  if (!length) return true;
  size_t written = c.write(data, length);
  if (written != length) {
    httpWriteFailures++;
    return false;
  }
  return true;
}
bool writeClientBuffer(WiFiClient& c, const uint8_t* data, size_t length) {
  size_t offset = 0;
  while (offset < length) {
    size_t remaining = length - offset;
    size_t chunk = remaining < HTTP_WRITE_CHUNK_SIZE
      ? remaining
      : HTTP_WRITE_CHUNK_SIZE;
    if (!writeClientChunk(c, data + offset, chunk)) return false;
    offset += chunk;
    if (offset < length) delay(HTTP_WRITE_INTER_CHUNK_DELAY_MS);
  }
  return true;
}
bool sendJsonBuffer(WiFiClient& c, const char* body, size_t length, int code,
    uint32_t requestId) {
  int headerLength = snprintf(httpHeaderBuffer, sizeof(httpHeaderBuffer),
    "HTTP/1.1 %s\r\nContent-Type: application/json; charset=utf-8\r\n"
    "Connection: close\r\nCache-Control: no-store\r\n"
    "X-Request-Id: %lu\r\nContent-Length: %lu\r\n\r\n",
    statusText(code), static_cast<unsigned long>(requestId),
    static_cast<unsigned long>(length));
  if (headerLength <= 0 ||
      static_cast<size_t>(headerLength) >= sizeof(httpHeaderBuffer)) {
    httpWriteFailures++;
    return false;
  }
  if (!writeClientBuffer(
      c,
      reinterpret_cast<const uint8_t*>(httpHeaderBuffer),
      static_cast<size_t>(headerLength))) {
    return false;
  }
  if (!writeClientBuffer(
      c,
      reinterpret_cast<const uint8_t*>(body),
      length)) {
    return false;
  }
  c.flush();
  delay(HTTP_RESPONSE_SETTLE_DELAY_MS);
  return true;
}
void sendJsonLiteral(WiFiClient& c, const char* body, int code,
    uint32_t requestId) {
  sendJsonBuffer(c, body, strlen(body), code, requestId);
}
void sendErrorJson(WiFiClient& c, int code, const char* errorCode,
    const char* message, uint32_t requestId) {
  FixedBuffer b;
  resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
  appendFormat(b, "{\"success\":false,\"requestId\":%lu,\"error\":{\"code\":\"",
    static_cast<unsigned long>(requestId));
  appendJsonEscaped(b, errorCode);
  appendRaw(b, "\",\"message\":\"");
  appendJsonEscaped(b, message);
  appendRaw(b, "\"}}");
  if (!b.valid) {
    sendJsonLiteral(c, "{\"success\":false,\"error\":{\"code\":\"INTERNAL_ERROR\"}}",
      500, requestId);
    return;
  }
  sendJsonBuffer(c, b.data, b.length, code, requestId);
}
const char* authResultText(HttpAuthResult result) {
  switch (result) {
    case HTTP_AUTH_OK_HEADER: return "OK_HEADER";
    case HTTP_AUTH_OK_QUERY_FALLBACK: return "OK_QUERY_DEPRECATED";
    case HTTP_AUTH_MISSING: return "MISSING";
    case HTTP_AUTH_INVALID: return "INVALID";
    case HTTP_AUTH_PATH_REJECTED: return "PATH_REJECTED";
    case HTTP_AUTH_HEADER_INVALID: return "HEADER_INVALID";
    default: return "UNKNOWN";
  }
}
bool pollingPath(const char* path) {
  return !strcmp(path, "/api/v1/ping") ||
    !strcmp(path, "/api/v1/status") ||
    !strcmp(path, "/api/v1/logs") ||
    !strcmp(path, "/api/v1/ota/status");
}
void printHttpAudit(const HttpRequestContext& r, unsigned long duration) {
  char message[192];
  snprintf(message, sizeof(message), "#%lu %s %s %s AUTH=%s %d %lums",
    static_cast<unsigned long>(r.requestId), r.clientIp, r.method, r.path,
    authResultText(r.authResult), r.responseCode, duration);
  logEvent("http", message);
}
void flushHttpPollingSummary(bool force = false) {
  unsigned long now = millis();
  if (!httpSummaryStartedAt) httpSummaryStartedAt = now;
  if (!force && now - httpSummaryStartedAt < HTTP_POLLING_SUMMARY_INTERVAL) return;
  if (httpPollingRequests) {
    char message[192];
    snprintf(message, sizeof(message),
      "30s: polling=%lu success=%lu error=%lu avg=%lums",
      httpPollingRequests, httpPollingSuccess, httpPollingErrors,
      httpPollingTotalDuration / httpPollingRequests);
    logEvent("http", message);
  }
  httpPollingRequests = httpPollingSuccess = httpPollingErrors = 0;
  httpPollingTotalDuration = 0;
  httpSummaryStartedAt = now;
}
void finalizeHttpAudit(HttpRequestContext& r) {
  unsigned long duration = millis() - r.startedAt;
  copyText(lastHttpClientIp, sizeof(lastHttpClientIp), r.clientIp);
  copyText(lastHttpPath, sizeof(lastHttpPath), r.path);
  copyText(lastHttpMethod, sizeof(lastHttpMethod), r.method);
  copyText(lastHttpAuth, sizeof(lastHttpAuth), authResultText(r.authResult));
  lastHttpResponseCode = r.responseCode;
  lastHttpDurationMs = duration;
  lastHttpClientAt = millis();
  if (r.responseCode < 400) httpSuccessResponses++;
  else if (r.responseCode < 500) httpClientErrorResponses++;
  else httpServerErrorResponses++;
  r.polling = pollingPath(r.path);
  if (r.polling) {
    httpPollingRequests++;
    httpPollingTotalDuration += duration;
    if (r.responseCode < 400) httpPollingSuccess++; else httpPollingErrors++;
  }
  if (httpTraceEnabled || !r.polling || r.responseCode >= 400)
    printHttpAudit(r, duration);
  flushHttpPollingSummary(false);
}
void updateHttpTraceTimeout() {
  if (httpTraceEnabled && millis() - httpTraceStartedAt >= HTTP_TRACE_MAX_TIME) {
    httpTraceEnabled = false;
    logEvent("info", "HTTP trace automatikusan kikapcsolva 10 perc utan");
  }
}

bool buildStatusJson(size_t& bodyLength, uint32_t requestId) {
  FixedBuffer b;
  resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
  char fingerprint[16];
  fingerprintText(deviceKeyFingerprint, fingerprint, sizeof(fingerprint));

  appendFormat(b,
    "{\"success\":true,\"requestId\":%lu,",
    static_cast<unsigned long>(requestId));

  appendFormat(b,
    "\"connected\":%s,\"timesynced\":%s,",
    wifiHasAddress() ? "true" : "false",
    timeSynced ? "true" : "false");
  uint8_t clockDay = 0, clockHour = 0, clockMinute = 0;
  bool localClockAvailable = localScheduleTime(clockDay, clockHour, clockMinute);
  appendFormat(b,
    "\"clockEpoch\":%lu,\"clockDay\":%u,\"clockHour\":%u,\"clockMinute\":%u,",
    currentClockEpoch(), clockDay, clockHour, clockMinute);
  appendFormat(b,
    "\"clockLocalAvailable\":%s,\"ntpAttemptCount\":%lu,\"ntpFailureCount\":%lu,",
    localClockAvailable ? "true" : "false", ntpAttemptCount, ntpFailureCount);
  appendFormat(b,
    "\"ntpSuccessCount\":%lu,\"ntpLastSuccessAgeSeconds\":%lu,",
    ntpSuccessCount,
    ntpLastSuccessAt ? (millis() - ntpLastSuccessAt) / 1000UL : 0);
  appendFormat(b,
    "\"timezoneId\":\"%s\",\"utcOffsetMinutes\":%d,",
    timeSettings.timezoneId,
    utcOffsetMinutesForEpoch(currentClockEpoch()));
  appendFormat(b,
    "\"nextTransitionEpoch\":%lu,\"nextUtcOffsetMinutes\":%d,",
    static_cast<unsigned long>(timeSettings.nextTransitionEpoch),
    timeSettings.nextUtcOffsetMinutes);
  appendFormat(b,
    "\"ntpServer\":\"%s\",\"timeSettingsStored\":%s,",
    ntpLastServer[0] ? ntpLastServer : "",
    timeSettingsStored ? "true" : "false");
  appendFormat(b,
    "\"schedulerLastRunAgeSeconds\":%lu,\"schedulerLastAppliedAgeSeconds\":%lu,",
    schedulerLastRunAt ? (millis() - schedulerLastRunAt) / 1000UL : 0,
    schedulerLastAppliedAt ? (millis() - schedulerLastAppliedAt) / 1000UL : 0);
  appendFormat(b,
    "\"deviceId\":\"%s\",\"bootId\":\"%08lX\",",
    deviceId, static_cast<unsigned long>(bootId));
  appendFormat(b,
    "\"deviceName\":\"%s\",\"hostname\":\"\",\"localHostname\":\"\",",
    DEVICE_NAME);
  appendFormat(b,
    "\"ipAddress\":\"%u.%u.%u.%u\",\"mdnsEnabled\":false,",
    cachedWifiIp[0], cachedWifiIp[1], cachedWifiIp[2], cachedWifiIp[3]);
  appendFormat(b,
    "\"networkConfigStored\":%s,\"apiConfigStored\":%s,",
    networkSettingsStored ? "true" : "false",
    apiSettingsStored ? "true" : "false");
  appendFormat(b,
    "\"deviceKeyFingerprint\":\"%s\",\"scheduler\":\"arduino-eeprom\",",
    apiSettingsStored ? fingerprint : "");
  appendFormat(b,
    "\"scheduleCount\":%u,\"scheduleRevision\":%lu,",
    scheduleCount, static_cast<unsigned long>(scheduleRevision));
  appendFormat(b,
    "\"scheduleChecksum\":\"%08lX\",\"consoleLogCount\":%u,",
    static_cast<unsigned long>(scheduleChecksum(schedules, scheduleCount)),
    logSize);
  appendFormat(b,
    "\"consoleLastId\":%lu,\"firmwareVersion\":\"%s\",",
    static_cast<unsigned long>(nextLogId ? nextLogId - 1 : 0),
    FIRMWARE_VERSION);
  appendFormat(b,
    "\"firmwareFeature\":\"%s\",\"directApiVersion\":\"%s\",",
    FIRMWARE_FEATURE, DIRECT_API_VERSION);
  appendFormat(b,
    "\"buildDate\":\"%s\",\"buildTime\":\"%s\",",
    __DATE__, __TIME__);

  appendFormat(b,
    "\"httpPort\":%u,\"otaPort\":%u,\"mdnsPort\":%u,",
    HTTP_API_PORT, OTA_UPLOAD_PORT, MDNS_PORT);
  appendFormat(b,
    "\"otaEnabled\":%s,\"otaPasswordConfigured\":%s,",
    otaReady ? "true" : "false",
    networkSettings.otaPassword[0] ? "true" : "false");
  appendFormat(b,
    "\"otaPrepareActive\":%s,\"otaPrepareSecondsRemaining\":%lu,",
    otaPrepareModeActive() ? "true" : "false",
    otaPrepareSecondsRemaining());
  appendFormat(b,
    "\"otaTransferActive\":%s,\"otaLastErrorCode\":%d,",
    otaTransferActive ? "true" : "false", otaLastErrorCode);
  appendFormat(b,
    "\"apiProtected\":%s,\"queryKeyFallbackEnabled\":%s,",
    apiSettingsStored ? "true" : "false",
    API_ALLOW_QUERY_KEY_FALLBACK ? "true" : "false");
  appendFormat(b,
    "\"matrixEnabled\":true,\"pirSensorsEnabled\":%s,"
    "\"physicalButtonsEnabled\":%s,",
    ENABLE_PIR_SENSORS ? "true" : "false",
    ENABLE_PHYSICAL_BUTTONS ? "true" : "false");
  appendFormat(b,
    "\"uptime\":%lu,\"rssi\":%ld,",
    millis() / 1000UL,
    cachedWifiConnected ? cachedWifiRssi : 0);

  appendFormat(b,
    "\"http\":{\"requests\":%lu,\"timeouts\":%lu,\"rejected\":%lu,",
    httpRequests, httpTimeouts, httpRejected);
  appendFormat(b, "\"writeChunkBytes\":%u,",
    static_cast<unsigned int>(HTTP_WRITE_CHUNK_SIZE));
  appendFormat(b,
    "\"writeFailures\":%lu,\"successResponses\":%lu,",
    httpWriteFailures, httpSuccessResponses);
  appendFormat(b,
    "\"clientErrorResponses\":%lu,\"serverErrorResponses\":%lu,",
    httpClientErrorResponses, httpServerErrorResponses);
  appendFormat(b,
    "\"deviceKeyHeaderAccepted\":%lu,\"queryKeyFallbackAccepted\":%lu,",
    httpHeaderAuthAccepted, httpQueryFallbackAccepted);
  appendFormat(b,
    "\"traceEnabled\":%s,\"lastClientIp\":\"",
    httpTraceEnabled ? "true" : "false");
  appendJsonEscaped(b, lastHttpClientIp);
  appendRaw(b, "\",\"lastMethod\":\"");
  appendJsonEscaped(b, lastHttpMethod);
  appendRaw(b, "\",\"lastPath\":\"");
  appendJsonEscaped(b, lastHttpPath);
  appendRaw(b, "\",\"lastAuth\":\"");
  appendJsonEscaped(b, lastHttpAuth);
  appendFormat(b,
    "\",\"lastStatus\":%d,\"lastDurationMs\":%lu,",
    lastHttpResponseCode, lastHttpDurationMs);
  appendFormat(b,
    "\"lastClientAge\":%lu},\"strips\":[",
    lastHttpClientAt ? (millis() - lastHttpClientAt) / 1000UL : 0);

  for (uint8_t i = 0; i < STRIP_COUNT; i++) {
    if (i) appendChar(b, ',');
    appendFormat(b,
      "{\"id\":%u,\"enabled\":%s,\"brightness\":%u,",
      i + 1, leds[i].enabled ? "true" : "false", leds[i].brightness);
    appendFormat(b,
      "\"effect\":%u,\"speed\":%u,\"color\":[%u,%u,%u],",
      leds[i].effect, leds[i].speed,
      leds[i].red, leds[i].green, leds[i].blue);
    appendFormat(b,
      "\"manualOverride\":%s,\"manualOverrideMinutesRemaining\":%ld,",
      manualOverride[i] ? "true" : "false",
      static_cast<long>(manualOverrideMinutesRemaining(i)));
    appendFormat(b,
      "\"schedulerSelectedIndex\":%d,\"schedulerBlockedReason\":%u}",
      schedulerLastSelectedIndex[i], schedulerLastBlockedReason[i]);
  }

  appendRaw(b, "]}");
  bodyLength = b.length;
  return b.valid;
}
void sendStatusJson(WiFiClient& c, uint32_t requestId) {
  size_t length = 0;
  if (!buildStatusJson(length, requestId)) {
    sendErrorJson(c, 503, "RESPONSE_BUFFER_EXHAUSTED",
      "A statusz valasz nem fert el.", requestId);
    return;
  }
  sendJsonBuffer(c, httpBodyBuffer, length, 200, requestId);
}
void sendPingJson(WiFiClient& c, uint32_t requestId) {
  FixedBuffer b;
  resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
  appendFormat(b,
    "{\"success\":true,\"requestId\":%lu,\"deviceId\":\"%s\",",
    static_cast<unsigned long>(requestId), deviceId);
  appendFormat(b,
    "\"bootId\":\"%08lX\",\"firmwareVersion\":\"%s\",",
    static_cast<unsigned long>(bootId), FIRMWARE_VERSION);
  appendFormat(b,
    "\"directApiVersion\":\"%s\",\"uptime\":%lu}",
    DIRECT_API_VERSION, millis() / 1000UL);
  if (!b.valid) {
    sendErrorJson(c, 503, "RESPONSE_BUFFER_EXHAUSTED",
      "A ping valasz nem fert el.", requestId);
    return;
  }
  sendJsonBuffer(c, b.data, b.length, 200, requestId);
}
void sendCapabilitiesJson(WiFiClient& c, uint32_t requestId) {
  FixedBuffer b;
  resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
  appendFormat(b,
    "{\"success\":true,\"requestId\":%lu,\"deviceId\":\"%s\",",
    static_cast<unsigned long>(requestId), deviceId);
  appendFormat(b,
    "\"firmwareVersion\":\"%s\",\"directApiVersion\":\"%s\",",
    FIRMWARE_VERSION, DIRECT_API_VERSION);
  appendFormat(b,
    "\"hardware\":\"Arduino UNO R4 WiFi\",\"ledStrips\":%u,"
    "\"pixelsPerStrip\":%u,\"scheduleMax\":%u,",
    STRIP_COUNT, PIXELS, SCHEDULE_MAX);
  appendRaw(b, "\"scheduler\":\"arduino-eeprom\",");
  appendFormat(b, "\"httpResponseChunkBytes\":%u,",
    static_cast<unsigned int>(HTTP_WRITE_CHUNK_SIZE));
  appendFormat(b,
    "\"authentication\":{\"privatePath\":true,\"header\":\"%s\","
    "\"queryFallback\":%s},",
    API_DEVICE_KEY_HEADER,
    API_ALLOW_QUERY_KEY_FALLBACK ? "true" : "false");
  appendRaw(b,
    "\"features\":{\"diagnostics\":false,\"serialCommands\":false,"
    "\"secretProfileExport\":true,\"ota\":true,\"legacyApi\":true,"
    "\"jsonBodyApi\":true,\"eepromAbSlots\":true,"
    "\"remoteReboot\":true}}");
  if (!b.valid) {
    sendErrorJson(c, 503, "RESPONSE_BUFFER_EXHAUSTED",
      "A capabilities valasz nem fert el.", requestId);
    return;
  }
  sendJsonBuffer(c, b.data, b.length, 200, requestId);
}
void sendLogsJson(WiFiClient& c, uint32_t afterId, uint32_t requestId) {
  uint8_t selected[CONSOLE_LOGS_PER_RESPONSE] = {}, count = 0;
  uint32_t lastId = afterId;
  for (uint8_t offset = 0; offset < logSize && count < CONSOLE_LOGS_PER_RESPONSE;
      offset++) {
    uint8_t position = (logStart + offset) % LOG_CAPACITY;
    if (logs[position].id > afterId) {
      selected[count++] = position;
      lastId = logs[position].id;
    }
  }
  FixedBuffer b;
  resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
  appendFormat(b,
    "{\"success\":true,\"requestId\":%lu,\"lastId\":%lu,\"logs\":[",
    static_cast<unsigned long>(requestId), static_cast<unsigned long>(lastId));
  for (uint8_t i = 0; i < count; i++) {
    Log& entry = logs[selected[i]];
    if (i) appendChar(b, ',');
    appendFormat(b, "{\"id\":%lu,\"timestamp\":\"%lus\",\"type\":\"",
      static_cast<unsigned long>(entry.id), entry.timestamp);
    appendJsonEscaped(b, entry.type);
    appendRaw(b, "\",\"message\":\"");
    appendJsonEscaped(b, entry.message);
    appendRaw(b, "\"}");
  }
  appendRaw(b, "]}");
  if (!b.valid) sendErrorJson(c, 503, "RESPONSE_BUFFER_EXHAUSTED",
    "A log valasz nem fert el.", requestId);
  else sendJsonBuffer(c, b.data, b.length, 200, requestId);
}
void sendOtaStatusJson(WiFiClient& c, uint32_t requestId) {
  FixedBuffer b;
  resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
  appendFormat(b,
    "{\"success\":true,\"requestId\":%lu,",
    static_cast<unsigned long>(requestId));
  appendFormat(b,
    "\"firmwareVersion\":\"%s\",\"firmwareFeature\":\"%s\",",
    FIRMWARE_VERSION, FIRMWARE_FEATURE);
  appendFormat(b, "\"directApiVersion\":\"%s\",", DIRECT_API_VERSION);
  appendFormat(b,
    "\"buildDate\":\"%s\",\"buildTime\":\"%s\",",
    __DATE__, __TIME__);
  appendFormat(b,
    "\"ipAddress\":\"%u.%u.%u.%u\",\"otaPort\":%u,",
    cachedWifiIp[0], cachedWifiIp[1], cachedWifiIp[2], cachedWifiIp[3],
    OTA_UPLOAD_PORT);
  appendFormat(b,
    "\"otaEnabled\":%s,\"otaPrepareActive\":%s,",
    otaReady ? "true" : "false",
    otaPrepareModeActive() ? "true" : "false");
  appendFormat(b,
    "\"otaPrepareSecondsRemaining\":%lu,\"otaTransferActive\":%s,",
    otaPrepareSecondsRemaining(),
    otaTransferActive ? "true" : "false");
  appendFormat(b,
    "\"restartCount\":%lu,\"lastErrorCode\":%d,\"uptime\":%lu}",
    otaRestartCount, otaLastErrorCode, millis() / 1000UL);
  if (!b.valid) {
    sendErrorJson(c, 503, "RESPONSE_BUFFER_EXHAUSTED",
      "Az OTA status valasz nem fert el.", requestId);
    return;
  }
  sendJsonBuffer(c, b.data, b.length, 200, requestId);
}
int valueInt(const String& query, const char* name, int fallback,
    int low, int high) {
  int from = query.indexOf(String(name) + '=');
  if (from < 0) return fallback;
  from += strlen(name) + 1;
  int to = query.indexOf('&', from);
  if (to < 0) to = query.length();
  return constrain(static_cast<int>(query.substring(from, to).toInt()), low, high);
}
bool valueBool(const String& query, const char* name, bool fallback) {
  int from = query.indexOf(String(name) + '=');
  if (from < 0) return fallback;
  from += strlen(name) + 1;
  int to = query.indexOf('&', from);
  if (to < 0) to = query.length();
  String value = query.substring(from, to);
  return value == "1" || value == "true";
}
bool extractQueryValue(const String& query, const char* name, String& value) {
  String prefix = String(name) + "=";
  size_t start = 0;
  while (start < query.length()) {
    const int separator = query.indexOf('&', static_cast<unsigned int>(start));
    const size_t end = separator < 0
      ? query.length()
      : static_cast<size_t>(separator);
    String item = query.substring(
      static_cast<unsigned int>(start),
      static_cast<unsigned int>(end)
    );
    if (item.startsWith(prefix)) {
      value = item.substring(prefix.length());
      return true;
    }
    start = end + 1;
  }
  return false;
}
bool constantTimeEquals(const String& supplied, const char* expected) {
  size_t length = strlen(expected);
  if (supplied.length() != length) return false;
  uint8_t difference = 0;
  for (size_t i = 0; i < length; i++) difference |= supplied[i] ^ expected[i];
  return difference == 0;
}
String cleanQueryWithoutKey(const String& query) {
  String output;
  size_t start = 0;
  while (start < query.length()) {
    const int separator = query.indexOf('&', static_cast<unsigned int>(start));
    const size_t end = separator < 0
      ? query.length()
      : static_cast<size_t>(separator);
    String item = query.substring(
      static_cast<unsigned int>(start),
      static_cast<unsigned int>(end)
    );
    if (!item.startsWith("k=")) {
      if (output.length()) output += '&';
      output += item;
    }
    start = end + 1;
  }
  return output;
}
bool unwrapProtectedPath(const String& requested, String& apiPath,
    String& queryKey, bool& queryPresent) {
  if (!apiSettingsStored) return false;
  int queryAt = requested.indexOf('?');
  String base = queryAt < 0 ? requested : requested.substring(0, queryAt);
  String prefix = String(apiSettings.privatePath) + "/api/";
  if (!base.startsWith(prefix)) return false;
  apiPath = base.substring(strlen(apiSettings.privatePath));
  String query = queryAt < 0 ? "" : requested.substring(queryAt + 1);
  queryPresent = extractQueryValue(query, "k", queryKey);
  String clean = cleanQueryWithoutKey(query);
  if (clean.length()) apiPath += "?" + clean;
  return true;
}
HttpHeaderReadResult readHttpHeaders(WiFiClient& c, String& key, bool& present, size_t& contentLength, bool& jsonType) {
  char line[HTTP_HEADER_LINE_SIZE];
  size_t length = 0;
  unsigned long started = millis();
  key = "";
  present = false;
  contentLength = 0;
  jsonType = false;
  while (millis() - started < HTTP_READ_TIMEOUT) {
    if (!c.available()) { delay(1); continue; }
    char value = c.read();
    if (value == '\r') continue;
    if (value == '\n') {
      if (!length) return HTTP_HEADERS_OK;
      line[length] = 0;
      String header(line);
      int separator = header.indexOf(':');
      if (separator <= 0) return HTTP_HEADERS_INVALID;
      String name = header.substring(0, separator);
      name.trim();
      if (name.equalsIgnoreCase(API_DEVICE_KEY_HEADER)) {
        if (present) return HTTP_HEADERS_DUPLICATE_DEVICE_KEY;
        key = header.substring(separator + 1);
        key.trim();
        if (!key.length() || key.length() >= sizeof(apiSettings.sharedSecret))
          return HTTP_HEADERS_INVALID;
        present = true;
      } else if (name.equalsIgnoreCase("Content-Length")) {
        String supplied = header.substring(separator + 1);
        supplied.trim();
        contentLength = static_cast<size_t>(supplied.toInt());
      } else if (name.equalsIgnoreCase("Content-Type")) {
        String supplied = header.substring(separator + 1);
        supplied.trim();
        jsonType = supplied.startsWith("application/json");
      }
      length = 0;
    } else {
      if (length + 1 >= sizeof(line)) return HTTP_HEADERS_INVALID;
      line[length++] = value;
    }
  }
  return HTTP_HEADERS_TIMEOUT;
}
HttpAuthResult authenticateDeviceRequest(const String& header, bool headerPresent,
    const String& query, bool queryPresent) {
  if (headerPresent)
    return constantTimeEquals(header, apiSettings.sharedSecret)
      ? HTTP_AUTH_OK_HEADER : HTTP_AUTH_INVALID;
#if API_ALLOW_QUERY_KEY_FALLBACK
  if (queryPresent && constantTimeEquals(query, apiSettings.sharedSecret))
    return HTTP_AUTH_OK_QUERY_FALLBACK;
#else
  (void)query;
#endif
  return queryPresent ? HTTP_AUTH_INVALID : HTTP_AUTH_MISSING;
}
bool readRequestLine(WiFiClient& c, char* output, size_t size) {
  size_t length = 0;
  unsigned long started = millis();
  while (millis() - started < HTTP_READ_TIMEOUT) {
    if (!c.available()) { delay(1); continue; }
    char value = c.read();
    if (value == '\n') { output[length] = 0; return length > 0; }
    if (value == '\r') continue;
    if (length + 1 >= size) return false;
    output[length++] = value;
  }
  return false;
}
bool jsonLocateValue(const char* json, const char* key, const char*& value) {
  char token[48];
  snprintf(token, sizeof(token), "\"%s\"", key);
  const char* p = strstr(json, token);
  if (!p) return false;
  p = strchr(p + strlen(token), ':');
  if (!p) return false;
  p++;
  while (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n') p++;
  value = p;
  return true;
}
bool jsonReadInt(const char* json, const char* key, long& result) {
  const char* p;
  if (!jsonLocateValue(json, key, p)) return false;
  char* end = nullptr;
  result = strtol(p, &end, 10);
  return end != p;
}
bool jsonReadBool(const char* json, const char* key, bool& result) {
  const char* p;
  if (!jsonLocateValue(json, key, p)) return false;
  if (!strncmp(p, "true", 4)) { result = true; return true; }
  if (!strncmp(p, "false", 5)) { result = false; return true; }
  return false;
}
bool jsonReadString(const char* json, const char* key, char* output, size_t size) {
  const char* p;
  if (!jsonLocateValue(json, key, p) || *p != '\"') return false;
  p++;
  size_t n = 0;
  while (*p && *p != '\"' && n + 1 < size) output[n++] = *p++;
  output[n] = 0;
  return *p == '\"';
}
bool jsonReadColor(const char* json, uint8_t& r, uint8_t& g, uint8_t& b) {
  const char* p;
  if (!jsonLocateValue(json, "color", p) || *p != '[') return false;
  long values[3];
  for (uint8_t i = 0; i < 3; i++) {
    p++;
    while (*p == ' ') p++;
    char* end = nullptr;
    values[i] = strtol(p, &end, 10);
    if (end == p || values[i] < 0 || values[i] > 255) return false;
    p = end;
    while (*p == ' ') p++;
    if (i < 2 && *p != ',') return false;
  }
  while (*p == ' ') p++;
  if (*p != ']') return false;
  r = values[0]; g = values[1]; b = values[2];
  return true;
}
bool readHttpBody(WiFiClient& c, size_t length) {
  if (length >= HTTP_BODY_BUFFER_SIZE) return false;
  size_t received = 0;
  unsigned long started = millis();
  while (received < length && millis() - started < HTTP_READ_TIMEOUT * 4UL) {
    if (!c.available()) { delay(1); continue; }
    httpBodyBuffer[received++] = static_cast<char>(c.read());
  }
  httpBodyBuffer[received] = 0;
  return received == length;
}
void sendLedJson(WiFiClient& c, uint8_t index, uint32_t requestId) {
  FixedBuffer b; resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
  Led& led = leds[index];
  appendFormat(b, "{\"success\":true,\"requestId\":%lu,\"led\":{",
    static_cast<unsigned long>(requestId));
  appendFormat(b, "\"id\":%u,\"enabled\":%s,\"brightness\":%u,",
    index + 1, led.enabled ? "true" : "false", led.brightness);
  appendFormat(b, "\"effect\":%u,\"speed\":%u,\"color\":[%u,%u,%u],",
    led.effect, led.speed, led.red, led.green, led.blue);
  appendFormat(b, "\"manualOverride\":%s}}",
    manualOverride[index] ? "true" : "false");
  sendJsonBuffer(c, b.data, b.length, 200, requestId);
}
bool applyLedJson(uint8_t index, const char* body) {
  Led candidate = leds[index];
  bool booleanValue; long integerValue; uint8_t r,g,b;
  if (jsonReadBool(body, "enabled", booleanValue)) candidate.enabled = booleanValue;
  if (jsonReadInt(body, "brightness", integerValue)) {
    if (integerValue < 0 || integerValue > 255) return false;
    candidate.brightness = integerValue;
  }
  if (jsonReadInt(body, "effect", integerValue)) {
    if (integerValue < 0 || integerValue > 4) return false;
    candidate.effect = integerValue;
  }
  if (jsonReadInt(body, "speed", integerValue)) {
    if (integerValue < 1 || integerValue > 100) return false;
    candidate.speed = integerValue;
  }
  if (strstr(body, "\"color\"") && !jsonReadColor(body, r,g,b)) return false;
  if (jsonReadColor(body, r,g,b)) { candidate.red=r; candidate.green=g; candidate.blue=b; }
  leds[index] = candidate;
  activateManualOverride(index);
  renderAll(true);
  return true;
}
bool beginScheduleTransaction(uint32_t expectedRevision, uint8_t total) {
  if (scheduleTransactionActive || expectedRevision != scheduleRevision || total > SCHEDULE_MAX)
    return false;
  scheduleTransactionActive = true;
  scheduleTransactionId = (bootId ^ nextHttpRequestId ^ millis()) & 0x7FFFFFFFUL;
  scheduleTransactionExpectedRevision = expectedRevision;
  scheduleTransactionGeneration = scheduleRevision + 1;
  scheduleTransactionTotal = total;
  scheduleTransactionReceivedMask = 0;
  scheduleTransactionSlotOffset = inactiveScheduleSlotOffset();
  StorageSlotHeader h = {SCHEDULE_SLOT_MAGIC_V2, STORAGE_SCHEMA_VERSION,
    static_cast<uint16_t>(sizeof(StoredSchedule) * total),
    scheduleTransactionGeneration, 0, SLOT_STATE_WRITING, total, {0}};
  eepromWriteBytes(scheduleTransactionSlotOffset,
    reinterpret_cast<const uint8_t*>(&h), sizeof(h));
  return true;
}
bool writeScheduleTransactionRecord(uint8_t index, const StoredSchedule& entry) {
  if (!scheduleTransactionActive || index >= scheduleTransactionTotal) return false;
  uint16_t offset = scheduleTransactionSlotOffset + sizeof(StorageSlotHeader) +
    sizeof(StoredSchedule) * index;
  eepromWriteBytes(offset, reinterpret_cast<const uint8_t*>(&entry), sizeof(entry));
  if (!eepromBytesEqual(offset, reinterpret_cast<const uint8_t*>(&entry), sizeof(entry)))
    return false;
  scheduleTransactionReceivedMask |= (1ULL << index);
  return true;
}
bool commitScheduleTransaction() {
  if (!scheduleTransactionActive) return false;
  uint64_t expectedMask = scheduleTransactionTotal == 64 ? UINT64_MAX :
    (scheduleTransactionTotal == 0 ? 0 : ((1ULL << scheduleTransactionTotal) - 1ULL));
  if (scheduleTransactionReceivedMask != expectedMask) return false;
  uint32_t checksum = 2166136261UL;
  StoredSchedule entry = {};
  for (uint8_t i = 0; i < scheduleTransactionTotal; i++) {
    uint16_t offset = scheduleTransactionSlotOffset + sizeof(StorageSlotHeader) +
      sizeof(StoredSchedule) * i;
    eepromReadBytes(offset, reinterpret_cast<uint8_t*>(&entry), sizeof(entry));
    if (entry.day < 1 || entry.day > 7 || entry.hour > 23 || entry.minute > 59)
      return false;
    checksum = fnv1aUpdate(checksum, reinterpret_cast<const uint8_t*>(&entry), sizeof(entry));
  }
  StorageSlotHeader h = {SCHEDULE_SLOT_MAGIC_V2, STORAGE_SCHEMA_VERSION,
    static_cast<uint16_t>(sizeof(StoredSchedule) * scheduleTransactionTotal),
    scheduleTransactionGeneration, checksum, SLOT_STATE_VALID,
    scheduleTransactionTotal, {0}};
  eepromWriteBytes(scheduleTransactionSlotOffset,
    reinterpret_cast<const uint8_t*>(&h), sizeof(h));
  StorageSlotHeader verify = {};
  eepromReadBytes(scheduleTransactionSlotOffset,
    reinterpret_cast<uint8_t*>(&verify), sizeof(verify));
  if (!slotHeaderValid(verify, SCHEDULE_SLOT_MAGIC_V2,
      sizeof(StoredSchedule) * SCHEDULE_MAX) || verify.checksum != checksum) return false;
  for (uint8_t i = 0; i < scheduleTransactionTotal; i++) {
    uint16_t offset = scheduleTransactionSlotOffset + sizeof(StorageSlotHeader) +
      sizeof(StoredSchedule) * i;
    eepromReadBytes(offset, reinterpret_cast<uint8_t*>(&schedules[i]), sizeof(StoredSchedule));
  }
  scheduleCount = scheduleTransactionTotal;
  scheduleRevision = scheduleTransactionGeneration;
  activeScheduleSlotOffset = scheduleTransactionSlotOffset;
  schedulesStored = true;
  scheduleTransactionActive = false;
  refreshManualOverrideDeadlines();
  return true;
}
void cancelScheduleTransaction() {
  scheduleTransactionActive = false;
  scheduleTransactionReceivedMask = 0;
  scheduleTransactionTotal = 0;
}

int routeV1(WiFiClient& c, const String& method, const String& base,
    const String& query, const char* body, uint32_t requestId) {
  if (base == "/api/v1/ping" && method == "GET") { sendPingJson(c, requestId); return 200; }
  if (base == "/api/v1/capabilities" && method == "GET") { sendCapabilitiesJson(c, requestId); return 200; }
  if (base == "/api/v1/status" && method == "GET") { sendStatusJson(c, requestId); return 200; }
  if (base == "/api/v1/time/config" && method == "GET") {
    FixedBuffer b; resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
    appendFormat(b,
      "{\"success\":true,\"timezoneId\":\"%s\",\"currentUtcOffsetMinutes\":%d,",
      timeSettings.timezoneId, timeSettings.currentUtcOffsetMinutes);
    appendFormat(b,
      "\"nextTransitionEpoch\":%lu,\"nextUtcOffsetMinutes\":%d}",
      static_cast<unsigned long>(timeSettings.nextTransitionEpoch),
      timeSettings.nextUtcOffsetMinutes);
    sendJsonBuffer(c, b.data, b.length, 200, requestId);
    return 200;
  }
  if (base == "/api/v1/time/config" && method == "PUT") {
    char timezoneId[48] = {};
    long currentOffset = 0, nextTransition = 0, nextOffset = 0;
    if (!jsonReadString(body, "timezoneId", timezoneId, sizeof(timezoneId)) ||
        !jsonReadInt(body, "currentUtcOffsetMinutes", currentOffset) ||
        !jsonReadInt(body, "nextTransitionEpoch", nextTransition) ||
        !jsonReadInt(body, "nextUtcOffsetMinutes", nextOffset) ||
        !timezoneIdValid(timezoneId) ||
        currentOffset < -840 || currentOffset > 840 ||
        nextOffset < -840 || nextOffset > 840 ||
        nextTransition < 0) {
      sendErrorJson(c, 422, "VALIDATION_FAILED",
        "Ervenytelen idozona konfiguracio.", requestId);
      return 422;
    }
    copyText(timeSettings.timezoneId, sizeof(timeSettings.timezoneId), timezoneId);
    timeSettings.currentUtcOffsetMinutes = static_cast<int16_t>(currentOffset);
    timeSettings.nextTransitionEpoch = static_cast<uint32_t>(nextTransition);
    timeSettings.nextUtcOffsetMinutes = static_cast<int16_t>(nextOffset);
    saveTimeSettings();
    if (!timeSettingsStored) {
      sendErrorJson(c, 500, "EEPROM_VERIFY_FAILED",
        "Idozona EEPROM mentes sikertelen.", requestId);
      return 500;
    }
    lastScheduleMinute = 0xFFFFFFFFUL;
    reconcileArduinoSchedules(true);
    sendJsonLiteral(c, "{\"success\":true}", 200, requestId);
    return 200;
  }
  if (base == "/api/v1/logs" && method == "GET") {
    sendLogsJson(c, valueInt(query, "afterId", 0, 0, 2147483647), requestId); return 200;
  }
  if (base == "/api/v1/logs/clear" && method == "POST") {
    clearRamLogs(); sendJsonLiteral(c, "{\"success\":true}", 200, requestId); return 200;
  }
  if (base == "/api/v1/ota/status" && method == "GET") { sendOtaStatusJson(c, requestId); return 200; }
  if (base == "/api/v1/ota/prepare" && method == "POST") {
    bool prepared = prepareOtaService();
    sendJsonLiteral(c, prepared ? "{\"success\":true}" : "{\"success\":false}",
      prepared ? 200 : 503, requestId); return prepared ? 200 : 503;
  }
  if (base == "/api/v1/system/reboot" && method == "POST") {
    if (remoteRebootPending) {
      sendErrorJson(c, 409, "REBOOT_ALREADY_PENDING",
        "Az eszkoz ujrainditasa mar folyamatban van.", requestId);
      return 409;
    }
    remoteRebootPending = true;
    remoteRebootAt = millis() + REMOTE_REBOOT_DELAY_MS;
    sendJsonLiteral(c,
      "{\"success\":true,\"accepted\":true,\"rebooting\":true,"
      "\"delayMs\":750}", 202, requestId);
    return 202;
  }
  if (base == "/api/v1/leds" && method == "GET") { sendStatusJson(c, requestId); return 200; }
  if (base.startsWith("/api/v1/leds/") && base != "/api/v1/leds/all") {
    int id = base.substring(strlen("/api/v1/leds/")).toInt();
    if (id < 1 || id > STRIP_COUNT) { sendErrorJson(c,404,"LED_NOT_FOUND","Ismeretlen LED.",requestId); return 404; }
    if (method == "GET") { sendLedJson(c, id-1, requestId); return 200; }
    if (method == "PUT") {
      if (!applyLedJson(id-1, body)) { sendErrorJson(c,422,"VALIDATION_FAILED","Ervenytelen LED JSON.",requestId); return 422; }
      sendLedJson(c, id-1, requestId); return 200;
    }
  }
  if (base == "/api/v1/leds/all" && method == "POST") {
    for (uint8_t i=0;i<STRIP_COUNT;i++) if (!applyLedJson(i, body)) {
      sendErrorJson(c,422,"VALIDATION_FAILED","Ervenytelen kozos LED JSON.",requestId); return 422;
    }
    sendStatusJson(c, requestId); return 200;
  }
  if (base == "/api/v1/schedules/status" && method == "GET") {
    FixedBuffer b; resetBuffer(b,httpBodyBuffer,sizeof(httpBodyBuffer));
    appendFormat(b,"{\"success\":true,\"requestId\":%lu,\"count\":%u,\"max\":%u,",
      static_cast<unsigned long>(requestId),scheduleCount,SCHEDULE_MAX);
    appendFormat(b,"\"revision\":%lu,\"checksum\":\"%08lX\",\"stored\":%s,",
      static_cast<unsigned long>(scheduleRevision),
      static_cast<unsigned long>(scheduleChecksum(schedules,scheduleCount)),schedulesStored?"true":"false");
    appendFormat(b,"\"storageLayout\":\"ab-v2\",\"activeSlot\":%u,\"abSlots\":true,",
      activeScheduleSlotOffset);
    appendFormat(b,"\"readbackAfterWrite\":true,\"transactionActive\":%s}",
      scheduleTransactionActive?"true":"false");
    sendJsonBuffer(c,b.data,b.length,200,requestId); return 200;
  }
  if (base == "/api/v1/schedules" && method == "GET") {
    int legacyIndex=valueInt(query,"index",0,0,SCHEDULE_MAX);
    int index=valueInt(query,"offset",legacyIndex,0,SCHEDULE_MAX);
    int limit=valueInt(query,"limit",8,1,8);
    FixedBuffer b; resetBuffer(b,httpBodyBuffer,sizeof(httpBodyBuffer));
    appendFormat(b,"{\"success\":true,\"requestId\":%lu,\"revision\":%lu,\"count\":%u,\"entries\":[",
      static_cast<unsigned long>(requestId),static_cast<unsigned long>(scheduleRevision),scheduleCount);
    bool first=true;
    for(int i=index;i<scheduleCount && i<index+limit;i++) {
      String payload=encodeScheduleHex(schedules[i]);
      if(!first) appendChar(b,','); first=false;
      appendFormat(b,"{\"index\":%d,\"payload\":\"%s\"}",i,payload.c_str());
    }
    appendRaw(b,"]}"); sendJsonBuffer(c,b.data,b.length,200,requestId); return 200;
  }
  if (base == "/api/v1/schedules" && method == "DELETE") {
    memset(schedules,0,sizeof(schedules));
    if(!saveSchedules(0)){sendErrorJson(c,500,"EEPROM_VERIFY_FAILED","Schedule torles sikertelen.",requestId);return 500;}
    sendJsonLiteral(c,"{\"success\":true,\"count\":0}",200,requestId);return 200;
  }
  if (base == "/api/v1/schedules/transactions" && method == "POST") {
    long revision,total;
    if(!jsonReadInt(body,"expectedRevision",revision)||!jsonReadInt(body,"total",total)||
       revision<0||total<0||total>SCHEDULE_MAX) {
      sendErrorJson(c,422,"VALIDATION_FAILED","expectedRevision es total kotelezo.",requestId);return 422;
    }
    if(!beginScheduleTransaction(revision,total)) {
      sendErrorJson(c,409,"REVISION_CONFLICT","Schedule revision elteres vagy aktiv tranzakcio.",requestId);return 409;
    }
    FixedBuffer b;resetBuffer(b,httpBodyBuffer,sizeof(httpBodyBuffer));
    appendFormat(b,"{\"success\":true,\"requestId\":%lu,\"transactionId\":%lu,\"total\":%u}",
      static_cast<unsigned long>(requestId),static_cast<unsigned long>(scheduleTransactionId),scheduleTransactionTotal);
    sendJsonBuffer(c,b.data,b.length,200,requestId);return 200;
  }
  String txPrefix="/api/v1/schedules/transactions/";
  if(base.startsWith(txPrefix)) {
    String rest=base.substring(txPrefix.length());
    int slash=rest.indexOf('/');
    uint32_t txId=static_cast<uint32_t>((slash<0?rest:rest.substring(0,slash)).toInt());
    String action=slash<0?"":rest.substring(slash+1);
    if(!scheduleTransactionActive||txId!=scheduleTransactionId){sendErrorJson(c,404,"TRANSACTION_NOT_FOUND","Nincs ilyen schedule tranzakcio.",requestId);return 404;}
    if(action=="chunks"&&method=="PUT") {
      long index; char payload[64]; StoredSchedule entry={};
      if(!jsonReadInt(body,"index",index)||!jsonReadString(body,"payload",payload,sizeof(payload))||
         index<0||index>=scheduleTransactionTotal||!decodeScheduleHex(String(payload),entry)||
         !writeScheduleTransactionRecord(index,entry)) {
        sendErrorJson(c,422,"INVALID_SCHEDULE_CHUNK","Ervenytelen schedule chunk.",requestId);return 422;
      }
      sendJsonLiteral(c,"{\"success\":true}",200,requestId);return 200;
    }
    if(action=="commit"&&method=="POST") {
      if(!commitScheduleTransaction()){sendErrorJson(c,500,"EEPROM_VERIFY_FAILED","Schedule commit vagy readback sikertelen.",requestId);return 500;}
      sendJsonLiteral(c,"{\"success\":true}",200,requestId);return 200;
    }
    if(action==""&&method=="DELETE") {cancelScheduleTransaction();sendJsonLiteral(c,"{\"success\":true}",200,requestId);return 200;}
  }
  sendErrorJson(c,405,"METHOD_NOT_ALLOWED","Ismeretlen vegpont vagy hibas metodus.",requestId);
  return 405;
}
int routeRequest(WiFiClient& c, const String& method, const String& path,
    const char* body, uint32_t requestId) {
  int queryAt = path.indexOf('?');
  String base = queryAt < 0 ? path : path.substring(0, queryAt);
  String query = queryAt < 0 ? "" : path.substring(queryAt + 1);
  if (!base.startsWith("/api/v1/")) {
    sendErrorJson(c, 404, "DIRECT_API_V1_REQUIRED",
      "Direct API v1 endpoint required.", requestId);
    return 404;
  }
  return routeV1(c, method, base, query, body, requestId);
}

void handleHttp() {
  uint8_t batch = 0;
  while (batch < HTTP_CLIENTS_PER_LOOP) {
    WiFiClient c = server.available();
    if (!c) break;
    batch++;
    httpRequests++;
    HttpRequestContext request = {};
    request.requestId = nextHttpRequestId++;
    request.startedAt = millis();
    request.authResult = HTTP_AUTH_MISSING;
    request.responseCode = 500;
    copyText(request.method, sizeof(request.method), "-");
    copyText(request.path, sizeof(request.path), "-");
    IPAddress remote = c.remoteIP();
    ipToText(remote, request.clientIp, sizeof(request.clientIp));

    while (!c.available() &&
        millis() - request.startedAt < HTTP_FIRST_BYTE_TIMEOUT) delay(1);
    if (!c.available()) {
      httpTimeouts++;
      request.responseCode = 408;
      sendErrorJson(c, 408, "REQUEST_TIMEOUT",
        "A kliens nem kuldott request line-t idoben.", request.requestId);
      finalizeHttpAudit(request);
      c.stop();
      continue;
    }

    char requestLine[HTTP_REQUEST_LINE_SIZE];
    if (!readRequestLine(c, requestLine, sizeof(requestLine))) {
      httpRejected++;
      request.responseCode = 400;
      sendErrorJson(c, 400, "INVALID_REQUEST_LINE",
        "Ervenytelen vagy tul hosszu request line.", request.requestId);
      finalizeHttpAudit(request);
      c.stop();
      continue;
    }
    String line(requestLine);
    line.trim();
    int first = line.indexOf(' '), second = line.indexOf(' ', first + 1);
    if (first <= 0 || second <= first + 1) {
      httpRejected++;
      request.responseCode = 400;
      sendErrorJson(c, 400, "INVALID_REQUEST_LINE",
        "A request line nem bonthato.", request.requestId);
      finalizeHttpAudit(request);
      c.stop();
      continue;
    }
    String method = line.substring(0, first);
    String requestedPath = line.substring(first + 1, second);
    method.trim();
    requestedPath.trim();
    copyText(request.method, sizeof(request.method), method.c_str());

    if (method != "GET" && method != "POST" &&
        method != "PUT" && method != "DELETE") {
      httpRejected++;
      request.responseCode = 405;
      sendErrorJson(c, 405, "METHOD_NOT_ALLOWED",
        "Tamogatott metodusok: GET, POST, PUT, DELETE.", request.requestId);
      finalizeHttpAudit(request);
      c.stop();
      continue;
    }

    String path, queryKey;
    bool queryPresent = false;
    if (!unwrapProtectedPath(requestedPath, path, queryKey, queryPresent)) {
      httpRejected++;
      request.authResult = HTTP_AUTH_PATH_REJECTED;
      request.responseCode = 404;
      copyText(request.path, sizeof(request.path), "/private-path-not-found");
      sendErrorJson(c, 404, "PRIVATE_PATH_NOT_FOUND",
        "A privat API-utvonal hibas vagy nincs beallitva.", request.requestId);
      finalizeHttpAudit(request);
      c.stop();
      continue;
    }
    int queryAt = path.indexOf('?');
    String base = queryAt < 0 ? path : path.substring(0, queryAt);
    copyText(request.path, sizeof(request.path), base.c_str());

    String headerKey;
    bool headerPresent = false;
    c.setTimeout(HTTP_READ_TIMEOUT);
    size_t contentLength = 0; bool jsonType = false;
    HttpHeaderReadResult headerResult = readHttpHeaders(c, headerKey, headerPresent, contentLength, jsonType);
    if (headerResult != HTTP_HEADERS_OK) {
      request.authResult = HTTP_AUTH_HEADER_INVALID;
      if (headerResult == HTTP_HEADERS_TIMEOUT) {
        httpTimeouts++;
        request.responseCode = 408;
        sendErrorJson(c, 408, "HEADER_TIMEOUT",
          "A HTTP fejlecek nem erkeztek meg idoben.", request.requestId);
      } else if (headerResult == HTTP_HEADERS_DUPLICATE_DEVICE_KEY) {
        httpRejected++;
        request.responseCode = 400;
        sendErrorJson(c, 400, "DUPLICATE_DEVICE_KEY_HEADER",
          "Az X-Device-Key csak egyszer szerepelhet.", request.requestId);
      } else {
        httpRejected++;
        request.responseCode = 400;
        sendErrorJson(c, 400, "INVALID_HEADER",
          "Ervenytelen vagy tul hosszu HTTP fejlec.", request.requestId);
      }
      finalizeHttpAudit(request);
      c.stop();
      continue;
    }

    request.authResult = authenticateDeviceRequest(
      headerKey, headerPresent, queryKey, queryPresent);
    if (request.authResult != HTTP_AUTH_OK_HEADER) {
      httpRejected++;
      request.responseCode = 401;
      sendErrorJson(c, 401,
        request.authResult == HTTP_AUTH_MISSING
          ? "MISSING_DEVICE_KEY" : "INVALID_DEVICE_KEY",
        request.authResult == HTTP_AUTH_MISSING
          ? "Az X-Device-Key fejlec hianyzik."
          : "Az X-Device-Key erteke hibas.",
        request.requestId);
      finalizeHttpAudit(request);
      c.stop();
      continue;
    }

    httpHeaderAuthAccepted++;
    bool bodyRequired = method == "POST" || method == "PUT";
    if (contentLength >= HTTP_BODY_BUFFER_SIZE) {
      request.responseCode = 413;
      sendErrorJson(c, 413, "PAYLOAD_TOO_LARGE", "A JSON body tul nagy.", request.requestId);
      finalizeHttpAudit(request); c.stop(); continue;
    }
    if (bodyRequired && contentLength > 0 && !jsonType) {
      request.responseCode = 400;
      sendErrorJson(c, 400, "CONTENT_TYPE_REQUIRED", "Content-Type: application/json kotelezo.", request.requestId);
      finalizeHttpAudit(request); c.stop(); continue;
    }
    httpBodyBuffer[0] = 0;
    if (contentLength > 0 && !readHttpBody(c, contentLength)) {
      request.responseCode = 400;
      sendErrorJson(c, 400, "INCOMPLETE_BODY", "A JSON body hianyos.", request.requestId);
      finalizeHttpAudit(request); c.stop(); continue;
    }
    request.responseCode = routeRequest(c, method, path, httpBodyBuffer, request.requestId);
    finalizeHttpAudit(request);
    c.stop();
  }
  if (batch > httpMaxBatch) httpMaxBatch = batch;
}

void printSerialHelp() {
  Serial.println("[cmd] help | status | network | api status | api url | api test");
  Serial.println("[cmd] http stats | http trace on | http trace off");
  Serial.println("[cmd] profile show | profile export secrets | eeprom status");
  Serial.println("[cmd] time status | schedule status | schedule list");
  Serial.println("[cmd] logs | logs clear | ota status | reboot");
}
void printNetworkStatus() {
  char ip[16];
  ipToText(cachedWifiIp, ip, sizeof(ip));
  Serial.println("[cmd] NETWORK");
  Serial.print("Connected: "); Serial.println(wifiHasAddress() ? "YES" : "NO");
  Serial.print("IP: "); Serial.println(ip);
  Serial.print("RSSI: "); Serial.println(cachedWifiRssi);
  Serial.print("HTTP: "); Serial.println(HTTP_API_PORT);
  Serial.print("OTA: "); Serial.println(OTA_UPLOAD_PORT);
}
void printApiStatus() {
  char fingerprint[16];
  fingerprintText(deviceKeyFingerprint, fingerprint, sizeof(fingerprint));
  Serial.println("[cmd] API STATUS");
  Serial.print("Configured: "); Serial.println(apiSettingsStored ? "YES" : "NO");
  Serial.print("Version: "); Serial.println(DIRECT_API_VERSION);
  Serial.print("Header: "); Serial.println(API_DEVICE_KEY_HEADER);
  Serial.print("Fingerprint: "); Serial.println(apiSettingsStored ? fingerprint : "-");
  Serial.print("Query fallback: ");
  Serial.println(API_ALLOW_QUERY_KEY_FALLBACK ? "DEPRECATED/ON" : "OFF");
}
void printApiUrls() {
  if (!wifiHasAddress() || !apiSettingsStored) {
    Serial.println("[error] WiFi vagy API beallitas hianyzik.");
    return;
  }
  char ip[16];
  ipToText(cachedWifiIp, ip, sizeof(ip));
  Serial.print("[cmd] Direct v1: http://"); Serial.print(ip); Serial.print(':');
  Serial.print(HTTP_API_PORT); Serial.print(apiSettings.privatePath);
  Serial.println("/api/v1/status");
  Serial.print("[cmd] Header: "); Serial.println(API_DEVICE_KEY_HEADER);
}
void printApiSelfTest() {
  Serial.println("[cmd] API SELF TEST");
  Serial.print("API checksum: ");
  Serial.println(apiSettingsValid(apiSettings) ? "OK" : "FAILED");
  Serial.print("Private path: ");
  Serial.println(privatePathValid(apiSettings.privatePath) ? "OK" : "FAILED");
  Serial.print("Device key: ");
  Serial.println(apiSecretValid(apiSettings.sharedSecret) ? "OK" : "FAILED");
  Serial.print("HTTP server: ");
  Serial.println(wifiHasAddress() ? "LISTENING" : "NO NETWORK");
}
void printHttpStats() {
  Serial.println("[cmd] HTTP STATS");
  Serial.print("Requests: "); Serial.println(httpRequests);
  Serial.print("Success: "); Serial.println(httpSuccessResponses);
  Serial.print("Client errors: "); Serial.println(httpClientErrorResponses);
  Serial.print("Server errors: "); Serial.println(httpServerErrorResponses);
  Serial.print("Timeouts: "); Serial.println(httpTimeouts);
  Serial.print("Rejected: "); Serial.println(httpRejected);
  Serial.print("Write failures: "); Serial.println(httpWriteFailures);
  Serial.print("Header auth: "); Serial.println(httpHeaderAuthAccepted);
  Serial.print("Query fallback: "); Serial.println(httpQueryFallbackAccepted);
  Serial.print("Trace: "); Serial.println(httpTraceEnabled ? "ON" : "OFF");
  Serial.print("Last: "); Serial.print(lastHttpClientIp); Serial.print(' ');
  Serial.print(lastHttpMethod); Serial.print(' '); Serial.print(lastHttpPath);
  Serial.print(" AUTH="); Serial.print(lastHttpAuth);
  Serial.print(" STATUS="); Serial.print(lastHttpResponseCode);
  Serial.print(" DURATION="); Serial.print(lastHttpDurationMs); Serial.println("ms");
}
void printProfileShow() {
  char ip[16], fingerprint[16];
  ipToText(cachedWifiIp, ip, sizeof(ip));
  fingerprintText(deviceKeyFingerprint, fingerprint, sizeof(fingerprint));
  Serial.println("[cmd] PROFILE");
  Serial.println("{");
  Serial.println("  \"schemaVersion\": 1,");
  Serial.print("  \"deviceId\": \""); Serial.print(deviceId); Serial.println("\",");
  Serial.println("  \"name\": \"Beta Arduino\",");
  Serial.print("  \"localHost\": \""); Serial.print(ip); Serial.println("\",");
  Serial.print("  \"localPort\": "); Serial.print(HTTP_API_PORT); Serial.println(",");
  Serial.println("  \"apiVersion\": 1,");
  Serial.print("  \"apiPrivatePathConfigured\": ");
  Serial.print(apiSettingsStored ? "true" : "false"); Serial.println(",");
  Serial.print("  \"deviceKeyConfigured\": ");
  Serial.print(apiSettingsStored ? "true" : "false"); Serial.println(",");
  Serial.print("  \"deviceKeyFingerprint\": \"");
  Serial.print(apiSettingsStored ? fingerprint : ""); Serial.println("\",");
  Serial.print("  \"otaHost\": \""); Serial.print(ip); Serial.println("\",");
  Serial.print("  \"otaPort\": "); Serial.print(OTA_UPLOAD_PORT); Serial.println(",");
  Serial.print("  \"otaPasswordConfigured\": ");
  Serial.println(networkSettings.otaPassword[0] ? "true" : "false");
  Serial.println("}");
}
void exportSecretProfile() {
  if (!apiSettingsStored || !networkSettingsStored) {
    Serial.println("[error] Ervenyes API es OTA konfiguracio kell.");
    return;
  }
  char ip[16];
  ipToText(cachedWifiIp, ip, sizeof(ip));
  Serial.println("[warn] A kovetkezo blokk API- es OTA-titkot tartalmaz.");
  Serial.println("[warn] Ne masold nyilvanos chatbe, logba vagy GitHubra.");
  Serial.println("[profile-secret-begin]");
  Serial.println("{");
  Serial.println("  \"schemaVersion\": 1,");
  Serial.print("  \"deviceId\": \""); Serial.print(deviceId); Serial.println("\",");
  Serial.println("  \"name\": \"Beta Arduino\",");
  Serial.print("  \"localHost\": \""); Serial.print(ip); Serial.println("\",");
  Serial.print("  \"localPort\": "); Serial.print(HTTP_API_PORT); Serial.println(",");
  Serial.println("  \"remoteHost\": \"\",");
  Serial.println("  \"remotePort\": 0,");
  Serial.println("  \"apiVersion\": 1,");
  Serial.print("  \"apiPrivatePath\": \"");
  Serial.print(apiSettings.privatePath); Serial.println("\",");
  Serial.print("  \"deviceKey\": \"");
  Serial.print(apiSettings.sharedSecret); Serial.println("\",");
  Serial.print("  \"otaHost\": \""); Serial.print(ip); Serial.println("\",");
  Serial.print("  \"otaPort\": "); Serial.print(OTA_UPLOAD_PORT); Serial.println(",");
  Serial.print("  \"otaPassword\": \"");
  Serial.print(networkSettings.otaPassword); Serial.println("\"");
  Serial.println("}");
  Serial.println("[profile-secret-end]");
}
void printUtcDateTime(const char* label, unsigned long epoch) {
  Serial.print(label);
  if (!epoch) { Serial.println("UNAVAILABLE"); return; }
  time_t raw = static_cast<time_t>(epoch);
  tm value = *gmtime(&raw);
  char text[32];
  snprintf(text, sizeof(text), "%04d-%02d-%02d %02d:%02d:%02d",
    value.tm_year + 1900, value.tm_mon + 1, value.tm_mday,
    value.tm_hour, value.tm_min, value.tm_sec);
  Serial.println(text);
}
void printTimeStatus() {
  Serial.println("[cmd] TIME STATUS");
  unsigned long utcEpoch = currentClockEpoch();
  unsigned long localEpoch = localClockEpoch();
  int16_t activeOffset = utcOffsetMinutesForEpoch(utcEpoch);
  int16_t nextOffset = timeSettings.nextUtcOffsetMinutes;
  uint32_t nextTransition = timeSettings.nextTransitionEpoch;
  bool dstActive = false;
  int16_t derivedOffset = activeOffset;
  if (autonomousTimezoneState(utcEpoch, derivedOffset, nextTransition, nextOffset, dstActive))
    activeOffset = derivedOffset;
  Serial.print("Time synced: "); Serial.println(timeSynced ? "YES" : "NO");
  Serial.print("UTC epoch: "); Serial.println(utcEpoch);
  printUtcDateTime("UTC date/time: ", utcEpoch);
  printUtcDateTime("Local date/time: ", localEpoch);
  Serial.print("Timezone: "); Serial.println(timeSettings.timezoneId);
  Serial.print("Rule source: ");
  Serial.println(isCentralEuropeanTimezone(timeSettings.timezoneId) ? "ARDUINO-CET/CEST" : "TAURI-PROVIDED");
  Serial.print("Active UTC offset minutes: "); Serial.println(activeOffset);
  Serial.print("DST active: "); Serial.println(dstActive ? "YES" : "NO");
  Serial.print("Next transition epoch: "); Serial.println(nextTransition);
  printUtcDateTime("Next transition UTC: ", nextTransition);
  Serial.print("Next UTC offset minutes: "); Serial.println(nextOffset);
  Serial.print("Last NTP source: "); Serial.println(ntpLastServer[0] ? ntpLastServer : "-");
  Serial.print("Last NTP sync age seconds: ");
  Serial.println(ntpLastSuccessAt ? (millis() - ntpLastSuccessAt) / 1000UL : 0);
  Serial.print("Scheduler last audit age seconds: ");
  Serial.println(schedulerLastRunAt ? (millis() - schedulerLastRunAt) / 1000UL : 0);
  for (uint8_t led = 0; led < STRIP_COUNT; led++) {
    Serial.print("LED"); Serial.print(led + 1);
    Serial.print(" selectedIndex="); Serial.print(schedulerLastSelectedIndex[led]);
    Serial.print(" manualOverride="); Serial.print(manualOverride[led] ? 1 : 0);
    Serial.print(" blockedReason="); Serial.print(schedulerLastBlockedReason[led]);
    Serial.print(" enabled="); Serial.print(leds[led].enabled ? 1 : 0);
    Serial.print(" brightness="); Serial.println(leds[led].brightness);
  }
}
void printEepromStatus() {
  Serial.println("[cmd] EEPROM STATUS");
  Serial.print("Bytes: "); Serial.println(EEPROM.length());
  Serial.print("Network checksum: ");
  Serial.println(networkSettingsValid(networkSettings) ? "OK" : "FAILED");
  Serial.print("Schedule offset: "); Serial.println(SCHEDULE_EEPROM_OFFSET);
  Serial.print("Schedule checksum: ");
  Serial.println(scheduleChecksum(schedules, scheduleCount), HEX);
  Serial.print("API offset: "); Serial.println(API_SETTINGS_EEPROM_OFFSET);
  Serial.print("API checksum: ");
  Serial.println(apiSettingsValid(apiSettings) ? "OK" : "FAILED");
  Serial.print("A/B config slot: "); Serial.println(activeConfigSlotOffset);
  Serial.print("A/B schedule slot: "); Serial.println(activeScheduleSlotOffset);
  Serial.println("A/B slots: IMPLEMENTED (schema v2)");
  Serial.println("Write readback: IMPLEMENTED");
}
void printScheduleStatus() {
  Serial.println("[cmd] SCHEDULE STATUS");
  Serial.print("Count: "); Serial.print(scheduleCount); Serial.print(" / ");
  Serial.println(SCHEDULE_MAX);
  Serial.print("Revision: "); Serial.println(scheduleRevision);
  Serial.print("Checksum: ");
  Serial.println(scheduleChecksum(schedules, scheduleCount), HEX);
  Serial.println("Storage: ab-v2 (legacy-4.1 import compatible)");
  uint8_t day = 0, hour = 0, minute = 0;
  if (localScheduleTime(day, hour, minute)) {
    Serial.print("Local day/time: "); Serial.print(day); Serial.print(' ');
    if (hour < 10) Serial.print('0');
    Serial.print(hour); Serial.print(':');
    if (minute < 10) Serial.print('0');
    Serial.println(minute);
    Serial.print("UTC offset minutes: ");
    Serial.println(utcOffsetMinutesForEpoch(currentClockEpoch()));
  } else Serial.println("Local day/time: UNSYNCED");
  Serial.print("Last audit age seconds: ");
  Serial.println(schedulerLastRunAt ? (millis() - schedulerLastRunAt) / 1000UL : 0);
  for (uint8_t led = 0; led < STRIP_COUNT; led++) {
    Serial.print("LED"); Serial.print(led + 1);
    Serial.print(" selectedIndex="); Serial.print(schedulerLastSelectedIndex[led]);
    Serial.print(" manualOverride="); Serial.print(manualOverride[led] ? 1 : 0);
    Serial.print(" blockedReason="); Serial.println(schedulerLastBlockedReason[led]);
  }
}
void printScheduleList() {
  // Release build: verbose USB schedule report disabled.
  for (uint8_t i = 0; i < scheduleCount; i++) {
    Serial.print("[cmd] #"); Serial.print(i); Serial.print(" day=");
    Serial.print(schedules[i].day); Serial.print(" time=");
    if (schedules[i].hour < 10) Serial.print('0');
    Serial.print(schedules[i].hour); Serial.print(':');
    if (schedules[i].minute < 10) Serial.print('0');
    Serial.print(schedules[i].minute);
    for (uint8_t led = 0; led < STRIP_COUNT; led++) {
      StoredLed& value = schedules[i].leds[led];
      Serial.print(" | LED"); Serial.print(led + 1);
      Serial.print(" apply="); Serial.print(value.apply);
      Serial.print(" active="); Serial.print(value.enabled);
      Serial.print(" br="); Serial.print(value.brightness);
      Serial.print(" fx="); Serial.print(value.effect);
    }
    Serial.println();
  }
}
void printRamLogs() {
  Serial.print("[cmd] RAM LOGS: "); Serial.println(logSize);
  for (uint8_t offset = 0; offset < logSize; offset++) {
    uint8_t p = (logStart + offset) % LOG_CAPACITY;
    Serial.print('#'); Serial.print(logs[p].id); Serial.print(' ');
    Serial.print(logs[p].timestamp); Serial.print("s [");
    Serial.print(logs[p].type); Serial.print("] ");
    Serial.println(logs[p].message);
  }
}
void printOtaStatus() {
  Serial.println("[cmd] OTA STATUS");
  Serial.print("Ready: "); Serial.println(otaReady ? "YES" : "NO");
  Serial.print("Port: "); Serial.println(OTA_UPLOAD_PORT);
  Serial.print("Password configured: ");
  Serial.println(networkSettings.otaPassword[0] ? "YES" : "NO");
  Serial.print("Prepare active: ");
  Serial.println(otaPrepareModeActive() ? "YES" : "NO");
  Serial.print("Transfer active: ");
  Serial.println(otaTransferActive ? "YES" : "NO");
  Serial.print("Last error: "); Serial.println(otaLastErrorCode);
}
void processPendingRemoteReboot() {
  if (!remoteRebootPending) return;
  if (static_cast<long>(millis() - remoteRebootAt) < 0) return;
  remoteRebootPending = false;
  logEvent("cmd", "Tavoli API ujrainditas vegrehajtasa");
  rebootDevice();
}
void rebootDevice() {
  Serial.println("[cmd] Ujrainditas...");
  Serial.flush();
  delay(100);
#if defined(ARDUINO_ARCH_RENESAS)
  NVIC_SystemReset();
#else
  void (*resetFunction)(void) = 0;
  resetFunction();
#endif
}
void executeSerialCommand(const char* command) {
  if (!command || !command[0]) return;
  if (!strcmp(command, "help")) printSerialHelp();
  else if (!strcmp(command, "status")) printConnectionBlock();
  else if (!strcmp(command, "network")) printNetworkStatus();
  else if (!strcmp(command, "api status")) printApiStatus();
  else if (!strcmp(command, "api url")) printApiUrls();
  else if (!strcmp(command, "api test")) printApiSelfTest();
  else if (!strcmp(command, "http stats")) printHttpStats();
  else if (!strcmp(command, "http trace on")) {
    httpTraceEnabled = true;
    httpTraceStartedAt = millis();
    logEvent("info", "HTTP trace bekapcsolva, maximum 10 percre");
  } else if (!strcmp(command, "http trace off")) {
    httpTraceEnabled = false;
    logEvent("info", "HTTP trace kikapcsolva");
  } else if (!strcmp(command, "profile show")) printProfileShow();
  else if (!strcmp(command, "profile export secrets")) exportSecretProfile();
  else if (!strcmp(command, "eeprom status")) printEepromStatus();
  else if (!strcmp(command, "time status")) printTimeStatus();
  else if (!strcmp(command, "schedule status")) printScheduleStatus();
  else if (!strcmp(command, "schedule list")) printScheduleList();
  else if (!strcmp(command, "logs")) printRamLogs();
  else if (!strcmp(command, "logs clear")) {
    clearRamLogs();
    Serial.println("[cmd] RAM log torolve.");
  } else if (!strcmp(command, "ota status")) printOtaStatus();
  else if (!strcmp(command, "reboot")) rebootDevice();
  else {
    Serial.print("[error] Ismeretlen parancs: ");
    Serial.println(command);
    Serial.println("[cmd] Hasznald: help");
  }
}
void handleSerialCommands() {
  while (Serial.available()) {
    char value = Serial.read();
    if (value == '\r') continue;
    if (value == '\n') {
      serialCommandBuffer[serialCommandLength] = 0;
      executeSerialCommand(serialCommandBuffer);
      serialCommandLength = 0;
      serialCommandBuffer[0] = 0;
    } else if (serialCommandLength + 1 >= sizeof(serialCommandBuffer)) {
      serialCommandLength = 0;
      Serial.println("[error] Serial parancs tul hosszu.");
    } else {
      serialCommandBuffer[serialCommandLength++] = value;
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  buildDeviceIdentity();
  for (uint8_t i = 0; i < STRIP_COUNT; i++) {
    strip[i].begin();
    strip[i].clear();
    strip[i].show();
    leds[i] = {false, 60, STATIC, 50, 0, 0, 255};
#if ENABLE_PIR_SENSORS
    pinMode(PIR_PINS[i], INPUT);
#endif
  }
#if ENABLE_PHYSICAL_BUTTONS
  pinMode(BUTTON_MODE, INPUT_PULLUP);
  pinMode(BUTTON_UP, INPUT_PULLUP);
  pinMode(BUTTON_DOWN, INPUT_PULLUP);
#endif
  matrix.begin();
  showMatrix(MATRIX_BOOT);
  logEvent("success", "Arduino LED Controller indul");
  char info[160];
  snprintf(info, sizeof(info), "Firmware: %s | Arduino UNO R4 WiFi",
    FIRMWARE_VERSION);
  logEvent("info", info);
  snprintf(info, sizeof(info), "Build: %s %s | funkcio: %s",
    __DATE__, __TIME__, FIRMWARE_FEATURE);
  logEvent("info", info);
  loadPersistentConfig();
  loadTimeSettings();
  loadSchedules();
  connectWifi();
  startNtpUdpService();
  server.begin();
  logEvent("success", "HTTP szerver elinditva a 80/TCP porton");
  logEvent("info", "Serial diagnosztika aktiv; parancslista: help");
}
void loop() {
  if (wifiHasAddress()) {
    startOta();
    if (otaReady) ArduinoOTA.poll();
  }

  // OTA Exclusive Mode must still service its prepare timeout. If no uploader
  // connects within the prepare window, updateOtaVisualState() leaves exclusive
  // mode and restores the normal runtime without requiring a reboot.
  updateOtaVisualState();
  if (otaExclusiveMode || otaTransferActive) return;
  if (otaPrepareModeActive()) return;

  // Release build: USB command diagnostics disabled.
  updateHttpTraceTimeout();
  refreshWifiTelemetry(false);

  if (wifiHasAddress()) {
    reportWifiConnected();
    handleHttp();
    processPendingRemoteReboot();
    serviceClockSync(false);
    runArduinoSchedules();
  }

  if (!wifiHasAddress()) {
    wifiReported = false;
    otaTransferActive = false;
    otaExclusiveMode = false;
    otaPrepareUntil = 0;
    stopNtpUdpService();
    if (millis() - lastWifi > WIFI_RETRY) {
      otaReady = false;
      connectWifi();
    }
  }

  if (!otaErrorIndicatorActive()) {
    handlePir();
    handleButtons();
    renderAll(false);
  }
  flushHttpPollingSummary(false);
}
