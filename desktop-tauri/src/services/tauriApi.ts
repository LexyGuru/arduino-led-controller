import { invoke } from '@tauri-apps/api/core';
import type {
  ArduinoConsoleResponse,
  ArduinoStatus,
  ConnectionConfig,
  FirmwareStatus,
  FirmwareArtifact,
  LedSchedule,
  LedStrip,
  NetworkLog,
  RuntimeCapabilities,
  ScheduleBackup,
  ScheduleSaveResult,
  ScheduleSyncSnapshot
} from '../types';

export const tauriApi = {
  runtimeCapabilities: () => invoke<RuntimeCapabilities>('runtime_capabilities'),
  migrateNativeCredentials: () => invoke<boolean>('migrate_native_credentials'),
  loadConfig: () => invoke<ConnectionConfig>('load_config'),
  saveConfig: (config: ConnectionConfig) => invoke<void>('save_config', { config }),
  saveOtaPassword: (password: string) => invoke<void>('save_ota_password', { password }),
  status: () => invoke<ArduinoStatus>('arduino_status'),
  syncTimeConfig: () => invoke<ArduinoStatus>('sync_time_config'),
  logs: (afterId = 0) => invoke<ArduinoConsoleResponse>('arduino_logs', { afterId }),
  networkLogs: () => invoke<NetworkLog[]>('network_logs'),
  setLed: (strip: LedStrip) => invoke('set_led', {
    id: strip.id,
    enabled: strip.enabled,
    brightness: strip.brightness,
    effect: strip.effect,
    speed: strip.speed,
    color: strip.color
  }),
  loadSchedules: () => invoke<LedSchedule[]>('load_schedules'),
  importSchedulesFile: (path: string) => invoke<LedSchedule[]>('import_schedules_file', { path }),
  exportSchedulesFile: (path: string, schedules: LedSchedule[]) => invoke<void>('export_schedules_file', { path, schedules }),
  loadSchedulesFromArduino: () => invoke<ScheduleSyncSnapshot>('load_schedules_from_arduino'),
  createScheduleBackup: (schedules: LedSchedule[], revision: number | null, checksum: string) =>
    invoke<ScheduleBackup>('create_schedule_backup', { schedules, revision, checksum }),
  listScheduleBackups: () => invoke<ScheduleBackup[]>('list_schedule_backups'),
  saveSchedules: (
    schedules: LedSchedule[],
    expectedRevision: number | null,
    force = false
  ) => invoke<ScheduleSaveResult>('save_and_sync_schedules', {
    schedules,
    expectedRevision,
    force
  }),
  firmwareReleases: () => invoke<FirmwareArtifact[]>('firmware_releases'),
  firmwareInstallRelease: (tag: string) => invoke<FirmwareStatus>('firmware_install_release', { tag }),
  firmwareStatus: () => invoke<FirmwareStatus>('firmware_status'),
  firmwareUpdate: () => invoke<FirmwareStatus>('firmware_update'),
  firmwareCancel: () => invoke<boolean>('firmware_cancel')
};
