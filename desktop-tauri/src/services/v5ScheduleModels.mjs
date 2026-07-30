import { unwrapApiPayload } from '../api/ui/api-payload.mjs';

function clamp(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

function normalizeColor(value) {
  if (Array.isArray(value) && value.length >= 3) {
    return [
      clamp(value[0], 0, 255, 255),
      clamp(value[1], 0, 255, 255),
      clamp(value[2], 0, 255, 255)
    ];
  }

  return [
    clamp(value?.red ?? value?.r, 0, 255, 255),
    clamp(value?.green ?? value?.g, 0, 255, 255),
    clamp(value?.blue ?? value?.b, 0, 255, 255)
  ];
}

export function normalizeSchedule(value, index = 0) {
  const source = value && typeof value === 'object' ? value : {};
  const leds = (Array.isArray(source.leds) ? source.leds : [])
    .map((led) => ({
      id: clamp(led?.id, 1, 3, 1),
      enabled: led?.enabled === true,
      brightness: clamp(led?.brightness, 0, 255, 128),
      effect: clamp(led?.effect, 0, 4, 0),
      speed: clamp(led?.speed, 1, 100, 50),
      color: normalizeColor(led?.color ?? led)
    }))
    .sort((left, right) => left.id - right.id);

  return {
    id: String(source.id || `schedule-${index + 1}`),
    day: clamp(source.day, 1, 7, 1),
    time: /^\d{2}:\d{2}$/.test(String(source.time || ''))
      ? String(source.time)
      : '19:30',
    leds
  };
}

export function normalizeScheduleList(value) {
  const payload = unwrapApiPayload(value);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.schedules)
      ? payload.schedules
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  return list
    .map(normalizeSchedule)
    .sort((left, right) =>
      left.day - right.day ||
      left.time.localeCompare(right.time) ||
      left.id.localeCompare(right.id)
    );
}

export function scheduleFingerprint(schedules) {
  return JSON.stringify(
    normalizeScheduleList(schedules).map((schedule) => ({
      id: schedule.id,
      day: schedule.day,
      time: schedule.time,
      leds: schedule.leds
    }))
  );
}

export function normalizeRunnerStatus(value) {
  const payload = unwrapApiPayload(value) || {};
  return {
    mode: String(payload.mode || 'ismeretlen'),
    running: payload.running === true,
    intervalMs: Number(payload.intervalMs || 0),
    lastTickAt: payload.lastTickAt || null,
    lastRunAt: payload.lastRunAt || null,
    lastError: payload.lastError || null
  };
}

export function isScheduleEvent(event) {
  const topic = String(event?.topic || '');
  return (
    topic.startsWith('schedule.') ||
    topic.startsWith('schedule-file.') ||
    topic.startsWith('local-schedule.')
  );
}
