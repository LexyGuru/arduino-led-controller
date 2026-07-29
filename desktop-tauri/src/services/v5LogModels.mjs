import { unwrapApiPayload } from '../api/ui/api-payload.mjs';

function text(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
}

export function normalizeConsoleLogs(value) {
  const payload = unwrapApiPayload(value) || {};
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.logs)
      ? payload.logs
      : [];

  return list
    .map((entry, index) => ({
      id: Number(entry?.id) || index + 1,
      timestamp: String(entry?.timestamp || entry?.time || '—'),
      type: String(entry?.type || entry?.level || 'info').toLowerCase(),
      message: text(entry?.message ?? entry?.text ?? entry)
    }))
    .sort((left, right) => right.id - left.id);
}

export function normalizeAuditEntries(value) {
  const payload = unwrapApiPayload(value) || {};
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.entries)
      ? payload.entries
      : [];

  return list.map((entry, index) => ({
    id: String(entry?.id || `${entry?.timestamp || 'audit'}-${index}`),
    timestamp: entry?.timestamp || null,
    action: String(entry?.action || 'unknown'),
    subject: String(entry?.principal?.subject || 'system'),
    role: entry?.principal?.role || null,
    method: entry?.request?.method || null,
    path: entry?.request?.path || null,
    details: entry?.details || null
  }));
}

export function normalizeEvents(value) {
  const payload = unwrapApiPayload(value) || {};
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.events)
      ? payload.events
      : [];

  return list.map((event, index) => ({
    id: String(event?.id || `${event?.timestamp || 'event'}-${index}`),
    topic: String(event?.topic || 'unknown'),
    timestamp: event?.timestamp || null,
    payload: event?.payload ?? event?.data ?? null,
    meta: event?.meta || null
  }));
}

export function mergeEvents(current, incoming, maximum = 300) {
  const merged = new Map();
  for (const event of [...incoming, ...current]) {
    merged.set(String(event.id), event);
  }

  return [...merged.values()]
    .sort((left, right) =>
      String(right.timestamp || '').localeCompare(
        String(left.timestamp || '')
      )
    )
    .slice(0, maximum);
}

export function formatLogPayload(value) {
  const result = text(value);
  return result.length > 800
    ? `${result.slice(0, 800)}…`
    : result;
}
