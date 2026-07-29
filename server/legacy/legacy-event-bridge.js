'use strict';

const LEGACY_EVENT_MAP =
  Object.freeze({
    'led.updated':
      'ledUpdate',
    'led.all-changed':
      'allLedsUpdate',
    'led.reset':
      'ledsReset',
    'led.debug':
      'ledDebug',
    'schedule.reloaded':
      'schedulesReloaded',
    'schedule.generated':
      'schedulesGenerated',
    'schedule.cleared':
      'schedulesCleared',
    'schedule.tested':
      'scheduleTested',
    'schedule.synced':
      'schedulesSynced',
    'local-schedule.created':
      'localSchedulesChanged',
    'local-schedule.updated':
      'localSchedulesChanged',
    'local-schedule.removed':
      'localSchedulesChanged',
    'local-schedule.imported':
      'localSchedulesChanged',
    'local-schedule.run':
      'scheduledLedUpdate',
    'firmware.state':
      'firmwareUpdate',
    'arduino.restarting':
      'arduinoRestarting',
    'arduino.console-cleared':
      'consoleCleared',
    'settings.arduino-updated':
      'arduinoSettingsUpdated'
  });

function legacyEventPayload(
  event
) {
  const payload =
    event?.payload &&
    typeof event.payload ===
      'object'
      ? {
          ...event.payload
        }
      : {
          value:
            event?.payload
        };

  return {
    ...payload,
    timestamp:
      event?.timestamp ||
      new Date()
        .toISOString(),
    eventId:
      event?.id ||
      null
  };
}

class LegacyEventBridge {
  constructor({
    eventBus,
    logger = null
  } = {}) {
    if (
      !eventBus ||
      typeof eventBus
        .subscribeAll !==
        'function'
    ) {
      throw new TypeError(
        'A LegacyEventBridge számára EventBus szükséges.'
      );
    }

    this.eventBus =
      eventBus;
    this.logger =
      logger;
    this.io = null;
    this.unsubscribe =
      null;
  }

  install(io) {
    if (!io) {
      throw new TypeError(
        'A LegacyEventBridge számára Socket.IO példány szükséges.'
      );
    }

    this.io = io;
    this.unsubscribe?.();

    this.unsubscribe =
      this.eventBus
        .subscribeAll(
          (event) => {
            const legacyName =
              LEGACY_EVENT_MAP[
                event.topic
              ];

            if (!legacyName) {
              return;
            }

            io.emit(
              legacyName,
              legacyEventPayload(
                event
              )
            );
          }
        );

    this.logger?.info?.(
      'Legacy Socket.IO eseményhíd telepítve.'
    );

    return this;
  }

  close() {
    this.unsubscribe?.();
    this.unsubscribe =
      null;
    this.io =
      null;
  }
}

module.exports = {
  LEGACY_EVENT_MAP,
  LegacyEventBridge,
  legacyEventPayload
};
