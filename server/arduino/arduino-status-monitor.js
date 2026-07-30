'use strict';

const {
  EVENT_TOPICS
} = require('../events/topics');

class ArduinoStatusMonitor {
  constructor({
    arduinoClient,
    eventBus = null,
    metrics = null,
    logger = null,
    intervalMs = 30000,
    timeoutMs = 5000,
    clock = () => new Date()
  } = {}) {
    if (!arduinoClient || typeof arduinoClient.getStatus !== 'function') {
      throw new TypeError('Az ArduinoStatusMonitor számára ArduinoClient szükséges.');
    }

    this.arduinoClient = arduinoClient;
    this.eventBus = eventBus;
    this.metrics = metrics;
    this.logger = logger;
    this.intervalMs = Math.max(5000, Number(intervalMs) || 30000);
    this.timeoutMs = Math.max(500, Number(timeoutMs) || 5000);
    this.clock = clock;
    this.timer = null;
    this.running = false;
    this.polling = null;
    this.state = {
      connected: false,
      lastPollAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      consecutiveFailures: 0,
      latencyMs: null,
      status: null,
      error: null
    };
  }

  getStatus() {
    return {
      active: this.running,
      intervalMs: this.intervalMs,
      timeoutMs: this.timeoutMs,
      ...this.state
    };
  }

  start({ immediate = true } = {}) {
    if (this.running) return this.getStatus();
    this.running = true;
    if (immediate) {
      this.poll().catch(() => undefined);
    }
    this.timer = setInterval(() => {
      this.poll().catch(() => undefined);
    }, this.intervalMs);
    this.timer.unref?.();
    return this.getStatus();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    return this.getStatus();
  }

  poll() {
    if (this.polling) return this.polling;
    this.polling = this.pollDirect().finally(() => {
      this.polling = null;
    });
    return this.polling;
  }

  async pollDirect() {
    const polledAt = this.clock().toISOString();
    const startedAt = Date.now();
    this.state.lastPollAt = polledAt;

    try {
      const result = await this.arduinoClient.getStatus({
        timeoutMs: this.timeoutMs,
        source: 'arduino-led-status-monitor'
      });

      const latencyMs = Number(result.latencyMs) || (Date.now() - startedAt);
      this.state = {
        connected: true,
        lastPollAt: polledAt,
        lastSuccessAt: polledAt,
        lastFailureAt: this.state.lastFailureAt,
        consecutiveFailures: 0,
        latencyMs,
        status: result.status,
        error: null
      };

      this.metrics?.increment?.('arduino.status_monitor.success');
      this.metrics?.observe?.('arduino.status_monitor.duration', latencyMs);
      this.eventBus?.publish?.(
        EVENT_TOPICS.ARDUINO_STATUS,
        {
          connected: true,
          latencyMs,
          status: result.status
        }
      );

      return this.getStatus();
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const failures = this.state.consecutiveFailures + 1;
      this.state = {
        connected: false,
        lastPollAt: polledAt,
        lastSuccessAt: this.state.lastSuccessAt,
        lastFailureAt: polledAt,
        consecutiveFailures: failures,
        latencyMs,
        status: this.state.status,
        error: {
          code: error.code || 'ARDUINO_UNREACHABLE',
          message: error.message
        }
      };

      this.metrics?.increment?.('arduino.status_monitor.failure');
      this.metrics?.observe?.('arduino.status_monitor.duration', latencyMs);
      this.eventBus?.publish?.(
        EVENT_TOPICS.ARDUINO_OFFLINE,
        {
          connected: false,
          consecutiveFailures: failures,
          latencyMs,
          code: error.code || 'ARDUINO_UNREACHABLE',
          message: error.message
        }
      );
      this.logger?.warn?.('Arduino státuszfigyelés sikertelen.', {
        code: error.code,
        consecutiveFailures: failures
      });

      return this.getStatus();
    }
  }
}

module.exports = {
  ArduinoStatusMonitor
};
