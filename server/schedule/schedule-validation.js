'use strict';

const {
  normalizeColor,
  normalizeLedId
} = require('../led/led-validation');

const {
  ScheduleValidationError
} = require('./schedule-error');

const SCHEDULE_LIMITS = Object.freeze({
  maximumEntries: 60,
  maximumImportEntries: 1000,
  minimumDayIndex: 0,
  maximumDayIndex: 6,
  minimumWeekday: 1,
  maximumWeekday: 7,
  minimumBrightness: 0,
  maximumBrightness: 255,
  minimumEffect: 0,
  maximumEffect: 4,
  minimumSpeed: 1,
  maximumSpeed: 100
});

const SCHEDULE_FILENAME_PATTERN =
  /^S[0-6]L[1-3]\.JS$/i;

const SCHEDULE_TIME_PATTERN =
  /^([01]\d|2[0-3]):[0-5]\d$/;

function integerInRange(
  value,
  minimum,
  maximum,
  {
    code,
    message,
    field
  }
) {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new ScheduleValidationError(
      code,
      message,
      {
        field,
        minimum,
        maximum,
        received: value
      }
    );
  }

  return parsed;
}

function normalizeDayIndex(value) {
  return integerInRange(
    value,
    SCHEDULE_LIMITS.minimumDayIndex,
    SCHEDULE_LIMITS.maximumDayIndex,
    {
      code: 'INVALID_SCHEDULE_DAY_INDEX',
      message:
        'A nap indexe 0 (hétfő) és 6 (vasárnap) közötti egész szám legyen.',
      field: 'day'
    }
  );
}

function normalizeWeekday(value) {
  return integerInRange(
    value,
    SCHEDULE_LIMITS.minimumWeekday,
    SCHEDULE_LIMITS.maximumWeekday,
    {
      code: 'INVALID_SCHEDULE_WEEKDAY',
      message:
        'A nap 1 (hétfő) és 7 (vasárnap) közötti egész szám legyen.',
      field: 'day'
    }
  );
}

function normalizeScheduleTime(value) {
  const normalized =
    String(value || '').trim();

  if (
    !SCHEDULE_TIME_PATTERN.test(
      normalized
    )
  ) {
    throw new ScheduleValidationError(
      'INVALID_SCHEDULE_TIME',
      'Az idő formátuma HH:MM legyen.',
      {
        field: 'time',
        received: value
      }
    );
  }

  return normalized;
}

function normalizeScheduleFilename(value) {
  const normalized =
    String(value || '').trim().toUpperCase();

  if (
    !SCHEDULE_FILENAME_PATTERN.test(
      normalized
    )
  ) {
    throw new ScheduleValidationError(
      'INVALID_SCHEDULE_FILENAME',
      'Érvénytelen ütemezésfájl-név. Formátum: S0L1.JS.',
      {
        field: 'filename',
        received: value
      }
    );
  }

  return normalized;
}

function scheduleInteger(
  value,
  minimum,
  maximum,
  code,
  message,
  field
) {
  return integerInRange(
    value,
    minimum,
    maximum,
    {
      code,
      message,
      field
    }
  );
}

