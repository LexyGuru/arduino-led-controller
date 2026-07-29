'use strict';

class LegacyCutoverService {
  constructor({
    config,
    cronGuard,
    localScheduleRunner,
    arduinoStatusMonitor,
    arduinoConsoleService,
    scheduleFileService
  } = {}) {
    this.config = config;
    this.cronGuard = cronGuard;
    this.localScheduleRunner = localScheduleRunner;
    this.arduinoStatusMonitor = arduinoStatusMonitor;
    this.arduinoConsoleService = arduinoConsoleService;
    this.scheduleFileService = scheduleFileService;
  }

  snapshot() {
    const cron = this.cronGuard?.snapshot?.() || null;
    return {
      legacyAdapters: {
        api: this.config.legacy.apiAdaptersEnabled,
        localSchedules: this.config.legacy.localScheduleAdaptersEnabled,
        socketBridge: this.config.legacy.socketEventBridgeEnabled
      },
      legacyCronSuppression: {
        localSchedule: this.config.legacy.suppressLocalScheduleCron,
        arduinoStatus: this.config.legacy.suppressStatusCron,
        runtime: cron
      },
      replacements: {
        localScheduleRunner: this.localScheduleRunner?.getStatus?.() || null,
        arduinoStatusMonitor: this.arduinoStatusMonitor?.getStatus?.() || null,
        arduinoConsole: this.arduinoConsoleService?.snapshot?.() || null,
        scheduleFiles: this.scheduleFileService?.status?.() || null
      },
      readyForLegacyCronRemoval: Boolean(
        this.config.legacy.localScheduleAdaptersEnabled &&
        this.config.legacy.suppressLocalScheduleCron &&
        this.config.legacy.suppressStatusCron &&
        this.localScheduleRunner?.getStatus?.().active &&
        this.arduinoStatusMonitor?.getStatus?.().active
      )
    };
  }
}

module.exports = {
  LegacyCutoverService
};
