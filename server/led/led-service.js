'use strict';

const {
  LedServiceError
} = require('./led-error');

const {
  normalizeLedId,
  normalizeLedPatch,
  toArduinoLedQuery
} = require('./led-validation');

const {
  EVENT_TOPICS
} = require('../events/topics');

function normalizeStatusPayload(payload) {
  const source =
    payload &&
    typeof payload === 'object'
      ? payload
      : {
          raw: payload
        };

  const candidates =
    Array.isArray(source.leds)
      ? source.leds
      : (
          Array.isArray(source.strips)
            ? source.strips
            : []
        );

  const leds = candidates.map(
    (item, index) => ({
      ...item,
      id:
        Number(item?.id) ||
        index + 1
    })
  );

  return {
    leds,
    raw: source
  };
}

class LedService {
  constructor({
    arduinoClient,
    logger = null,
    eventBus = null
  } = {}) {
    if (
      !arduinoClient ||
      typeof arduinoClient.request !==
      'function'
    ) {
      throw new TypeError(
        'A LED szolgáltatáshoz ArduinoClient szükséges.'
      );
    }

    this.arduinoClient =
      arduinoClient;
    this.logger = logger;
    this.eventBus = eventBus;
  }

  async getAllStatus() {
    const result =
      await this.arduinoClient.get(
        'api/led/status',
        {
          source:
            'arduino-led-controller-led-status'
        }
      );

    const normalized =
      normalizeStatusPayload(
        result.data
      );

    return {
      ...normalized,
      latencyMs:
        result.latencyMs
    };
  }

  async getStripStatus(id) {
    const normalizedId =
      normalizeLedId(id);

    const status =
      await this.getAllStatus();

    const led = status.leds.find(
      (item) =>
        Number(item.id) ===
        normalizedId
    );

    if (!led) {
      throw LedServiceError
        .notFound(
          normalizedId
        );
    }

    return {
      led,
      latencyMs:
        status.latencyMs
    };
  }

  async updateStrip(
    id,
    input
  ) {
    const normalizedId =
      normalizeLedId(id);

    const command =
      normalizeLedPatch(input);

    const query =
      toArduinoLedQuery(
        command
      );

    const result =
      await this.arduinoClient.get(
        `api/led/${normalizedId}`,
        {
          query,
          source:
            'arduino-led-controller-led-update'
        }
      );

    this.logger?.info?.(
      'LED beállítás elküldve.',
      {
        id:
          normalizedId,
        fields:
          Object.keys(command)
      }
    );

    const response = {
      id:
        normalizedId,
      command,
      arduino:
        result.data,
      latencyMs:
        result.latencyMs
    };

    this.eventBus?.publish?.(
      EVENT_TOPICS.LED_UPDATED,
      {
        id:
          normalizedId,
        command,
        latencyMs:
          result.latencyMs
      }
    );

    return response;
  }

  async setAllEnabled(enabled) {
    if (typeof enabled !== 'boolean') {
      throw new TypeError(
        'Az összes LED állapota boolean legyen.'
      );
    }

    const endpoint =
      enabled
        ? 'api/all-on'
        : 'api/all-off';

    const result =
      await this.arduinoClient.get(
        endpoint,
        {
          source:
            'arduino-led-controller-led-all'
        }
      );

    const response = {
      enabled,
      arduino:
        result.data,
      latencyMs:
        result.latencyMs
    };

    this.eventBus?.publish?.(
      EVENT_TOPICS.LED_ALL_CHANGED,
      {
        enabled,
        latencyMs:
          result.latencyMs
      }
    );

    return response;
  }

  async reset() {
    const result =
      await this.arduinoClient.get(
        'api/led/reset',
        {
          source:
            'arduino-led-controller-led-reset'
        }
      );

    const response = {
      reset: true,
      arduino:
        result.data,
      latencyMs:
        result.latencyMs
    };

    this.eventBus?.publish?.(
      EVENT_TOPICS.LED_RESET,
      {
        latencyMs:
          result.latencyMs
      }
    );

    return response;
  }
}

module.exports = {
  LedService,
  normalizeStatusPayload
};
