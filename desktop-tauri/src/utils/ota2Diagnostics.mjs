const SECRET_KEYS = /(?:password|passwd|secret|token|authorization|api[_-]?key|device[_-]?key|bearer|credential)/i;
const HEADER_SECRET = /(authorization\s*[:=]\s*)([^\r\n]+)/ig;
const BEARER = /(bearer\s+)[a-z0-9._~+\/-]+=*/ig;
const QUERY_SECRET = /([?&](?:k|key|token|password|secret|api_key|device_key)=)[^&#\s]*/ig;

export function scrubOta2DiagnosticText(value) {
  return String(value ?? "")
    .replace(HEADER_SECRET, "$1[REDACTED]")
    .replace(BEARER, "$1[REDACTED]")
    .replace(QUERY_SECRET, "$1[REDACTED]");
}

export function scrubOta2Diagnostics(value, seen = new WeakSet()) {
  if (value == null) return value;
  if (typeof value === "string") return scrubOta2DiagnosticText(value);
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => scrubOta2Diagnostics(item, seen));
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SECRET_KEYS.test(key) ? "[REDACTED]" : scrubOta2Diagnostics(item, seen);
  }
  return out;
}
