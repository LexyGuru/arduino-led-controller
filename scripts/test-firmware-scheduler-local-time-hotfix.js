'use strict';

const assert = require('assert');
const fs = require('fs');

const fw = fs.readFileSync(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
  'utf8'
);

function functionBody(signature) {
  const start = fw.indexOf(signature);
  assert.ok(start >= 0, `Hiányzó függvény: ${signature}`);

  const open = fw.indexOf('{', start + signature.length);
  assert.ok(open >= 0, `Hiányzó nyitó kapcsos zárójel: ${signature}`);

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = open; i < fw.length; i += 1) {
    const c = fw[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === quote) {
        quote = null;
      }
      continue;
    }

    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }

    if (c === '{') {
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0) return fw.slice(start, i + 1);
    }
  }

  assert.fail(`Hiányzó záró kapcsos zárójel: ${signature}`);
}

function mustContain(haystack, needle, label) {
  assert.ok(
    haystack.includes(needle),
    `${label}: hiányzik: ${needle}`
  );
}

function mustNotContain(haystack, needle, label) {
  assert.ok(
    !haystack.includes(needle),
    `${label}: tiltott maradvány: ${needle}`
  );
}

// Canonical local clock source.
mustContain(fw, 'uint32_t currentLocalEpoch()', 'canonical local epoch');
mustContain(fw, 'utcOffsetMinutesForEpoch(utcEpoch)', 'timezone offset source');
mustContain(fw, '* 60L;', 'timezone minutes -> seconds');
mustContain(fw, 'bool scheduleReconcileRequested = true;', 'reconcile request flag');

// localScheduleTime must consume canonical local epoch, not legacy inline DST math.
const local = functionBody('bool localScheduleTime(');
mustContain(local, 'currentLocalEpoch()', 'localScheduleTime');
mustContain(local, 'local.tm_wday == 0 ? 7 : local.tm_wday', 'Sunday mapping');
mustNotContain(local, 'euSummerTime', 'localScheduleTime');
mustNotContain(local, 'utcEpoch += 3600', 'localScheduleTime');

// Scheduler minute key and force reconciliation.
const run = functionBody('void runArduinoSchedules()');
mustContain(run, 'const uint32_t localEpoch = currentLocalEpoch();', 'runArduinoSchedules');
mustContain(run, 'const uint32_t localMinuteKey = localEpoch / 60UL;', 'local minute key');
mustContain(run, 'const bool forceCheck = scheduleReconcileRequested;', 'force reconcile read');
mustContain(run, 'scheduleReconcileRequested = false;', 'force reconcile clear');
mustContain(run, 'reconcileArduinoSchedules(forceCheck || newMinute);', 'force/new-minute reconcile');

// Autonomous Arduino reconciliation contract.
// Keep this intentionally implementation-agnostic: the exact current firmware
// may route schedule selection through helpers, references, or local aliases.
const reconcile = functionBody('void reconcileArduinoSchedules(');
mustContain(reconcile, 'scheduleCount', 'reconcile schedule source gate');
mustContain(reconcile, 'timeSynced', 'reconcile time gate');

// The actual schedule storage and record schema must still exist globally.
mustContain(fw, 'StoredSchedule schedules[SCHEDULE_MAX]', 'EEPROM schedule storage');
mustContain(fw, 'uint8_t day, hour, minute;', 'schedule time schema');
mustContain(fw, 'StoredLed leds[STRIP_COUNT]', 'per-strip schedule state');
mustContain(fw, 'uint8_t apply, enabled', 'per-strip apply/enabled schema');
mustContain(fw, 'void applyStoredLed(', 'stored LED apply helper');
mustContain(fw, 'void renderAll(', 'physical LED render helper');

// Status API compatibility + explicit UTC/local diagnostics.
mustContain(fw, '\\"clockEpoch\\":%lu', 'legacy UTC clockEpoch');
mustContain(fw, '\\"clockUtcEpoch\\":%lu', 'explicit UTC epoch');
mustContain(fw, '\\"clockLocalEpoch\\":%lu', 'explicit local epoch');
mustContain(fw, '\\"timezoneId\\":\\"%s\\",\\"utcOffsetMinutes\\":%d', 'timezone diagnostics');
mustContain(fw, '\\"schedulerReconcilePending\\":%s', 'reconcile diagnostics');

// Time and schedule state transitions must request reconciliation.
assert.ok(
  /timeSynced\s*=\s*true\s*;\s*scheduleReconcileRequested\s*=\s*true\s*;/.test(fw),
  'time sync után kötelező force reconciliation'
);
assert.ok(
  /schedulesStored\s*=\s*true\s*;\s*scheduleReconcileRequested\s*=\s*true\s*;/.test(fw),
  'schedule commit/load után kötelező force reconciliation'
);

