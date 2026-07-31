export type PageId =
  | 'dashboard'
  | 'leds'
  | 'schedules'
  | 'firmware'
  | 'logs'
  | 'settings';

export interface RuntimeCapabilities {
  platform: string;
  mobile: boolean;
  otaSupported: boolean;
}

export interface ConnectionConfig {
  /** Távoli/DDNS HTTP elérés. */
  arduinoIp: string;
  arduinoPort: number;
  /** Elsődleges, közvetlen LAN elérés. */
  localArduinoIp: string;
  localArduinoPort: number;
  preferLocal: boolean;
  /** OTA-cél. Desktopon lehetőleg a helyi Arduino-cím legyen. */
  otaAddress: string;
  otaPort: number;
  /** auto | native | terminal */
  otaUploadMode: string;
  otaToolPath: string;
  /** A secrets.h API_PRIVATE_PATH értékével egyező privát előtag. */
  arduinoApiPath: string;
  /** A secrets.h API_SHARED_SECRET értékével egyező X-Device-Key. */
  arduinoApiKey: string;
}

export interface LedStrip {
  id: number;
  enabled: boolean;
  brightness: number;
  effect: number;
  speed: number;
  color: [number, number, number];
}

export interface ArduinoHttpStatus {
  lastClientIp?: string;
  lastPath?: string;
  requests?: number;
  timeouts?: number;
}

export interface ArduinoStatus {
  connected: boolean;
  firmwareVersion?: string;
  ipAddress?: string;
  hostname?: string;
  localHostname?: string;
  otaPort?: number;
  otaEnabled?: boolean;
  rssi?: number;
  uptime?: number;
  freeMemory?: number;
  currentTime?: string;
  strips?: LedStrip[];
  http?: ArduinoHttpStatus;
  scheduleCount?: number;
}

export interface ArduinoLog {
  id: number;
  timestamp: string;
  type: string;
  message: string;
}

export interface ArduinoConsoleResponse {
  lastId: number;
  logs: ArduinoLog[];
}

export interface NetworkLog {
  timestamp: number;
  endpoint: string;
  ok: boolean;
  message: string;
}

export interface ScheduleLed {
  id: number;
  enabled: boolean;
  brightness: number;
  effect: number;
  speed: number;
  color: [number, number, number];
}

export interface LedSchedule {
  id: string;
  day: number;
  time: string;
  leds: ScheduleLed[];
}

export interface FirmwareArtifact {
  name: string;
  downloadUrl: string;
  checksumUrl: string;
  firmwareVersion?: string;
  tag: string;
  createdAt?: string;
}

export interface FirmwareStatus {
  state: string;
  message: string;
  installedVersion?: string;
  arduinoOnline: boolean;
  otaToolInstalled: boolean;
  otaPasswordConfigured: boolean;
  availableFirmware?: FirmwareArtifact;
  firmwareLookupError?: string;
  otaToolPath?: string;
  otaToolError?: string;
  otaTargetAddress?: string;
  otaTargetPort?: number;
  updateAvailable: boolean;
  progress?: number;
  phase?: string;
}

export interface OtaProgressEvent {
  timestamp: number;
  stage: string;
  level:
    | 'info'
    | 'success'
    | 'error'
    | 'output';
  message: string;
  progress?: number;
}
