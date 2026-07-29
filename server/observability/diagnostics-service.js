'use strict';

class DiagnosticsService {
  constructor({
    runtimeProvider
  } = {}) {
    if (
      typeof runtimeProvider !==
      'function'
    ) {
      throw new TypeError(
        'A DiagnosticsService runtimeProvider függvényt igényel.'
      );
    }

    this.runtimeProvider =
      runtimeProvider;
  }

  async snapshot() {
    const runtime =
      this.runtimeProvider();

    const [
      eventStore,
      audit
    ] = await Promise.all([
      runtime.eventStore
        ?.stats?.() ||
        null,
      runtime.auditLog
        ?.stats?.() ||
        null
    ]);

    return {
      generatedAt:
        new Date().toISOString(),
      process: {
        pid:
          process.pid,
        nodeVersion:
          process.version,
        platform:
          process.platform,
        architecture:
          process.arch,
        uptimeSeconds:
          Math.floor(
            process.uptime()
          ),
        memory:
          process.memoryUsage(),
        resourceUsage:
          process.resourceUsage?.() ||
          null
      },
      lifecycle:
        runtime.lifecycle
          ?.snapshot?.() ||
        null,
      metrics:
        runtime.metrics
          ?.snapshot?.() ||
        null,
      eventBus:
        runtime.eventBus
          ?.stats?.() ||
        null,
      eventStore,
      audit,
      socket:
        runtime.socketGateway
          ?.getStatus?.() ||
        null,
      localScheduleRunner:
        runtime.localScheduleRunner?.getStatus?.() || null,
      arduinoStatusMonitor:
        runtime.arduinoStatusMonitor?.getStatus?.() || null,
      arduinoConsole:
        runtime.arduinoConsoleService?.snapshot?.() || null,
      legacyCutover:
        runtime.legacyCutoverService?.snapshot?.() || null,
      scheduleFiles:
        runtime.scheduleFileService?.status?.() || null,
      firmware: {
        state:
          runtime.firmwareService
            ?.state ||
          null
      },
      tokenStore: {
        configured:
          runtime.apiTokenStore
            ?.isConfigured?.() ||
          false,
        entries:
          runtime.apiTokenStore
            ?.publicSummary?.() ||
          []
      }
    };
  }
}

module.exports = {
  DiagnosticsService
};
