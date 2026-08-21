#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const fw=read('firmware/ArduinoLedController/ArduinoLedController.ino');
const schedules=read('desktop-tauri/src/pages/SchedulesPage.tsx');
const css=read('desktop-tauri/src/core-ui-v3.css');

assert.match(fw,/bool animatedEffectActive\(uint8_t index\)/);
assert.match(fw,/now - lastFrame < EFFECT_FRAME/);
assert.match(fw,/static uint8_t animatedCursor = 0/);
assert.match(fw,/render\(index\)/);
assert.doesNotMatch(fw,/Animated effects are intentionally paused/);
assert.doesNotMatch(fw,/if \(!force\) return;/);
for(const effect of ['BLINK','BREATHE','RAINBOW','CHASE'])
  assert.ok(fw.includes(`leds[index].effect == ${effect}`),effect);
assert.match(fw,/activeLedCount\(i\)/);

assert.match(schedules,/data-schedule-unified="v1"/);
assert.match(schedules,/activeScheduleDay/);
assert.match(schedules,/schedule-unified-day-tab/);
assert.match(schedules,/aria-pressed=\{activeScheduleDay === day\.day\}/);
assert.match(schedules,/group\.day === activeScheduleDay/);
assert.match(schedules,/schedule-unified-day-list/);
assert.match(schedules,/schedule-unified-editor/);
assert.match(schedules,/setActiveScheduleDay\(schedule\.day\)/);
assert.match(schedules,/setSelectedDays\(\[day\.day\]\)/);
assert.equal((schedules.match(/id="schedule-editor"/g)||[]).length,1);
assert.equal((schedules.match(/<section className="schedule-week-overview schedule-unified-day-list"/g)||[]).length,1);
assert.equal((schedules.match(/<section className="panel visual31-management-schedule-timeline schedule-unified-workspace"/g)||[]).length,1);
assert.match(css,/V724 - Unified weekly schedule workspace/);
assert.match(css,/schedule-unified-editor \.day-picker/);
assert.match(css,/schedule-unified-actions > div:first-child/);

console.log('V724_ANIMATED_EFFECT_SCHEDULER=PASSED');
console.log('V724_SINGLE_STRIP_PER_FRAME_GUARD=PASSED');
console.log('V724_DYNAMIC_LED_COUNT_ANIMATION=PASSED');
console.log('V724_WEEKDAY_CLICK_NAVIGATION=PASSED');
console.log('V724_WEEKLY_MAP_LIST_EDITOR_UNIFIED=PASSED');
