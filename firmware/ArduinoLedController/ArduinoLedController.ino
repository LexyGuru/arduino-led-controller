/*
 * Arduino LED Controller – 5.0.1-beta.1
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

#define FIRMWARE_VERSION "5.0.1-beta.1"
#define FIRMWARE_FEATURE "f14-direct-api-v1-only-storage-udp-ntp-dst-ota-exclusive-v191-matrix-neopixel-ota-led-feedback-bootgen-sizeopt-schedule-progress-diag"
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
constexpr uint16_t BOOT_GENERATION_EEPROM_OFFSET = 5120;
constexpr uint8_t BOOT_GENERATION_SLOT_COUNT = 64;
constexpr uint16_t OTA_SUCCESS_MARKER_EEPROM_OFFSET = 5632;
constexpr uint32_t OTA_SUCCESS_MARKER_MAGIC = 0x4F54414FUL;
constexpr unsigned long OTA_BOOT_SUCCESS_INDICATOR_TIME = 5000UL;
constexpr uint32_t BOOT_GENERATION_PUBLIC_MAX = 1000000UL;
constexpr uint32_t BOOT_GENERATION_CHECK_MAGIC = 0xB007C0DEUL;
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
constexpr unsigned long NTP_SYNC_INTERVAL_MS = 10UL * 60UL * 1000UL;
constexpr unsigned long NTP_INITIAL_RETRY_INTERVAL_MS = 30000UL;
constexpr unsigned long NTP_UDP_TIMEOUT_MS = 2500UL;
constexpr uint16_t NTP_LOCAL_PORT = 2391;
constexpr uint16_t NTP_REMOTE_PORT = 123;
constexpr uint32_t NTP_UNIX_OFFSET = 2208988800UL;
constexpr unsigned long NTP_VALID_EPOCH_MIN = 1700000000UL;
constexpr uint8_t HTTP_CLIENTS_PER_LOOP = 1;
constexpr uint8_t LOG_CAPACITY = 12;
constexpr uint8_t CONSOLE_LOGS_PER_RESPONSE = 8;
constexpr size_t HTTP_BODY_BUFFER_SIZE = 3072;
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
struct __attribute__((packed)) BootGenerationRecord {
  uint32_t sequence;
  uint32_t checksum;
};
static_assert(sizeof(StorageSlotHeader) == 24, "StorageSlotHeader layout changed");
static_assert(sizeof(BootGenerationRecord) == 8, "BootGenerationRecord layout changed");
static_assert(BOOT_GENERATION_EEPROM_OFFSET +
    BOOT_GENERATION_SLOT_COUNT * sizeof(BootGenerationRecord) <= 8192,
  "Boot generation ring exceeds UNO R4 EEPROM");
static_assert(sizeof(ConfigPayload) + sizeof(StorageSlotHeader) <= CONFIG_SLOT_SIZE,
  "Config A/B slot too small");
static_assert(sizeof(StoredSchedule) * SCHEDULE_MAX + sizeof(StorageSlotHeader) <= SCHEDULE_SLOT_SIZE,
  "Schedule A/B slot too small");
static_assert(sizeof(StoredLed) == 8, "StoredLed EEPROM layout changed");
static_assert(sizeof(StoredSchedule) == 27, "StoredSchedule EEPROM layout changed");
static_assert(sizeof(ScheduleHeader) == 10, "ScheduleHeader EEPROM layout changed");
static_assert(LOG_CAPACITY <= 32, "F14.1 RAM log capacity is too large");
static_assert(HTTP_BODY_BUFFER_SIZE <= 3072, "F14.1 HTTP buffer is too large");
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
void showOtaIndicator(uint8_t r, uint8_t g, uint8_t b, uint8_t brightness = 80);

Adafruit_NeoPixel strip[STRIP_COUNT] = {
  Adafruit_NeoPixel(PIXELS, LED_PINS[0], NEO_GRB + NEO_KHZ800),
  Adafruit_NeoPixel(PIXELS, LED_PINS[1], NEO_GRB + NEO_KHZ800),
  Adafruit_NeoPixel(PIXELS, LED_PINS[2], NEO_GRB + NEO_KHZ800)
};
ArduinoLEDMatrix matrix;
WiFiServer server(HTTP_API_PORT);
WiFiUDP ntpUdp;

const uint8_t MATRIX_BOOT[12] = {0x0F,0x01,0x08,0x29,0x44,0x62,0x46,0x22,0x94,0x10,0x80,0xF0};
const uint8_t MATRIX_WIFI[12] = {0x06,0x01,0x98,0x20,0x44,0xF2,0x90,0x90,0x60,0x09,0x00,0x60};
const uint8_t MATRIX_OK[12] = {0x00,0x00,0x02,0x00,0x40,0x08,0x81,0x04,0x20,0x24,0x01,0x80};
const uint8_t MATRIX_OTA[12] = {0x06,0x00,0xF0,0x19,0x83,0x9C,0x0F,0x00,0x60,0x06,0x00,0x60};
const uint8_t MATRIX_ERROR[12] = {0x80,0x14,0x02,0x20,0x41,0x08,0x09,0x00,0x90,0x10,0x82,0x04};

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
bool otaErrorVisualShown = false, otaClearSuccessMarkerRequested = false;
bool timeSynced = false, wifiReported = false, cachedWifiConnected = false;
bool scheduleReconcileRequested = true;
bool pirRaw[STRIP_COUNT] = {}, pirActive[STRIP_COUNT] = {};
bool manualOverride[STRIP_COUNT] = {}, httpTraceEnabled = false;
IPAddress cachedWifiIp(0,0,0,0);
long cachedWifiRssi = 0;
uint8_t logStart = 0, logSize = 0, scheduleCount = 0, httpMaxBatch = 0;
uint32_t nextLogId = 1, nextHttpRequestId = 1, bootId = 0;
uint32_t bootSequence = 0, bootGeneration = 0;
uint8_t activeBootGenerationSlot = 0;
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
unsigned long otaBootSuccessIndicatorUntil = 0;
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

uint8_t matrixFrame[8][12] = {};
void showMatrix(const uint8_t packed[12]) {
  for (uint8_t index = 0; index < 96; index++) {
    matrixFrame[index / 12][index % 12] =
      (packed[index / 8] >> (7 - (index % 8))) & 1U;
  }
  matrix.renderBitmap(matrixFrame, 8, 12);
}
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
void logCode(const char* type, const char* code) {
  logEvent(type, code);
}
void logCodef(const char* type, const char* code, const char* format, ...) {
  char message[80];
  int prefix = snprintf(message, sizeof(message), "%s", code);
  if (prefix < 0 || static_cast<size_t>(prefix) >= sizeof(message)) return;
  if (format && format[0]) {
    size_t used = static_cast<size_t>(prefix);
    if (used + 1 >= sizeof(message)) return;
    message[used++] = ':';
    message[used] = 0;
    va_list args;
    va_start(args, format);
    vsnprintf(message + used, sizeof(message) - used, format, args);
    va_end(args);
  }
  logEvent(type, message);
}
void consoleLine(const char* message) {
  Serial.println(message);
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

uint32_t bootGenerationChecksum(uint32_t sequence) {
  return fnv1a(reinterpret_cast<const uint8_t*>(&sequence), sizeof(sequence)) ^
    BOOT_GENERATION_CHECK_MAGIC;
}
bool bootSequenceNewer(uint32_t candidate, uint32_t current) {
  return static_cast<int32_t>(candidate - current) > 0;
}
bool bootGenerationRecordValid(const BootGenerationRecord& record) {
  return record.sequence != 0 &&
    record.checksum == bootGenerationChecksum(record.sequence);
}
void initializeBootGeneration() {
  bool found = false;
  uint32_t latestSequence = 0;
  uint8_t latestSlot = 0;

  for (uint8_t slot = 0; slot < BOOT_GENERATION_SLOT_COUNT; slot++) {
    BootGenerationRecord record = {};
    const uint16_t offset = BOOT_GENERATION_EEPROM_OFFSET +
      static_cast<uint16_t>(slot) * sizeof(BootGenerationRecord);
    eepromReadBytes(offset, reinterpret_cast<uint8_t*>(&record), sizeof(record));
    if (!bootGenerationRecordValid(record)) continue;
    if (!found || bootSequenceNewer(record.sequence, latestSequence)) {
      found = true;
      latestSequence = record.sequence;
      latestSlot = slot;
    }
  }

  uint32_t nextSequence = found ? latestSequence + 1UL : 1UL;
  if (!nextSequence) nextSequence = 1UL;
  const uint8_t targetSlot = found
    ? static_cast<uint8_t>((latestSlot + 1U) % BOOT_GENERATION_SLOT_COUNT)
    : 0U;
  BootGenerationRecord next = {
    nextSequence,
    bootGenerationChecksum(nextSequence)
  };
  const uint16_t targetOffset = BOOT_GENERATION_EEPROM_OFFSET +
    static_cast<uint16_t>(targetSlot) * sizeof(BootGenerationRecord);
  eepromWriteBytes(
    targetOffset,
    reinterpret_cast<const uint8_t*>(&next),
    sizeof(next)
  );

  BootGenerationRecord verify = {};
  eepromReadBytes(
    targetOffset,
    reinterpret_cast<uint8_t*>(&verify),
    sizeof(verify)
  );

  if (bootGenerationRecordValid(verify) && verify.sequence == nextSequence) {
    bootSequence = nextSequence;
    activeBootGenerationSlot = targetSlot;
  } else {
    bootSequence = found ? latestSequence : 1UL;
    activeBootGenerationSlot = found ? latestSlot : 0U;
  }

  bootGeneration =
    ((bootSequence - 1UL) % BOOT_GENERATION_PUBLIC_MAX) + 1UL;
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
      logCode("success", "X1001");
    }
  }
  deviceKeyFingerprint = apiSettingsStored ? fnv1aText(apiSettings.sharedSecret) : 0;
  if (networkSettingsStored && apiSettingsStored)
    logCode("success", "X1002");
  else
    logCode("error", "X1003");
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
    logCode("success", "X1101");
  } else if (stored) {
    networkSettingsStored = true;
    logCode("success", "X1102");
  } else {
    memset(&networkSettings, 0, sizeof(networkSettings));
    copyText(networkSettings.ssid, sizeof(networkSettings.ssid), WIFI_SSID);
    copyText(networkSettings.password, sizeof(networkSettings.password), WIFI_PASSWORD);
    copyText(networkSettings.otaPassword, sizeof(networkSettings.otaPassword), OTA_PASSWORD);
    logCode("error", "X1103");
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
    logCode("success", "X1201");
  } else if (stored) {
    apiSettingsStored = true;
    deviceKeyFingerprint = fnv1aText(apiSettings.sharedSecret);
    logCode("success", "X1202");
  } else {
    memset(&apiSettings, 0, sizeof(apiSettings));
    logCode("error", "X1203");
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
    scheduleReconcileRequested = true;
    logCode("success", "X1301");
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
        logCode("success", "X1302");
        return;
      }
    }
  }
  memset(schedules, 0, sizeof(schedules));
  scheduleCount = 0;
  scheduleRevision = 0;
  schedulesStored = false;
  logCode("warn", "X1303");
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
  scheduleReconcileRequested = true;
  refreshManualOverrideDeadlines();
  lastScheduleAudit = 0;
  if (timeSynced) reconcileArduinoSchedules(true);
  logCode("success", "X1304");
  return true;
}
int hexValue(char v) {
  if (v >= '0' && v <= '9') return v - '0';
  if (v >= 'a' && v <= 'f') return v - 'a' + 10;
  if (v >= 'A' && v <= 'F') return v - 'A' + 10;
  return -1;
}
bool decodeScheduleHex(const char* payload, StoredSchedule& entry) {
  if (!payload || strlen(payload) != sizeof(StoredSchedule) * 2) return false;
  uint8_t* target = reinterpret_cast<uint8_t*>(&entry);
  for (size_t i = 0; i < sizeof(StoredSchedule) * 2; i += 2) {
    int hi = hexValue(payload[i]), lo = hexValue(payload[i + 1]);
    if (hi < 0 || lo < 0) return false;
    target[i / 2] = static_cast<uint8_t>((hi << 4) | lo);
  }
  return entry.day >= 1 && entry.day <= 7 && entry.hour <= 23 &&
    entry.minute <= 59;
}
bool encodeScheduleHex(const StoredSchedule& entry, char* output, size_t size) {
  static const char HEX_DIGITS[] = "0123456789abcdef";
  constexpr size_t REQUIRED = sizeof(StoredSchedule) * 2 + 1;
  if (!output || size < REQUIRED) return false;
  const uint8_t* source = reinterpret_cast<const uint8_t*>(&entry);
  for (size_t i = 0; i < sizeof(StoredSchedule); i++) {
    output[i * 2] = HEX_DIGITS[(source[i] >> 4) & 15];
    output[i * 2 + 1] = HEX_DIGITS[source[i] & 15];
  }
  output[REQUIRED - 1] = 0;
  return true;
}
bool importSchedulesHex(const char* payload) {
  if (!payload) return false;
  const size_t chars = sizeof(StoredSchedule) * 2;
  const size_t length = strlen(payload);
  if (length % chars) return false;
  uint8_t count = static_cast<uint8_t>(length / chars);
  if (count > SCHEDULE_MAX) return false;

  char record[sizeof(StoredSchedule) * 2 + 1] = {};
  StoredSchedule decoded = {};
  for (uint8_t i = 0; i < count; i++) {
    memcpy(record, payload + i * chars, chars);
    record[chars] = 0;
    if (!decodeScheduleHex(record, decoded)) return false;
  }
  for (uint8_t i = 0; i < count; i++) {
    memcpy(record, payload + i * chars, chars);
    record[chars] = 0;
    if (!decodeScheduleHex(record, schedules[i])) return false;
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
    scheduleReconcileRequested = true;
    logCode("success", "X1401");
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
  logCodef("warn", "X1402", "%s", "Europe/Vienna");
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
    logCode("info", "X1403");
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

uint32_t currentLocalEpoch() {
  if (!timeSynced) return 0;
  const uint32_t utcEpoch = currentClockEpoch();
  if (!utcEpoch) return 0;
  const int32_t offsetSeconds =
    static_cast<int32_t>(utcOffsetMinutesForEpoch(utcEpoch)) * 60L;
  const int64_t localEpoch = static_cast<int64_t>(utcEpoch) + offsetSeconds;
  return localEpoch > 0 ? static_cast<uint32_t>(localEpoch) : 0;
}

bool localScheduleTime(uint8_t& day, uint8_t& hour, uint8_t& minute) {
  const uint32_t localEpoch = currentLocalEpoch();
  if (!localEpoch) return false;
  const time_t localTime = static_cast<time_t>(localEpoch);
  const tm local = *gmtime(&localTime);
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
  // WS2812B keeps its last latched color without refresh. Do not transmit
  // another frame while OTA Exclusive Mode is active.
}
void enterOtaExclusiveMode() {
  // One final frame before exclusive mode: blue means OTA/update in progress.
  showOtaIndicator(0, 96, 255, 90);
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
      logCode("info", "X3001");
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
    logCode("info", "X3002");
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
      logCode("warn", "X2101");
    }
    return;
  }

  bool first = !timeSynced;
  lastClockEpoch = epoch;
  lastClockMillis = now;
  timeSynced = true;
  scheduleReconcileRequested = true;
  refreshAutonomousTimezoneState(epoch, true);
  ntpSuccessCount++;
  ntpLastSuccessAt = now;

  if (first) {
    logCode("success", usedUdpFallback ? "X2102" : "X2103");
    refreshManualOverrideDeadlines();
    lastScheduleMinute = 0xFFFFFFFFUL;
    reconcileArduinoSchedules(true);
  }
}
void runArduinoSchedules() {
  const uint32_t localEpoch = currentLocalEpoch();
  if (!localEpoch) return;

  uint8_t day, hour, minute;
  if (!localScheduleTime(day, hour, minute)) return;

  const uint32_t localMinuteKey = localEpoch / 60UL;
  const bool newMinute = localMinuteKey != lastScheduleMinute;
  if (newMinute) lastScheduleMinute = localMinuteKey;

  const bool forceCheck = scheduleReconcileRequested;
  scheduleReconcileRequested = false;
  reconcileArduinoSchedules(forceCheck || newMinute);
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
  logCode("info", "X2001");
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
  char ip[16];
  ipToText(cachedWifiIp, ip, sizeof(ip));
  logCodef("success", "X2002", "%s:%ld:%u:%u",
    ip, cachedWifiRssi, HTTP_API_PORT, OTA_UPLOAD_PORT);
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
void writeOtaSuccessMarker(uint32_t value) {
  EEPROM.put(OTA_SUCCESS_MARKER_EEPROM_OFFSET, value);
}
void armOtaSuccessBootIndicator() {
  writeOtaSuccessMarker(OTA_SUCCESS_MARKER_MAGIC);
}
void clearOtaSuccessBootIndicator() {
  writeOtaSuccessMarker(0);
}
bool consumeOtaSuccessBootIndicator() {
  uint32_t marker = 0;
  EEPROM.get(OTA_SUCCESS_MARKER_EEPROM_OFFSET, marker);
  if (marker != OTA_SUCCESS_MARKER_MAGIC) return false;
  clearOtaSuccessBootIndicator();
  return true;
}
bool otaBootSuccessIndicatorActive() {
  return otaBootSuccessIndicatorUntil &&
    static_cast<int32_t>(otaBootSuccessIndicatorUntil - millis()) > 0;
}
void showOtaIndicator(uint8_t r, uint8_t g, uint8_t b, uint8_t brightness) {
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
  if (otaClearSuccessMarkerRequested && !otaExclusiveMode) {
    clearOtaSuccessBootIndicator();
    otaClearSuccessMarkerRequested = false;
  }
  if (otaPrepareUntil && !otaPrepareModeActive() && !otaTransferActive) {
    otaPrepareUntil = 0;
    clearOtaSuccessBootIndicator();
    leaveOtaExclusiveMode();
    restoreNormalVisualState();
  }
  if (otaErrorIndicatorActive() && !otaTransferActive && !otaErrorVisualShown) {
    showOtaIndicator(255, 0, 0, 120);
    otaErrorVisualShown = true;
  }
  if (otaErrorIndicatorUntil && !otaErrorIndicatorActive() && !otaTransferActive) {
    otaErrorIndicatorUntil = 0;
    otaErrorVisualShown = false;
    restoreNormalVisualState();
  }
  if (otaBootSuccessIndicatorUntil && !otaBootSuccessIndicatorActive()) {
    otaBootSuccessIndicatorUntil = 0;
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
  // No NeoPixel writes in the ArduinoOTA callback. The armed marker survives
  // reset and the new firmware shows green after a successful boot.
  showMatrix(MATRIX_OK);
}
void otaTransferError(int code, const char*) {
  otaTransferActive = false;
  otaPrepareUntil = 0;
  otaLastErrorCode = code;
  otaLastErrorAt = millis();
  otaErrorIndicatorUntil = millis() + OTA_ERROR_INDICATOR_TIME;
  otaErrorVisualShown = false;
  otaClearSuccessMarkerRequested = true;
  leaveOtaExclusiveMode();
  logCodef("error", "X5003", "%d:%lu", code,
    OTA_ERROR_INDICATOR_TIME / 1000UL);
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
  char ip[16];
  ipToText(otaIp, ip, sizeof(ip));
  logCodef("success", "X5001", "%s:%u", ip, OTA_UPLOAD_PORT);
}
bool prepareOtaService() {
  if (!wifiHasAddress()) return false;
  if (!otaReady) startOta();
  if (!otaReady) return false;
  otaRestartCount++;
  lastOtaRestartAt = millis();
  otaPrepareUntil = millis() + OTA_PREPARE_WINDOW;
  otaErrorIndicatorUntil = 0;
  otaErrorVisualShown = false;
  armOtaSuccessBootIndicator();
  enterOtaExclusiveMode();
  return true;
}

uint16_t effectScaleQ8(uint8_t speed) {
  const uint16_t normalized = constrain(static_cast<int>(speed), 1, 100);
  return static_cast<uint16_t>(64U + (normalized * 960UL + 50UL) / 100UL);
}
unsigned long effectDuration(unsigned long base, uint8_t speed) {
  const uint16_t scaleQ8 = effectScaleQ8(speed);
  const unsigned long duration = (base * 256UL + scaleQ8 / 2U) / scaleQ8;
  return max(1UL, duration);
}
uint32_t ledColor(uint8_t i, uint8_t scale = 255) {
  return strip[i].Color(
    static_cast<uint8_t>((static_cast<uint16_t>(leds[i].red) * scale + 127U) / 255U),
    static_cast<uint8_t>((static_cast<uint16_t>(leds[i].green) * scale + 127U) / 255U),
    static_cast<uint8_t>((static_cast<uint16_t>(leds[i].blue) * scale + 127U) / 255U)
  );
}
void render(uint8_t i) {
  if (!leds[i].enabled) { strip[i].clear(); strip[i].show(); return; }
  strip[i].setBrightness(leds[i].brightness);
  unsigned long now = millis();
  switch (leds[i].effect) {
    case BLINK: {
      bool on = (now / effectDuration(700, leds[i].speed)) % 2 == 0;
      strip[i].fill(on ? ledColor(i) : 0); break;
    }
    case BREATHE: {
      unsigned long period = effectDuration(2500, leds[i].speed);
      uint16_t phase = static_cast<uint16_t>(((now % period) * 510UL) / period);
      uint8_t level = phase <= 255U ? static_cast<uint8_t>(phase) : static_cast<uint8_t>(510U - phase);
      uint8_t scale = static_cast<uint8_t>(20U + (static_cast<uint16_t>(235U) * level + 127U) / 255U);
      strip[i].fill(ledColor(i, scale)); break;
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
      for (uint8_t tail = 0; tail < 8; tail++) {
        uint8_t scale = static_cast<uint8_t>((static_cast<uint16_t>(8U - tail) * 255U) / 8U);
        strip[i].setPixelColor((head + PIXELS - tail) % PIXELS, ledColor(i, scale));
      }
      break;
    }
    default: strip[i].fill(ledColor(i)); break;
  }
  strip[i].show();
}
void renderAll(bool force) {
  // V191 stabilization:
  // Do not perform background WS2812 transmissions from loop().
  // Explicit API/schedule/restore paths already call renderAll(true),
  // so static/off state changes remain immediate.
  // Animated effects are intentionally paused until a non-blocking
  // UNO R4 output backend is introduced.
  if (!force) return;
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
    logCode("info", "X4001");
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
    "\"clockEpoch\":%lu,\"clockUtcEpoch\":%lu,\"clockLocalEpoch\":%lu,\"clockDay\":%u,\"clockHour\":%u,\"clockMinute\":%u,",
    currentClockEpoch(), currentClockEpoch(), currentLocalEpoch(), clockDay, clockHour, clockMinute);
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
    "\"schedulerReconcilePending\":%s,\"schedulerLastRunAgeSeconds\":%lu,\"schedulerLastAppliedAgeSeconds\":%lu,",
    scheduleReconcileRequested ? "true" : "false",
    schedulerLastRunAt ? (millis() - schedulerLastRunAt) / 1000UL : 0,
    schedulerLastAppliedAt ? (millis() - schedulerLastAppliedAt) / 1000UL : 0);
  appendFormat(b,
    "\"deviceId\":\"%s\",\"bootId\":\"%08lX\",\"bootGeneration\":%lu,",
    deviceId, static_cast<unsigned long>(bootId),
    static_cast<unsigned long>(bootGeneration));
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
    "\"bootId\":\"%08lX\",\"bootGeneration\":%lu,\"firmwareVersion\":\"%s\",",
    static_cast<unsigned long>(bootId),
    static_cast<unsigned long>(bootGeneration), FIRMWARE_VERSION);
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
char* trimAscii(char* value) {
  if (!value) return value;
  while (*value == ' ' || *value == '\t') value++;
  char* end = value + strlen(value);
  while (end > value && (end[-1] == ' ' || end[-1] == '\t')) *--end = 0;
  return value;
}
bool asciiEqualIgnoreCase(const char* left, const char* right) {
  if (!left || !right) return false;
  while (*left && *right) {
    char a = *left++, b = *right++;
    if (a >= 'A' && a <= 'Z') a += 'a' - 'A';
    if (b >= 'A' && b <= 'Z') b += 'a' - 'A';
    if (a != b) return false;
  }
  return !*left && !*right;
}
bool queryValueSpan(const char* query, const char* name,
    const char*& value, size_t& length) {
  if (!query || !name) return false;
  const size_t nameLength = strlen(name);
  const char* item = query;
  while (*item) {
    const char* end = strchr(item, '&');
    if (!end) end = item + strlen(item);
    const char* equal = static_cast<const char*>(memchr(item, '=', end - item));
    if (equal && static_cast<size_t>(equal - item) == nameLength &&
        !strncmp(item, name, nameLength)) {
      value = equal + 1;
      length = static_cast<size_t>(end - value);
      return true;
    }
    if (!*end) break;
    item = end + 1;
  }
  return false;
}
int valueInt(const char* query, const char* name, int fallback,
    int low, int high) {
  const char* value = nullptr;
  size_t length = 0;
  if (!queryValueSpan(query, name, value, length) || !length || length >= 24)
    return fallback;
  char number[24] = {};
  memcpy(number, value, length);
  char* end = nullptr;
  long parsed = strtol(number, &end, 10);
  if (end == number) return fallback;
  return constrain(static_cast<int>(parsed), low, high);
}
bool valueBool(const char* query, const char* name, bool fallback) {
  const char* value = nullptr;
  size_t length = 0;
  if (!queryValueSpan(query, name, value, length)) return fallback;
  return (length == 1 && value[0] == '1') ||
    (length == 4 && !strncmp(value, "true", 4));
}
bool extractQueryValue(const char* query, const char* name,
    char* output, size_t outputSize) {
  const char* value = nullptr;
  size_t length = 0;
  if (!output || !outputSize ||
      !queryValueSpan(query, name, value, length) ||
      length >= outputSize) return false;
  memcpy(output, value, length);
  output[length] = 0;
  return true;
}
bool constantTimeEquals(const char* supplied, const char* expected) {
  if (!supplied || !expected) return false;
  size_t expectedLength = strlen(expected);
  size_t suppliedLength = strlen(supplied);
  if (suppliedLength != expectedLength) return false;
  uint8_t difference = 0;
  for (size_t i = 0; i < expectedLength; i++)
    difference |= static_cast<uint8_t>(supplied[i] ^ expected[i]);
  return difference == 0;
}
bool cleanQueryWithoutKey(const char* query, char* output, size_t outputSize) {
  if (!output || !outputSize) return false;
  output[0] = 0;
  if (!query || !*query) return true;
  size_t used = 0;
  const char* item = query;
  while (*item) {
    const char* end = strchr(item, '&');
    if (!end) end = item + strlen(item);
    const size_t length = static_cast<size_t>(end - item);
    const bool isKey = length >= 2 && item[0] == 'k' && item[1] == '=';
    if (!isKey && length) {
      if (used && used + 1 >= outputSize) return false;
      if (used) output[used++] = '&';
      if (used + length >= outputSize) return false;
      memcpy(output + used, item, length);
      used += length;
      output[used] = 0;
    }
    if (!*end) break;
    item = end + 1;
  }
  return true;
}
bool unwrapProtectedPath(const char* requested, char* apiPath, size_t apiPathSize,
    char* queryKey, size_t queryKeySize, bool& queryPresent) {
  if (!apiSettingsStored || !requested || !apiPath || !apiPathSize) return false;
  const char* queryAt = strchr(requested, '?');
  const size_t baseLength = queryAt
    ? static_cast<size_t>(queryAt - requested)
    : strlen(requested);
  const size_t privateLength = strlen(apiSettings.privatePath);
  if (baseLength < privateLength + 5 ||
      strncmp(requested, apiSettings.privatePath, privateLength) ||
      strncmp(requested + privateLength, "/api/", 5)) return false;

  const char* apiStart = requested + privateLength;
  const size_t apiBaseLength = baseLength - privateLength;
  if (apiBaseLength + 1 >= apiPathSize) return false;
  memcpy(apiPath, apiStart, apiBaseLength);
  apiPath[apiBaseLength] = 0;

  const char* query = queryAt ? queryAt + 1 : "";
  queryPresent = extractQueryValue(query, "k", queryKey, queryKeySize);
  char clean[HTTP_REQUEST_LINE_SIZE] = {};
  if (!cleanQueryWithoutKey(query, clean, sizeof(clean))) return false;
  if (*clean) {
    const size_t used = strlen(apiPath);
    const size_t cleanLength = strlen(clean);
    if (used + 1 + cleanLength + 1 > apiPathSize) return false;
    apiPath[used] = '?';
    memcpy(apiPath + used + 1, clean, cleanLength + 1);
  }
  return true;
}
HttpHeaderReadResult readHttpHeaders(WiFiClient& c, char* key, size_t keySize,
    bool& present, size_t& contentLength, bool& jsonType) {
  char line[HTTP_HEADER_LINE_SIZE];
  size_t length = 0;
  unsigned long started = millis();
  if (key && keySize) key[0] = 0;
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
      char* separator = strchr(line, ':');
      if (!separator || separator == line) return HTTP_HEADERS_INVALID;
      *separator = 0;
      char* name = trimAscii(line);
      char* supplied = trimAscii(separator + 1);

      if (asciiEqualIgnoreCase(name, API_DEVICE_KEY_HEADER)) {
        if (present || !*supplied || strlen(supplied) >= keySize)
          return present ? HTTP_HEADERS_DUPLICATE_DEVICE_KEY : HTTP_HEADERS_INVALID;
        copyText(key, keySize, supplied);
        present = true;
      } else if (asciiEqualIgnoreCase(name, "Content-Length")) {
        char* end = nullptr;
        unsigned long parsed = strtoul(supplied, &end, 10);
        if (end == supplied) return HTTP_HEADERS_INVALID;
        contentLength = static_cast<size_t>(parsed);
      } else if (asciiEqualIgnoreCase(name, "Content-Type")) {
        jsonType = !strncmp(supplied, "application/json", 16);
      }
      length = 0;
    } else {
      if (length + 1 >= sizeof(line)) return HTTP_HEADERS_INVALID;
      line[length++] = value;
    }
  }
  return HTTP_HEADERS_TIMEOUT;
}
HttpAuthResult authenticateDeviceRequest(const char* header, bool headerPresent,
    const char* query, bool queryPresent) {
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
  scheduleReconcileRequested = true;
  scheduleTransactionActive = false;
  refreshManualOverrideDeadlines();
  return true;
}
void cancelScheduleTransaction() {
  scheduleTransactionActive = false;
  scheduleTransactionReceivedMask = 0;
  scheduleTransactionTotal = 0;
}

uint8_t scheduleTransactionReceivedCount() {
  uint64_t mask = scheduleTransactionReceivedMask;
  uint8_t count = 0;
  while (mask) {
    count += static_cast<uint8_t>(mask & 1ULL);
    mask >>= 1;
  }
  return count;
}

bool pathEquals(const char* left, const char* right) {
  return left && right && strcmp(left, right) == 0;
}
bool pathStartsWith(const char* value, const char* prefix) {
  return value && prefix && strncmp(value, prefix, strlen(prefix)) == 0;
}
int routeV1(WiFiClient& c, const char* method, const char* base,
    const char* query, const char* body, uint32_t requestId) {
  if (pathEquals(base, "/api/v1/ping") && pathEquals(method, "GET")) { sendPingJson(c, requestId); return 200; }
  if (pathEquals(base, "/api/v1/capabilities") && pathEquals(method, "GET")) { sendCapabilitiesJson(c, requestId); return 200; }
  if (pathEquals(base, "/api/v1/status") && pathEquals(method, "GET")) { sendStatusJson(c, requestId); return 200; }
  if (pathEquals(base, "/api/v1/time/config") && pathEquals(method, "GET")) {
    FixedBuffer b; resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
    appendFormat(b, "{\"success\":true,\"timezoneId\":\"%s\",\"currentUtcOffsetMinutes\":%d,",
      timeSettings.timezoneId, timeSettings.currentUtcOffsetMinutes);
    appendFormat(b, "\"nextTransitionEpoch\":%lu,\"nextUtcOffsetMinutes\":%d}",
      static_cast<unsigned long>(timeSettings.nextTransitionEpoch), timeSettings.nextUtcOffsetMinutes);
    sendJsonBuffer(c, b.data, b.length, 200, requestId); return 200;
  }
  if (pathEquals(base, "/api/v1/time/config") && pathEquals(method, "PUT")) {
    char timezoneId[48] = {};
    long currentOffset = 0, nextTransition = 0, nextOffset = 0;
    if (!jsonReadString(body, "timezoneId", timezoneId, sizeof(timezoneId)) ||
        !jsonReadInt(body, "currentUtcOffsetMinutes", currentOffset) ||
        !jsonReadInt(body, "nextTransitionEpoch", nextTransition) ||
        !jsonReadInt(body, "nextUtcOffsetMinutes", nextOffset) ||
        !timezoneIdValid(timezoneId) || currentOffset < -840 || currentOffset > 840 ||
        nextOffset < -840 || nextOffset > 840 || nextTransition < 0) {
      sendErrorJson(c, 422, "VALIDATION_FAILED", "Ervenytelen idozona konfiguracio.", requestId); return 422;
    }
    copyText(timeSettings.timezoneId, sizeof(timeSettings.timezoneId), timezoneId);
    timeSettings.currentUtcOffsetMinutes = static_cast<int16_t>(currentOffset);
    timeSettings.nextTransitionEpoch = static_cast<uint32_t>(nextTransition);
    timeSettings.nextUtcOffsetMinutes = static_cast<int16_t>(nextOffset);
    saveTimeSettings();
    if (!timeSettingsStored) {
      sendErrorJson(c, 500, "EEPROM_VERIFY_FAILED", "Idozona EEPROM mentes sikertelen.", requestId); return 500;
    }
    lastScheduleMinute = 0xFFFFFFFFUL;
    reconcileArduinoSchedules(true);
    sendJsonLiteral(c, "{\"success\":true}", 200, requestId); return 200;
  }
  if (pathEquals(base, "/api/v1/logs") && pathEquals(method, "GET")) {
    sendLogsJson(c, valueInt(query, "afterId", 0, 0, 2147483647), requestId); return 200;
  }
  if (pathEquals(base, "/api/v1/logs/clear") && pathEquals(method, "POST")) {
    clearRamLogs(); sendJsonLiteral(c, "{\"success\":true}", 200, requestId); return 200;
  }
  if (pathEquals(base, "/api/v1/ota/status") && pathEquals(method, "GET")) { sendOtaStatusJson(c, requestId); return 200; }
  if (pathEquals(base, "/api/v1/ota/prepare") && pathEquals(method, "POST")) {
    bool prepared = prepareOtaService();
    sendJsonLiteral(c, prepared ? "{\"success\":true}" : "{\"success\":false}", prepared ? 200 : 503, requestId);
    return prepared ? 200 : 503;
  }
  if (pathEquals(base, "/api/v1/system/reboot") && pathEquals(method, "POST")) {
    if (remoteRebootPending) {
      sendErrorJson(c, 409, "REBOOT_ALREADY_PENDING", "Az eszkoz ujrainditasa mar folyamatban van.", requestId); return 409;
    }
    remoteRebootPending = true;
    remoteRebootAt = millis() + REMOTE_REBOOT_DELAY_MS;
    sendJsonLiteral(c, "{\"success\":true,\"accepted\":true,\"rebooting\":true,\"delayMs\":750}", 202, requestId);
    return 202;
  }
  if (pathEquals(base, "/api/v1/leds") && pathEquals(method, "GET")) { sendStatusJson(c, requestId); return 200; }

  static const char LED_PREFIX[] = "/api/v1/leds/";
  if (pathStartsWith(base, LED_PREFIX) && !pathEquals(base, "/api/v1/leds/all")) {
    char* end = nullptr;
    long id = strtol(base + strlen(LED_PREFIX), &end, 10);
    if (end == base + strlen(LED_PREFIX) || *end || id < 1 || id > STRIP_COUNT) {
      sendErrorJson(c, 404, "LED_NOT_FOUND", "Ismeretlen LED.", requestId); return 404;
    }
    if (pathEquals(method, "GET")) { sendLedJson(c, id - 1, requestId); return 200; }
    if (pathEquals(method, "PUT")) {
      if (!applyLedJson(id - 1, body)) {
        sendErrorJson(c, 422, "VALIDATION_FAILED", "Ervenytelen LED JSON.", requestId); return 422;
      }
      sendLedJson(c, id - 1, requestId); return 200;
    }
  }
  if (pathEquals(base, "/api/v1/leds/all") && pathEquals(method, "POST")) {
    for (uint8_t i = 0; i < STRIP_COUNT; i++) {
      if (!applyLedJson(i, body)) {
        sendErrorJson(c, 422, "VALIDATION_FAILED", "Ervenytelen kozos LED JSON.", requestId); return 422;
      }
    }
    sendStatusJson(c, requestId); return 200;
  }

  if (pathEquals(base, "/api/v1/schedules/status") && pathEquals(method, "GET")) {
    FixedBuffer b; resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
    appendFormat(b, "{\"success\":true,\"requestId\":%lu,\"count\":%u,\"max\":%u,",
      static_cast<unsigned long>(requestId), scheduleCount, SCHEDULE_MAX);
    appendFormat(b, "\"revision\":%lu,\"checksum\":\"%08lX\",\"stored\":%s,",
      static_cast<unsigned long>(scheduleRevision),
      static_cast<unsigned long>(scheduleChecksum(schedules, scheduleCount)), schedulesStored ? "true" : "false");
    appendFormat(b, "\"storageLayout\":\"ab-v2\",\"activeSlot\":%u,\"abSlots\":true,", activeScheduleSlotOffset);
    appendFormat(b, "\"readbackAfterWrite\":true,\"transactionActive\":%s,",
      scheduleTransactionActive ? "true" : "false");
    appendFormat(b, "\"transactionId\":%lu,\"transactionTotal\":%u,\"transactionReceived\":%u,",
      static_cast<unsigned long>(scheduleTransactionId),
      scheduleTransactionTotal,
      scheduleTransactionReceivedCount());
    appendFormat(b, "\"transactionGeneration\":%lu}",
      static_cast<unsigned long>(scheduleTransactionGeneration));
    sendJsonBuffer(c, b.data, b.length, 200, requestId); return 200;
  }
  if (pathEquals(base, "/api/v1/schedules") && pathEquals(method, "GET")) {
    int legacyIndex = valueInt(query, "index", 0, 0, SCHEDULE_MAX);
    int index = valueInt(query, "offset", legacyIndex, 0, SCHEDULE_MAX);
    int limit = valueInt(query, "limit", 8, 1, 8);
    FixedBuffer b; resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
    appendFormat(b, "{\"success\":true,\"requestId\":%lu,\"revision\":%lu,\"count\":%u,\"entries\":[",
      static_cast<unsigned long>(requestId), static_cast<unsigned long>(scheduleRevision), scheduleCount);
    bool first = true;
    char payload[sizeof(StoredSchedule) * 2 + 1] = {};
    for (int i = index; i < scheduleCount && i < index + limit; i++) {
      if (!encodeScheduleHex(schedules[i], payload, sizeof(payload))) {
        sendErrorJson(c, 500, "ENCODE_FAILED", "Schedule kodolas sikertelen.", requestId); return 500;
      }
      if (!first) appendChar(b, ',');
      first = false;
      appendFormat(b, "{\"index\":%d,\"payload\":\"%s\"}", i, payload);
    }
    appendRaw(b, "]}"); sendJsonBuffer(c, b.data, b.length, 200, requestId); return 200;
  }
  if (pathEquals(base, "/api/v1/schedules") && pathEquals(method, "DELETE")) {
    memset(schedules, 0, sizeof(schedules));
    if (!saveSchedules(0)) {
      sendErrorJson(c, 500, "EEPROM_VERIFY_FAILED", "Schedule torles sikertelen.", requestId); return 500;
    }
    sendJsonLiteral(c, "{\"success\":true,\"count\":0}", 200, requestId); return 200;
  }
  if (pathEquals(base, "/api/v1/schedules/transactions") && pathEquals(method, "POST")) {
    long revision, total;
    if (!jsonReadInt(body, "expectedRevision", revision) || !jsonReadInt(body, "total", total) ||
        revision < 0 || total < 0 || total > SCHEDULE_MAX) {
      sendErrorJson(c, 422, "VALIDATION_FAILED", "expectedRevision es total kotelezo.", requestId); return 422;
    }
    if (!beginScheduleTransaction(revision, total)) {
      sendErrorJson(c, 409, "REVISION_CONFLICT", "Schedule revision elteres vagy aktiv tranzakcio.", requestId); return 409;
    }
    FixedBuffer b; resetBuffer(b, httpBodyBuffer, sizeof(httpBodyBuffer));
    appendFormat(b, "{\"success\":true,\"requestId\":%lu,\"transactionId\":%lu,\"total\":%u}",
      static_cast<unsigned long>(requestId), static_cast<unsigned long>(scheduleTransactionId), scheduleTransactionTotal);
    sendJsonBuffer(c, b.data, b.length, 200, requestId); return 200;
  }
  static const char TX_PREFIX[] = "/api/v1/schedules/transactions/";
  if (pathStartsWith(base, TX_PREFIX)) {
    const char* rest = base + strlen(TX_PREFIX);
    char* end = nullptr;
    uint32_t txId = static_cast<uint32_t>(strtoul(rest, &end, 10));
    if (end == rest) {
      sendErrorJson(c, 404, "TRANSACTION_NOT_FOUND", "Nincs ilyen schedule tranzakcio.", requestId); return 404;
    }
    const char* action = *end == '/' ? end + 1 : "";
    if (*end && *end != '/') {
      sendErrorJson(c, 404, "TRANSACTION_NOT_FOUND", "Nincs ilyen schedule tranzakcio.", requestId); return 404;
    }
    if (!scheduleTransactionActive || txId != scheduleTransactionId) {
      sendErrorJson(c, 404, "TRANSACTION_NOT_FOUND", "Nincs ilyen schedule tranzakcio.", requestId); return 404;
    }
    if (pathEquals(action, "chunks") && pathEquals(method, "PUT")) {
      long index; char payload[64]; StoredSchedule entry = {};
      if (!jsonReadInt(body, "index", index) || !jsonReadString(body, "payload", payload, sizeof(payload)) ||
          index < 0 || index >= scheduleTransactionTotal || !decodeScheduleHex(payload, entry) ||
          !writeScheduleTransactionRecord(index, entry)) {
        sendErrorJson(c, 422, "INVALID_SCHEDULE_CHUNK", "Ervenytelen schedule chunk.", requestId); return 422;
      }
      sendJsonLiteral(c, "{\"success\":true}", 200, requestId); return 200;
    }
    if (pathEquals(action, "commit") && pathEquals(method, "POST")) {
      if (!commitScheduleTransaction()) {
        sendErrorJson(c, 500, "EEPROM_VERIFY_FAILED", "Schedule commit vagy readback sikertelen.", requestId); return 500;
      }
      sendJsonLiteral(c, "{\"success\":true}", 200, requestId); return 200;
    }
    if (!*action && pathEquals(method, "DELETE")) {
      cancelScheduleTransaction(); sendJsonLiteral(c, "{\"success\":true}", 200, requestId); return 200;
    }
  }
  sendErrorJson(c, 405, "METHOD_NOT_ALLOWED", "Ismeretlen vegpont vagy hibas metodus.", requestId);
  return 405;
}
int routeRequest(WiFiClient& c, const char* method, const char* path,
    const char* body, uint32_t requestId) {
  char base[HTTP_REQUEST_LINE_SIZE] = {};
  char query[HTTP_REQUEST_LINE_SIZE] = {};
  const char* queryAt = strchr(path, '?');
  const size_t baseLength = queryAt ? static_cast<size_t>(queryAt - path) : strlen(path);
  if (baseLength >= sizeof(base)) {
    sendErrorJson(c, 404, "DIRECT_API_V1_REQUIRED", "Direct API v1 endpoint required.", requestId); return 404;
  }
  memcpy(base, path, baseLength);
  base[baseLength] = 0;
  if (queryAt) copyText(query, sizeof(query), queryAt + 1);
  if (!pathStartsWith(base, "/api/v1/")) {
    sendErrorJson(c, 404, "DIRECT_API_V1_REQUIRED", "Direct API v1 endpoint required.", requestId); return 404;
  }
  return routeV1(c, method, base, query, body, requestId);
}

void handleHttp() {
  uint8_t batch = 0;
  while (batch < HTTP_CLIENTS_PER_LOOP) {
    WiFiClient c = server.available();
    if (!c) break;
    batch++; httpRequests++;
    HttpRequestContext request = {};
    request.requestId = nextHttpRequestId++;
    request.startedAt = millis();
    request.authResult = HTTP_AUTH_MISSING;
    request.responseCode = 500;
    copyText(request.method, sizeof(request.method), "-");
    copyText(request.path, sizeof(request.path), "-");
    IPAddress remote = c.remoteIP();
    ipToText(remote, request.clientIp, sizeof(request.clientIp));

    while (!c.available() && millis() - request.startedAt < HTTP_FIRST_BYTE_TIMEOUT) delay(1);
    if (!c.available()) {
      httpTimeouts++; request.responseCode = 408;
      sendErrorJson(c, 408, "REQUEST_TIMEOUT", "A kliens nem kuldott request line-t idoben.", request.requestId);
      finalizeHttpAudit(request); c.stop(); continue;
    }

    char requestLine[HTTP_REQUEST_LINE_SIZE] = {};
    if (!readRequestLine(c, requestLine, sizeof(requestLine))) {
      httpRejected++; request.responseCode = 400;
      sendErrorJson(c, 400, "INVALID_REQUEST_LINE", "Ervenytelen vagy tul hosszu request line.", request.requestId);
      finalizeHttpAudit(request); c.stop(); continue;
    }

    char* line = trimAscii(requestLine);
    char* first = strchr(line, ' ');
    if (!first) {
      httpRejected++; request.responseCode = 400;
      sendErrorJson(c, 400, "INVALID_REQUEST_LINE", "A request line nem bonthato.", request.requestId);
      finalizeHttpAudit(request); c.stop(); continue;
    }
    *first++ = 0;
    while (*first == ' ') first++;
    char* second = strchr(first, ' ');
    if (!second) {
      httpRejected++; request.responseCode = 400;
      sendErrorJson(c, 400, "INVALID_REQUEST_LINE", "A request line nem bonthato.", request.requestId);
      finalizeHttpAudit(request); c.stop(); continue;
    }
    *second = 0;
    char* method = trimAscii(line);
    char* requestedPath = trimAscii(first);
    copyText(request.method, sizeof(request.method), method);

    if (!pathEquals(method, "GET") && !pathEquals(method, "POST") &&
        !pathEquals(method, "PUT") && !pathEquals(method, "DELETE")) {
      httpRejected++; request.responseCode = 405;
      sendErrorJson(c, 405, "METHOD_NOT_ALLOWED", "Tamogatott metodusok: GET, POST, PUT, DELETE.", request.requestId);
      finalizeHttpAudit(request); c.stop(); continue;
    }

    char path[HTTP_REQUEST_LINE_SIZE] = {};
    char queryKey[sizeof(apiSettings.sharedSecret)] = {};
    bool queryPresent = false;
    if (!unwrapProtectedPath(requestedPath, path, sizeof(path), queryKey, sizeof(queryKey), queryPresent)) {
      httpRejected++; request.authResult = HTTP_AUTH_PATH_REJECTED; request.responseCode = 404;
      copyText(request.path, sizeof(request.path), "/private-path-not-found");
      sendErrorJson(c, 404, "PRIVATE_PATH_NOT_FOUND", "A privat API-utvonal hibas vagy nincs beallitva.", request.requestId);
      finalizeHttpAudit(request); c.stop(); continue;
    }

    char baseForAudit[sizeof(request.path)] = {};
    const char* queryAt = strchr(path, '?');
    const size_t auditLength = queryAt ? static_cast<size_t>(queryAt - path) : strlen(path);
    const size_t copyLength = auditLength < sizeof(baseForAudit) - 1 ? auditLength : sizeof(baseForAudit) - 1;
    memcpy(baseForAudit, path, copyLength); baseForAudit[copyLength] = 0;
    copyText(request.path, sizeof(request.path), baseForAudit);

    char headerKey[sizeof(apiSettings.sharedSecret)] = {};
    bool headerPresent = false;
    c.setTimeout(HTTP_READ_TIMEOUT);
    size_t contentLength = 0; bool jsonType = false;
    HttpHeaderReadResult headerResult = readHttpHeaders(
      c, headerKey, sizeof(headerKey), headerPresent, contentLength, jsonType);
    if (headerResult != HTTP_HEADERS_OK) {
      request.authResult = HTTP_AUTH_HEADER_INVALID;
      if (headerResult == HTTP_HEADERS_TIMEOUT) {
        httpTimeouts++; request.responseCode = 408;
        sendErrorJson(c, 408, "HEADER_TIMEOUT", "A HTTP fejlecek olvasasa idotullepesbe futott.", request.requestId);
      } else {
        httpRejected++; request.responseCode = 400;
        sendErrorJson(c, 400, "INVALID_HEADERS",
          headerResult == HTTP_HEADERS_DUPLICATE_DEVICE_KEY
            ? "Az X-Device-Key fejlec tobbszor szerepel." : "Ervenytelen HTTP fejlec.",
          request.requestId);
      }
      finalizeHttpAudit(request); c.stop(); continue;
    }

    request.authResult = authenticateDeviceRequest(headerKey, headerPresent, queryKey, queryPresent);
    if (request.authResult != HTTP_AUTH_OK_HEADER && request.authResult != HTTP_AUTH_OK_QUERY_FALLBACK) {
      httpRejected++; request.responseCode = 401;
      sendErrorJson(c, 401,
        request.authResult == HTTP_AUTH_MISSING ? "MISSING_DEVICE_KEY" : "INVALID_DEVICE_KEY",
        request.authResult == HTTP_AUTH_MISSING
          ? "Az X-Device-Key fejlec hianyzik." : "Az X-Device-Key erteke hibas.",
        request.requestId);
      finalizeHttpAudit(request); c.stop(); continue;
    }
    if (request.authResult == HTTP_AUTH_OK_HEADER) httpHeaderAuthAccepted++;
    else httpQueryFallbackAccepted++;

    const bool bodyRequired = pathEquals(method, "POST") || pathEquals(method, "PUT");
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
    finalizeHttpAudit(request); c.stop();
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
  Serial.print("Boot generation: "); Serial.println(bootGeneration);
  Serial.print("Boot ring slot: "); Serial.println(activeBootGenerationSlot);
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
  logCode("cmd", "X6001");
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
    logCode("info", "X4002");
  } else if (!strcmp(command, "http trace off")) {
    httpTraceEnabled = false;
    logCode("info", "X4003");
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
  initializeBootGeneration();
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
  if (consumeOtaSuccessBootIndicator()) {
    // New firmware booted after OTA: green physical success feedback.
    showOtaIndicator(0, 255, 0, 120);
    otaBootSuccessIndicatorUntil = millis() + OTA_BOOT_SUCCESS_INDICATOR_TIME;
  }
  logCode("success", "X0001");
  logCodef("info", "X0002", "%s", FIRMWARE_VERSION);
  logCodef("info", "X0003", "%s", FIRMWARE_FEATURE);
  loadPersistentConfig();
  loadTimeSettings();
  loadSchedules();
  connectWifi();
  startNtpUdpService();
  server.begin();
  logCodef("success", "X0004", "%u", HTTP_API_PORT);
  logCode("info", "X0005");
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
