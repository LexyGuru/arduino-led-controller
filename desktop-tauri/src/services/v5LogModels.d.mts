import type { ArduinoLog } from '../types';

export interface AuditEntryView {
  id: string;
  timestamp: string | null;
  action: string;
  subject: string;
  role: unknown;
  method: unknown;
  path: unknown;
  details: unknown;
}

export interface EventView {
  id: string;
  topic: string;
  timestamp: string | null;
  payload: unknown;
  meta: unknown;
}

export function normalizeConsoleLogs(value: unknown): ArduinoLog[];
export function normalizeAuditEntries(value: unknown): AuditEntryView[];
export function normalizeEvents(value: unknown): EventView[];
export function mergeEvents(
  current: EventView[],
  incoming: EventView[],
  maximum?: number
): EventView[];
export function formatLogPayload(value: unknown): string;