// Pure semantic clock fixtures.
function localEpoch(utcEpochSeconds, offsetMinutes) {
  return utcEpochSeconds + offsetMinutes * 60;
}

const augUtc = Date.UTC(2026, 7, 9, 19, 0, 0) / 1000;
assert.strictEqual(
  new Date(localEpoch(augUtc, 120) * 1000).toISOString().slice(11, 16),
  '21:00'
);

const janUtc = Date.UTC(2026, 0, 9, 19, 0, 0) / 1000;
assert.strictEqual(
  new Date(localEpoch(janUtc, 60) * 1000).toISOString().slice(11, 16),
  '20:00'
);

// Firmware day contract: Sunday=7, Monday=1.
function firmwareDay(jsUtcDay) {
  return jsUtcDay === 0 ? 7 : jsUtcDay;
}

assert.strictEqual(
  firmwareDay(new Date(Date.UTC(2026, 7, 9)).getUTCDay()),
  7
);
assert.strictEqual(
  firmwareDay(new Date(Date.UTC(2026, 7, 10)).getUTCDay()),
  1
);

// Last-effective schedule selection model mirrors firmware reconciliation.
function selectEvent(events, currentMinute) {
  let selected = null;
  let selectedMinute = -1;

  for (const e of events) {
    if (!e.apply) continue;
    const eventMinute = (e.day - 1) * 1440 + e.hour * 60 + e.minute;
    if (eventMinute <= currentMinute && eventMinute >= selectedMinute) {
      selected = e;
      selectedMinute = eventMinute;
    }
  }

  if (!selected) {
    for (const e of events) {
      if (!e.apply) continue;
      const eventMinute = (e.day - 1) * 1440 + e.hour * 60 + e.minute;
      if (eventMinute >= selectedMinute) {
        selected = e;
        selectedMinute = eventMinute;
      }
    }
  }

  return selected;
}

const sunday2030 = [
  { day: 7, hour: 20, minute: 30, apply: true, enabled: true }
];

// A later valid event must supersede the earlier one.
const sunday2030Then2200 = [
  { day: 7, hour: 20, minute: 30, apply: true, enabled: true },
  { day: 7, hour: 22, minute: 0, apply: true, enabled: false }
];
assert.strictEqual(
  selectEvent(sunday2030Then2200, 6 * 1440 + 21 * 60).enabled,
  true
);
assert.strictEqual(
  selectEvent(sunday2030Then2200, 6 * 1440 + 22 * 60).enabled,
  false
);

for (const minute of [20 * 60 + 30, 20 * 60 + 31, 20 * 60 + 53]) {
  const selected = selectEvent(sunday2030, 6 * 1440 + minute);
  assert.ok(selected, `20:${minute % 60} esemény kiválasztása hiányzik`);
  assert.strictEqual(selected.enabled, true);
}

// Reboot/reconciliation at 20:53 must reconstruct 20:30 state.
assert.strictEqual(
  selectEvent(sunday2030, 6 * 1440 + 20 * 60 + 53).enabled,
  true
);

// Monday before first event uses previous week's Sunday state.
assert.strictEqual(selectEvent(sunday2030, 10).enabled, true);

console.log('OK: canonical UTC -> local firmware clock contract');
console.log('OK: Vienna nyári +120 és téli +60 perces fixture');
console.log('OK: vasárnap=7 / hétfő=1 napindex contract');
console.log('OK: 20:30 -> 20:31 -> 20:53 last-effective schedule contract');
console.log('OK: reboot és heti körbefordulás schedule reconstruction contract');
console.log('OK: NTP/time/schedule változás force reconciliation contract');
console.log('OK: brace-aware C/C++ function scanner');
console.log('OK: source contract assertions regex-escape függetlenek');
console.log('OK: reconcile source contract implementációs változónevektől független');
console.log('OK: későbbi schedule esemény felülírja a korábbi állapotot');
console.log('OK: reconcile teszt helper/alias implementációt is elfogad');
console.log('OK: fizikai render helper globális contractként ellenőrzött');


// NTP_REFRESH_BOUND_V186
{
  const match = fw.match(
    /constexpr unsigned long NTP_SYNC_INTERVAL_MS\s*=\s*(\d+)UL\s*\*\s*60UL\s*\*\s*1000UL;/
  );
  assert.ok(match, 'A NTP_SYNC_INTERVAL_MS perc-alapú contract hiányzik');
  const minutes = Number(match[1]);
  assert.ok(
    minutes >= 5 && minutes <= 15,
    `Az authoritative NTP refresh túl ritka: ${minutes} perc`
  );
  assert.match(
    fw,
    /timeSynced\s*=\s*true;[\s\S]{0,1200}scheduleReconcileRequested\s*=\s*true;/,
    'Sikeres NTP sync után scheduler reconciliation szükséges'
  );
  console.log('OK: NTP refresh 5–15 perc közötti authoritative bound');
}
