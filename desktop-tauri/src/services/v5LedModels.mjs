import {
  unwrapApiPayload
} from '../api/ui/api-payload.mjs';

function clamp(
  value,
  minimum,
  maximum,
  fallback
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.round(number)
    )
  );
}

function normalizeColor(
  value,
  fallback = [
    255,
    255,
    255
  ]
) {
  if (
    Array.isArray(value) &&
    value.length >= 3
  ) {
    return [
      clamp(
        value[0],
        0,
        255,
        fallback[0]
      ),
      clamp(
        value[1],
        0,
        255,
        fallback[1]
      ),
      clamp(
        value[2],
        0,
        255,
        fallback[2]
      )
    ];
  }

  if (
    value &&
    typeof value ===
      'object'
  ) {
    return [
      clamp(
        value.r ??
        value.red,
        0,
        255,
        fallback[0]
      ),
      clamp(
        value.g ??
        value.green,
        0,
        255,
        fallback[1]
      ),
      clamp(
        value.b ??
        value.blue,
        0,
        255,
        fallback[2]
      )
    ];
  }

  return [
    ...fallback
  ];
}

function normalizeBoolean(
  value,
  fallback = false
) {
  if (
    typeof value ===
      'boolean'
  ) {
    return value;
  }

  if (
    value === 1 ||
    value === '1' ||
    value === 'true'
  ) {
    return true;
  }

  if (
    value === 0 ||
    value === '0' ||
    value === 'false'
  ) {
    return false;
  }

  return fallback;
}

export function normalizeLedStrip(
  value,
  fallback = null,
  index = 0
) {
  const source =
    value &&
    typeof value ===
      'object'
      ? value
      : {};

  const fallbackValue =
    fallback &&
    typeof fallback ===
      'object'
      ? fallback
      : {};

  return {
    id:
      clamp(
        source.id ??
        fallbackValue.id ??
        index + 1,
        1,
        255,
        index + 1
      ),
    enabled:
      normalizeBoolean(
        source.enabled ??
        source.active,
        fallbackValue.enabled ??
        false
      ),
    brightness:
      clamp(
        source.brightness,
        0,
        255,
        fallbackValue
          .brightness ??
        128
      ),
    effect:
      clamp(
        source.effect,
        0,
        255,
        fallbackValue.effect ??
        0
      ),
    speed:
      clamp(
        source.speed,
        1,
        100,
        fallbackValue.speed ??
        50
      ),
    color:
      normalizeColor(
        source.color ?? {
          red:
            source.red,
          green:
            source.green,
          blue:
            source.blue
        },
        fallbackValue.color ??
        [
          255,
          255,
          255
        ]
      )
  };
}

export function normalizeLedList(
  value,
  fallback = []
) {
  const payload =
    unwrapApiPayload(value);

  const candidates =
    Array.isArray(payload)
      ? payload
      : (
          Array.isArray(
            payload?.leds
          )
            ? payload.leds
            : (
                Array.isArray(
                  payload?.strips
                )
                  ? payload.strips
                  : []
              )
        );

  const fallbackMap =
    new Map(
      (
        Array.isArray(fallback)
          ? fallback
          : []
      ).map(
        (strip) => [
          Number(strip.id),
          strip
        ]
      )
    );

  if (
    candidates.length ===
      0
  ) {
    return (
      Array.isArray(fallback)
        ? fallback
        : []
    ).map(
      (strip, index) =>
        normalizeLedStrip(
          strip,
          strip,
          index
        )
    );
  }

  return candidates.map(
    (strip, index) =>
      normalizeLedStrip(
        strip,
        fallbackMap.get(
          Number(strip?.id)
        ) ??
        fallback[index],
        index
      )
  );
}

export function ledCommand(
  strip
) {
  return {
    enabled:
      strip.enabled === true,
    brightness:
      clamp(
        strip.brightness,
        0,
        255,
        128
      ),
    effect:
      clamp(
        strip.effect,
        0,
        4,
        0
      ),
    speed:
      clamp(
        strip.speed,
        1,
        100,
        50
      ),
    color:
      normalizeColor(
        strip.color
      )
  };
}

export function presetCommands(
  strips,
  preset
) {
  const source =
    Array.isArray(strips)
      ? strips
      : [];

  return source.map(
    (strip) => {
      if (
        preset ===
          'night'
      ) {
        return {
          ...strip,
          enabled: true,
          brightness: 45,
          effect: 0,
          speed: 50,
          color: [
            20,
            65,
            255
          ]
        };
      }

      if (
        preset ===
          'rainbow'
      ) {
        return {
          ...strip,
          enabled: true,
          brightness: 190,
          effect: 3,
          speed: 55
        };
      }

      return {
        ...strip,
        enabled: true,
        brightness: 150,
        effect: 2,
        speed: 35,
        color: [
          80,
          160,
          255
        ]
      };
    }
  );
}

export function shouldUseDirectFallback({
  authenticated,
  online
} = {}) {
  return !authenticated ||
    !online;
}
