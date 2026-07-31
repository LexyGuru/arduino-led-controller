import {
  directArduinoTargets,
  directArduinoUrl,
  normalizeDirectArduinoProfile,
  validateDirectArduinoProfile
} from './direct-arduino-profile-store.mjs';

export class DirectArduinoClientError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'DirectArduinoClientError';
    this.code = code;
    this.details = details;
  }
}

export class DirectArduinoClient {
  constructor({ profile, deviceKey, fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
    if (typeof fetchImpl !== 'function') {
      throw new TypeError('A fetch implementáció kötelező.');
    }

    const result = validateDirectArduinoProfile(profile);
    if (!result.valid) {
      throw new DirectArduinoClientError('INVALID_PROFILE', result.errors.join(' '));
    }

    const key = String(deviceKey || '').trim();
    if (key.length < 24 || key.length > 64 || !/^[\x21-\x7e]+$/.test(key)) {
      throw new DirectArduinoClientError('INVALID_DEVICE_KEY', 'Az X-Device-Key érvénytelen.');
    }

    this.profile = normalizeDirectArduinoProfile(result.profile);
    this.deviceKey = key;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async request(endpoint, { method = 'GET', body = undefined } = {}) {
    const failures = [];

    for (const target of directArduinoTargets(this.profile)) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const url = directArduinoUrl(this.profile, target, endpoint);

      try {
        const response = await this.fetchImpl(url, {
          method,
          headers: {
            Accept: 'application/json',
            'X-Device-Key': this.deviceKey,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal
        });

        const text = await response.text();
        let payload = null;
        try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }

        if (!response.ok) {
          throw new DirectArduinoClientError(
            `HTTP_${response.status}`,
            `Arduino HTTP hiba: ${response.status}`,
            { target, payload }
          );
        }

        return { target, payload, status: response.status };
      } catch (error) {
        failures.push({ target, error });
      } finally {
        clearTimeout(timer);
      }
    }

    throw new DirectArduinoClientError('ALL_TARGETS_FAILED', 'Egyik Arduino végpont sem érhető el.', failures);
  }

  async status() {
    const result = await this.request('/api/status');
    const value = result.payload || {};

    if (value.firmwareVersion !== this.profile.expectedFirmwareVersion) {
      throw new DirectArduinoClientError('FIRMWARE_VERSION_MISMATCH', 'A firmware-verzió nem egyezik.', value);
    }

    if (value.directApiVersion !== this.profile.expectedDirectApiVersion) {
      throw new DirectArduinoClientError('DIRECT_API_VERSION_MISMATCH', 'A Direct API-verzió nem egyezik.', value);
    }

    if (value.queryKeyFallbackEnabled !== false) {
      throw new DirectArduinoClientError('QUERY_FALLBACK_NOT_DISABLED', 'A query-key fallback nincs véglegesen letiltva.', value);
    }

    return result;
  }
}
