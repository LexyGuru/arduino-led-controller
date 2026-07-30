import type { FirmwareStatus, OtaProgressEvent } from '../types';

export interface FirmwareBackupView {
  id: string;
  fileName: string;
  size: number;
  sha256: string;
  createdAt: string | null;
  installedAt: string | null;
  installedVersion: string | null;
  lastKnownGood: boolean;
  source: unknown;
  artifact: any;
}

export function normalizeFirmwareBackup(value: unknown): FirmwareBackupView;
export function normalizeFirmwareBackups(value: unknown): FirmwareBackupView[];
export function normalizeFirmwareStatus(
  value: unknown,
  fallback?: FirmwareStatus | null
): FirmwareStatus & {
  progress: number;
  phase: string;
  backups: FirmwareBackupView[];
  networkConfigStored: boolean;
  otaConfigured: boolean;
  otaToolInstalled: boolean;
  otaPasswordConfigured: boolean;
  backupStoreConfigured: boolean;
  operation: unknown;
  startedAt: string | null;
  finishedAt: string | null;
};
export function firmwareEventToProgress(event: unknown): OtaProgressEvent;
export function isFirmwareBusy(status: unknown): boolean;
export function isFirmwareEvent(event: unknown): boolean;
