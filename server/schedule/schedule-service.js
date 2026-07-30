'use strict';

const {
  ScheduleServiceError
} = require('./schedule-error');

const {
  encodeScheduleHex
} = require('./schedule-codec');

const {
  normalizeDayIndex,
  normalizeScheduleFilename,
  normalizeScheduleList,
  normalizeScheduleTime
} = require('./schedule-validation');

const {
  EVENT_TOPICS
} = require('../events/topics');

function normalizeArduinoPayload(
  payload
) {
  return (
    payload &&
    typeof payload === 'object'
  )
    ? payload
    : {
        raw: payload
      };
}

class ScheduleService {
  constructor({
    arduinoClient,
    logger = null,
    eventBus = null
  } = {}) {
    if (
      !arduinoClient ||
      typeof arduinoClient.get !==
      'function'
    ) {
      throw new TypeError(
        'A schedule szolgáltatáshoz ArduinoClient szükséges.'
      );
    }

    this.arduinoClient =
      arduinoClient;
    this.logger = logger;
    this.eventBus = eventBus;
  }

  async call(
    endpoint,
    {
      query = {},
      source =
        'arduino-led-controller-schedule'
    } = {}
  ) {
    const result =
      await this.arduinoClient.get(
        endpoint,
        {
          query,
          source
        }
      );

    return {
      arduino:
        normalizeArduinoPayload(
          result.data
        ),
      latencyMs:
        result.latencyMs
    };
  }

  async getStatus() {
    return this.call(
      'api/schedule/status',
      {
        source:
          'arduino-led-controller-schedule-status'
      }
    );
  }

  async listFiles() {
    return this.call(
      'api/schedule/files',
      {
        source:
          'arduino-led-controller-schedule-files'
      }
    );
  }

  async getDebug() {
    return this.call(
      'api/schedule/debug',
      {
        source:
          'arduino-led-controller-schedule-debug'
      }
    );
  }

  async getDay(value) {
    const day =
      normalizeDayIndex(value);

    const result =
      await this.call(
        `api/schedule/day/${day}`,
        {
          source:
            'arduino-led-controller-schedule-day'
        }
      );

    return {
      day,
      ...result
    };
  }

  async getFile(value) {
    const filename =
      normalizeScheduleFilename(
        value
      );

    const result =
      await this.call(
        `api/schedule/file/${filename}`,
        {
          source:
            'arduino-led-controller-schedule-file'
        }
      );

    return {
      filename,
      ...result
    };
  }

  async reload() {
    const result =
      await this.call(
        'api/schedule/reload',
        {
          source:
            'arduino-led-controller-schedule-reload'
        }
      );

    this.eventBus?.publish?.(
      EVENT_TOPICS.SCHEDULE_RELOADED,
      {
        latencyMs:
          result.latencyMs
      }
    );

    return result;
  }

  async generate() {
    const result =
      await this.call(
        'api/schedule/generate',
        {
          source:
            'arduino-led-controller-schedule-generate'
        }
      );

    this.eventBus?.publish?.(
      EVENT_TOPICS.SCHEDULE_GENERATED,
      {
        latencyMs:
          result.latencyMs
      }
    );

    return result;
  }

  async clear() {
    const result =
      await this.call(
        'api/schedule/clear',
        {
          source:
            'arduino-led-controller-schedule-clear'
        }
      );

    this.eventBus?.publish?.(
      EVENT_TOPICS.SCHEDULE_CLEARED,
      {
        latencyMs:
          result.latencyMs
      }
    );

    return result;
  }

  async test(value) {
    const time =
      normalizeScheduleTime(value);

    const result =
      await this.call(
        `api/schedule/test/${time}`,
        {
          source:
            'arduino-led-controller-schedule-test'
        }
      );

    const response = {
      time,
      ...result
    };

    this.eventBus?.publish?.(
      EVENT_TOPICS.SCHEDULE_TESTED,
      {
        time,
        latencyMs:
          result.latencyMs
      }
    );

    return response;
  }

  async getOverview() {
    const status =
      await this.getStatus();

    const files =
      await this.listFiles();

    return {
      status:
        status.arduino,
      files:
        files.arduino,
      latencyMs:
        status.latencyMs +
        files.latencyMs
    };
  }

  async sync(input) {
    const schedules =
      normalizeScheduleList(input);

    let lastResult = null;
    let totalLatencyMs = 0;

    for (
      let index = 0;
      index < schedules.length;
      index += 1
    ) {
      const result =
        await this.arduinoClient.get(
          'api/schedules/chunk',
          {
            query: {
              index,
              total:
                schedules.length,
              payload:
                encodeScheduleHex(
                  schedules[index]
                )
            },
            source:
              'arduino-led-controller-schedule-sync'
          }
        );

      lastResult = result.data;
      totalLatencyMs +=
        Number(result.latencyMs) || 0;
    }

    const receivedCount =
      Number(
        lastResult?.count
      );

    if (
      Number.isFinite(receivedCount) &&
      receivedCount !==
        schedules.length
    ) {
      throw ScheduleServiceError
        .syncMismatch(
          schedules.length,
          receivedCount
        );
    }

    this.logger?.info?.(
      'Arduino EEPROM időzítés szinkronizálva.',
      {
        count:
          schedules.length
      }
    );

    const response = {
      count:
        schedules.length,
      arduino:
        normalizeArduinoPayload(
          lastResult
        ),
      latencyMs:
        totalLatencyMs
    };

    this.eventBus?.publish?.(
      EVENT_TOPICS.SCHEDULE_SYNCED,
      {
        count:
          schedules.length,
        latencyMs:
          totalLatencyMs
      }
    );

    return response;
  }
}

module.exports = {
  ScheduleService,
  normalizeArduinoPayload
};
