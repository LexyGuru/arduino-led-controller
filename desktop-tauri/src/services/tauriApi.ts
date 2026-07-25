import { invoke } from '@tauri-apps/api/core';
import type { ArduinoLog, ArduinoStatus, ConnectionConfig, FirmwareStatus, LedSchedule, LedStrip, NetworkLog } from '../types';

export const tauriApi = {
  loadConfig: () => invoke<ConnectionConfig>('load_config'),
  saveConfig: (config: ConnectionConfig) => invoke<void>('save_config', { config }),
  saveOtaPassword: (password: string) => invoke<void>('save_ota_password', { password }),
  status: () => invoke<ArduinoStatus>('arduino_status'),
  logs: () => invoke<ArduinoLog[]>('arduino_logs'),
  networkLogs: () => invoke<NetworkLog[]>('network_logs'),
  setLed: (strip: LedStrip) => invoke('set_led', { id: strip.id, enabled: strip.enabled, brightness: strip.brightness, effect: strip.effect, speed: strip.speed, color: strip.color }),
  loadSchedules: () => invoke<LedSchedule[]>('load_schedules'),
  importSchedulesFile: (path: string) => invoke<LedSchedule[]>('import_schedules_file', { path }),
  exportSchedulesFile: (path: string, schedules: LedSchedule[]) => invoke<void>('export_schedules_file', { path, schedules }),
  loadSchedulesFromArduino: () => invoke<LedSchedule[]>('load_schedules_from_arduino'),
  saveSchedules: (schedules: LedSchedule[]) => invoke<{ success: boolean; count: number; verifiedCount: number }>('save_and_sync_schedules', { schedules }),
  firmwareStatus: () => invoke<FirmwareStatus>('firmware_status'),
  firmwareUpdate: () => invoke<FirmwareStatus>('firmware_update')
};
