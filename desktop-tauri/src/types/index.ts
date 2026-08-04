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
  profileName: string;
  language: 'hu' | 'en' | 'de';
  protocol: 'http' | 'https';
  localProtocol: 'http' | 'https';
  arduinoIp: string;
  arduinoPort: number;
  localArduinoIp: string;
  localArduinoPort: number;
  preferLocal: boolean;
  macosLocalApiEnabled: boolean;
  otaUseApiHost: boolean;
  otaAddress: string;
  otaPort: number;
  otaUploadMode: 'auto' | 'system' | 'bundled' | 'custom';
  otaToolPath: string;
  otaTimeoutSeconds: number;
  arduinoApiPath: string;
  arduinoApiKey: string;
  arduinoApiKeyConfigured: boolean;
  updateChannel: 'stable' | 'beta';
  firmwareUpdateChannel: 'stable' | 'beta';
  autoCheckUpdates: boolean;
  autoDownloadUpdates: boolean;
  firmwareUpdateChecks: boolean;
  timezoneId: string;
  timezoneAuto: boolean;
  currentUtcOffsetMinutes: number;
  nextTransitionEpoch: number;
  nextUtcOffsetMinutes: number;
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
  timesynced?: boolean;
  clockEpoch?: number;
  clockLocalAvailable?: boolean;
  timezoneId?: string;
  utcOffsetMinutes?: number;
  nextTransitionEpoch?: number;
  nextUtcOffsetMinutes?: number;
  ntpServer?: string;
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

export interface ScheduleSyncSnapshot {
  schedules: LedSchedule[];
  count: number;
  revision: number;
  checksum: string;
  emptyActionCount: number;
  recoveredLegacyActionCount: number;
}

export interface ScheduleSaveResult extends ScheduleSyncSnapshot {
  success: boolean;
  verifiedCount: number;
  revisionBefore: number;
  revisionAfter: number;
  checksumBefore: string;
  checksumAfter: string;
}

export interface ScheduleSyncState {
  status:
    | 'local-cache'
    | 'syncing'
    | 'verified'
    | 'error';
  count: number;
  revision: number | null;
  checksum: string;
  emptyActionCount: number;
  recoveredLegacyActionCount: number;
  lastError: string | null;
}


export interface ScheduleBackup {
  id: string;
  createdAt: number;
  count: number;
  revision?: number;
  checksum: string;
  schedules: LedSchedule[];
}

export interface FirmwareArtifact {
  name: string;
  downloadUrl: string;
  checksumUrl: string;
  firmwareVersion?: string;
  tag: string;
  createdAt?: string;
  summary?: string;
  channel?: 'stable' | 'beta' | string;
  relatedTags?: string[];
  expectedFirmwareVersion?: string;
  metadataConflict?: string;
}


export interface AppUpdateArtifact {
  version: string;
  tag: string;
  releaseUrl?: string;
  assetName?: string;
  downloadUrl?: string;
  createdAt?: string;
  channel: 'stable' | 'beta' | string;
}

export interface FirmwareStatus {
  state: string;
  message: string;
  installedVersion?: string;
  arduinoOnline: boolean;
  otaToolInstalled: boolean;
  otaPasswordConfigured: boolean;
  otaConfigured: boolean;
  otaMissingRequirements?: string[];
  backupStoreConfigured: boolean;
  availableFirmware?: FirmwareArtifact;
  firmwareLookupError?: string;
  otaToolPath?: string;
  otaToolError?: string;
  otaTargetAddress?: string;
  otaTargetPort?: number;
  updateAvailable: boolean;
  progress?: number;
  phase?: string;
  updateChannel?: string;
  firmwareUpdateChannel?: string;
  appCurrentVersion?: string;
  availableApp?: AppUpdateArtifact;
  appUpdateAvailable?: boolean;
  compatibilityStatus?: string;
  cachePath?: string;
  cacheSha256?: string;
  bootIdBefore?: string;
  bootIdAfter?: string;
  scheduleRevisionBefore?: number;
  scheduleRevisionAfter?: number;
  scheduleChecksumBefore?: string;
  scheduleChecksumAfter?: string;
  cancelled?: boolean;
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
