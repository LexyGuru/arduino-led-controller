import type { LedSchedule } from '../types';

export interface V5ScheduleRunnerStatus {
  mode: string;
  running: boolean;
  intervalMs: number;
  lastTickAt: string | null;
  lastRunAt: string | null;
  lastError: unknown;
}

export function normalizeSchedule(value: unknown, index?: number): LedSchedule;
export function normalizeScheduleList(value: unknown): LedSchedule[];
export function scheduleFingerprint(schedules: unknown): string;
export function normalizeRunnerStatus(value: unknown): V5ScheduleRunnerStatus;
export function isScheduleEvent(event: unknown): boolean;
