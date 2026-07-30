'use strict';

const {
  LedValidationError
} = require('./led-error');

const LED_LIMITS = Object.freeze({
  minimumId: 1,
  maximumId: 3,
  minimumBrightness: 0,
  maximumBrightness: 255,
  minimumEffect: 0,
  maximumEffect: 4,
  minimumSpeed: 1,
  maximumSpeed: 100
});

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
  if (
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new LedValidationError(
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

  return value;
}

function normalizeLedId(value) {
  const parsed = Number(value);

  return integerInRange(
    parsed,
    LED_LIMITS.minimumId,
    LED_LIMITS.maximumId,
    {
      code: 'INVALID_LED_ID',
      message:
        'A LED azonosítója 1, 2 vagy 3 lehet.',
      field: 'id'
    }
  );
}

function normalizeRgbComponent(
  value,
  index
) {
  const parsed = Number(value);

  return integerInRange(
    parsed,
    0,
    255,
    {
      code: 'INVALID_LED_COLOR',
      message:
        'A szín három, 0 és 255 közötti RGB értékből álljon.',
      field: `color[${index}]`
    }
  );
}

function colorFromHex(value) {
  const match =
    String(value || '')
      .trim()
      .match(
        /^#?([A-Fa-f0-9]{6})$/
      );

  if (!match) return null;

  const hex = match[1];

  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
  ];
}

function normalizeColor(value) {
  let components;

  if (Array.isArray(value)) {
    components = value;
  } else if (
    value &&
    typeof value === 'object'
  ) {
    components = [
      value.r ?? value.red,
      value.g ?? value.green,
      value.b ?? value.blue
    ];
  } else {
    const hex = colorFromHex(value);

    components = hex || String(value || '')
      .split(',')
      .map((component) =>
        component.trim()
      );
  }

  if (
    components.length !== 3
  ) {
    throw new LedValidationError(
      'INVALID_LED_COLOR',
      'A szín három RGB értékből vagy #RRGGBB formátumból álljon.',
      {
        field: 'color',
        received: value
      }
    );
  }

  return components.map(
    normalizeRgbComponent
  );
}

function normalizeLedPatch(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new LedValidationError(
      'INVALID_LED_COMMAND',
      'A LED-beállítás JSON objektum legyen.'
    );
  }

  const normalized = {};

  if (
    Object.prototype.hasOwnProperty.call(
      input,
      'enabled'
    )
  ) {
    if (
      typeof input.enabled !==
      'boolean'
    ) {
      throw new LedValidationError(
        'INVALID_LED_ENABLED',
        'Az enabled értéke igaz vagy hamis lehet.',
        {
          field: 'enabled',
          received:
            input.enabled
        }
      );
    }

    normalized.enabled =
      input.enabled;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      input,
      'brightness'
    )
  ) {
    normalized.brightness =
      integerInRange(
        input.brightness,
        LED_LIMITS.minimumBrightness,
        LED_LIMITS.maximumBrightness,
        {
          code:
            'INVALID_LED_BRIGHTNESS',
          message:
            'A fényerő 0 és 255 közötti egész szám legyen.',
          field:
            'brightness'
        }
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      input,
      'effect'
    )
  ) {
    normalized.effect =
      integerInRange(
        input.effect,
        LED_LIMITS.minimumEffect,
        LED_LIMITS.maximumEffect,
        {
          code:
            'INVALID_LED_EFFECT',
          message:
            'Az effekt 0 és 4 közötti egész szám legyen.',
          field:
            'effect'
        }
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      input,
      'speed'
    )
  ) {
    normalized.speed =
      integerInRange(
        input.speed,
        LED_LIMITS.minimumSpeed,
        LED_LIMITS.maximumSpeed,
        {
          code:
            'INVALID_LED_SPEED',
          message:
            'Az effekt sebessége 1 és 100 közötti egész szám legyen.',
          field:
            'speed'
        }
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      input,
      'color'
    )
  ) {
    normalized.color =
      normalizeColor(
        input.color
      );
  }

  if (
    Object.keys(normalized).length === 0
  ) {
    throw new LedValidationError(
      'EMPTY_LED_COMMAND',
      'Legalább egy LED-beállítást meg kell adni.'
    );
  }

  return Object.freeze(
    normalized
  );
}

function toArduinoLedQuery(command) {
  const query = {};

  if (
    Object.prototype.hasOwnProperty.call(
      command,
      'enabled'
    )
  ) {
    query.enabled =
      command.enabled ? '1' : '0';
  }

  for (const field of [
    'brightness',
    'effect',
    'speed'
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(
        command,
        field
      )
    ) {
      query[field] =
        command[field];
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      command,
      'color'
    )
  ) {
    query.color =
      command.color.join(',');
  }

  return query;
}

module.exports = {
  LED_LIMITS,
  colorFromHex,
  normalizeColor,
  normalizeLedId,
  normalizeLedPatch,
  toArduinoLedQuery
};
