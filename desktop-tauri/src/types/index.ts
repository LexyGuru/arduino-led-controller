export type PageId = 'dashboard' | 'leds' | 'schedules' | 'firmware' | 'logs' | 'settings';

export interface ConnectionConfig {
  arduinoIp: string;
  arduinoPort: number;
  arduinoApiPath: string;
  arduinoApiKey: string;
}

export interface LedStrip { id: number; enabled: boolean; brightness: number; effect: number; speed: number; color: [number, number, number]; }
export interface ArduinoHttpStatus { lastClientIp?: string; lastPath?: string; requests?: number; timeouts?: number; }
export interface ArduinoStatus { connected: boolean; firmwareVersion?: string; ipAddress?: string; hostname?: string; localHostname?: string; otaPort?: number; otaEnabled?: boolean; rssi?: number; uptime?: number; freeMemory?: number; currentTime?: string; strips?: LedStrip[]; http?: ArduinoHttpStatus; scheduleCount?: number; }
export interface ArduinoLog { id: number; timestamp: string; type: string; message: string; }
export interface ArduinoConsoleResponse { lastId: number; logs: ArduinoLog[]; }
export interface NetworkLog { timestamp: number; endpoint: string; ok: boolean; message: string; }
export interface ScheduleLed { id: number; enabled: boolean; brightness: number; effect: number; speed: number; color: [number, number, number]; }
export interface LedSchedule { id: string; day: number; time: string; leds: ScheduleLed[]; }
export interface FirmwareArtifact { name: string; downloadUrl: string; checksumUrl: string; firmwareVersion?: string; tag: string; createdAt?: string; }
export interface FirmwareStatus { state: string; message: string; installedVersion?: string; arduinoOnline: boolean; otaToolInstalled: boolean; otaPasswordConfigured: boolean; availableFirmware?: FirmwareArtifact; firmwareLookupError?: string; otaToolPath?: string; otaToolError?: string; otaTargetAddress?: string; otaTargetPort?: number; updateAvailable: boolean; }
