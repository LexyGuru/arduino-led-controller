'use strict';

const {
  EVENT_TOPICS
} = require('../events/topics');

const WEEKDAY_MAP = Object.freeze({
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7
});

function localDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    weekday: WEEKDAY_MAP[values.weekday],
    time: `${values.hour}:${values.minute}`,
    minuteKey:
      `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
  };
}

class LocalScheduleRunner {
  constructor({
    repository,
    ledService,
    logger = null,
    eventBus = null,
    timeZone = 'Europe/Vienna',
    intervalMs = 15000,
    clock = () => new Date()
  } = {}) {
    if (!repository || !ledService) {
      throw new TypeError(
        'A schedule futtatóhoz repository és LedService szükséges.'
      );
    }

    this.repository = repository;
    this.ledService = ledService;
    this.logger = logger;
    this.eventBus = eventBus;
    this.timeZone = timeZone;
    this.intervalMs = Math.max(5000, Number(intervalMs) || 15000);
    this.clock = clock;
    this.timer = null;
    this.running = false;
    this.lastMinuteKey = null;
    this.lastRun = null;
  }

  getStatus() {
    return {
      active: this.running,
      timeZone: this.timeZone,
      intervalMs: this.intervalMs,
      lastMinuteKey: this.lastMinuteKey,
      lastRun: this.lastRun
    };
  }

  start() {
    if (this.running) {
      return this.getStatus();
    }

    this.running = true;
    this.timer = setInterval(() => {
      this.tick().catch((error) => {
        this.logger?.error?.('Helyi schedule futtatási hiba.', {
          code: error.code,
          message: error.message
        });
      });
    }, this.intervalMs);

    this.timer.unref?.();
    return this.getStatus();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = null;
    this.running = false;
    return this.getStatus();
  }

  async tick({ date = this.clock(), force = false } = {}) {
    const local = localDateParts(date, this.timeZone);

    if (!force && this.lastMinuteKey === local.minuteKey) {
      return {
        skipped: true,
        reason: 'ALREADY_EXECUTED',
        ...local,
        executions: []
      };
    }

    this.lastMinuteKey = local.minuteKey;

    const schedules = await this.repository.list();
    const due = schedules.filter((schedule) => (
      schedule.day === local.weekday &&
      schedule.time === local.time
    ));

    const executions = [];

    for (const schedule of due) {
      for (const led of schedule.leds) {
        try {
          const result = await this.ledService.updateStrip(
            led.id,
            {
              enabled: led.enabled,
              brightness: led.brightness,
              effect: led.effect,
              speed: led.speed,
              color: led.color
            }
          );

          executions.push({
            scheduleId: schedule.id,
            ledId: led.id,
            success: true,
            result
          });
        } catch (error) {
          executions.push({
            scheduleId: schedule.id,
            ledId: led.id,
            success: false,
            code: error.code || 'LED_UPDATE_FAILED',
            message: error.message
          });
        }
      }
    }

    this.lastRun = {
      at: new Date().toISOString(),
      ...local,
      schedules: due.length,
      executions: executions.length,
      failures: executions.filter(
        (execution) =>
          !execution.success
      ).length
    };

    this.eventBus?.publish?.(
      EVENT_TOPICS.LOCAL_SCHEDULE_RUN,
      {
        ...this.lastRun
      }
    );

    return {
      skipped: false,
      ...local,
      schedules: due.length,
      executions
    };
  }
}

module.exports = {
  LocalScheduleRunner,
  WEEKDAY_MAP,
  localDateParts
};