function normalizeScheduleLed(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new ScheduleValidationError(
      'INVALID_SCHEDULE_LED',
      'Az időzítés LED-beállítása JSON objektum legyen.'
    );
  }

  let id;
  let color;

  try {
    id = normalizeLedId(input.id);
  } catch (error) {
    throw new ScheduleValidationError(
      'INVALID_SCHEDULE_LED_ID',
      'Az időzítés LED azonosítója 1, 2 vagy 3 lehet.',
      {
        received: input.id
      }
    );
  }

  if (typeof input.enabled !== 'boolean') {
    throw new ScheduleValidationError(
      'INVALID_SCHEDULE_LED_ENABLED',
      'Az időzített LED enabled értéke igaz vagy hamis lehet.',
      {
        id,
        received: input.enabled
      }
    );
  }

  try {
    color = normalizeColor(input.color);
  } catch (error) {
    throw new ScheduleValidationError(
      'INVALID_SCHEDULE_LED_COLOR',
      'Az időzített LED színe érvénytelen.',
      {
        id,
        received: input.color
      }
    );
  }

  return Object.freeze({
    id,
    enabled: input.enabled,
    brightness: scheduleInteger(
      input.brightness,
      SCHEDULE_LIMITS.minimumBrightness,
      SCHEDULE_LIMITS.maximumBrightness,
      'INVALID_SCHEDULE_LED_BRIGHTNESS',
      'Az időzített fényerő 0 és 255 közötti egész szám legyen.',
      'brightness'
    ),
    effect: scheduleInteger(
      input.effect,
      SCHEDULE_LIMITS.minimumEffect,
      SCHEDULE_LIMITS.maximumEffect,
      'INVALID_SCHEDULE_LED_EFFECT',
      'Az időzített effekt 0 és 4 közötti egész szám legyen.',
      'effect'
    ),
    speed:
      input.speed === undefined
        ? 50
        : scheduleInteger(
            input.speed,
            SCHEDULE_LIMITS.minimumSpeed,
            SCHEDULE_LIMITS.maximumSpeed,
            'INVALID_SCHEDULE_LED_SPEED',
            'Az időzített effekt sebessége 1 és 100 közötti egész szám legyen.',
            'speed'
          ),
    color
  });
}

function normalizePortableSchedule(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new ScheduleValidationError(
      'INVALID_SCHEDULE',
      'Az időzítés JSON objektum legyen.'
    );
  }

  if (
    !Array.isArray(input.leds) ||
    input.leds.length === 0
  ) {
    throw new ScheduleValidationError(
      'EMPTY_SCHEDULE_LEDS',
      'Legalább egy LED-et ki kell választani.'
    );
  }

  if (input.leds.length > 3) {
    throw new ScheduleValidationError(
      'TOO_MANY_SCHEDULE_LEDS',
      'Egy időzítés legfeljebb három LED-beállítást tartalmazhat.'
    );
  }

  const leds = input.leds.map(
    normalizeScheduleLed
  );

  const uniqueIds =
    new Set(
      leds.map((led) => led.id)
    );

  if (uniqueIds.size !== leds.length) {
    throw new ScheduleValidationError(
      'DUPLICATE_SCHEDULE_LED',
      'Egy LED egy időzítésen belül csak egyszer szerepelhet.'
    );
  }

  const normalized = {
    day: normalizeWeekday(
      input.day
    ),
    time: normalizeScheduleTime(
      input.time
    ),
    leds
  };

  if (
    typeof input.id === 'string' &&
    input.id.trim()
  ) {
    normalized.id =
      input.id.trim().slice(0, 128);
  }

  return Object.freeze(
    normalized
  );
}

function normalizeScheduleList(
  input,
  {
    maximumEntries =
      SCHEDULE_LIMITS.maximumEntries,
    allowEmpty = false
  } = {}
) {
  if (!Array.isArray(input)) {
    throw new ScheduleValidationError(
      'INVALID_SCHEDULE_LIST',
      'Az időzítések listája tömb legyen.'
    );
  }

  if (
    !allowEmpty &&
    input.length === 0
  ) {
    throw new ScheduleValidationError(
      'EMPTY_SCHEDULE_LIST',
      'Legalább egy időzítést meg kell adni.'
    );
  }

  if (input.length > maximumEntries) {
    throw new ScheduleValidationError(
      'TOO_MANY_SCHEDULES',
      `Legfeljebb ${maximumEntries} időzítés küldhető egyszerre.`,
      {
        maximumEntries,
        received:
          input.length
      }
    );
  }

  return Object.freeze(
    input.map(
      normalizePortableSchedule
    )
  );
}

module.exports = {
  SCHEDULE_FILENAME_PATTERN,
  SCHEDULE_LIMITS,
  SCHEDULE_TIME_PATTERN,
  normalizeDayIndex,
  normalizePortableSchedule,
  normalizeScheduleFilename,
  normalizeScheduleLed,
  normalizeScheduleList,
  normalizeScheduleTime,
  normalizeWeekday
};
