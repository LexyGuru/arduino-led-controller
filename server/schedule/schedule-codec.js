'use strict';

const {
  normalizePortableSchedule,
  normalizeScheduleList
} = require('./schedule-validation');

const SCHEDULE_RECORD_SIZE = 27;

function encodeScheduleRecord(input) {
  const schedule =
    normalizePortableSchedule(input);

  const payload = Buffer.alloc(
    SCHEDULE_RECORD_SIZE
  );

  const [hour, minute] =
    schedule.time
      .split(':')
      .map(Number);

  payload[0] = schedule.day;
  payload[1] = hour;
  payload[2] = minute;

  for (let ledId = 1; ledId <= 3; ledId += 1) {
    const led = schedule.leds.find(
      (item) => item.id === ledId
    );

    if (!led) continue;

    const offset =
      3 + (ledId - 1) * 8;

    payload[offset] = 1;
    payload[offset + 1] =
      led.enabled ? 1 : 0;
    payload[offset + 2] =
      led.brightness;
    payload[offset + 3] =
      led.effect;
    payload[offset + 4] =
      led.speed;
    payload[offset + 5] =
      led.color[0];
    payload[offset + 6] =
      led.color[1];
    payload[offset + 7] =
      led.color[2];
  }

  return payload;
}

function encodeScheduleHex(input) {
  return encodeScheduleRecord(
    input
  ).toString('hex');
}

function encodeScheduleList(input) {
  const schedules =
    normalizeScheduleList(input);

  return Buffer.concat(
    schedules.map(
      encodeScheduleRecord
    )
  );
}

module.exports = {
  SCHEDULE_RECORD_SIZE,
  encodeScheduleHex,
  encodeScheduleList,
  encodeScheduleRecord
};
