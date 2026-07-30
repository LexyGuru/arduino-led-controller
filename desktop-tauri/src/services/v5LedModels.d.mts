import type {
  LedStrip
} from '../types';

export function normalizeLedStrip(
  value: unknown,
  fallback?: LedStrip | null,
  index?: number
): LedStrip;

export function normalizeLedList(
  value: unknown,
  fallback?: LedStrip[]
): LedStrip[];

export function ledCommand(
  strip: LedStrip
): {
  enabled: boolean;
  brightness: number;
  effect: number;
  speed: number;
  color:
    [
      number,
      number,
      number
    ];
};

export function presetCommands(
  strips: LedStrip[],
  preset:
    | 'night'
    | 'rainbow'
    | 'breathe'
): LedStrip[];

export function shouldUseDirectFallback(
  options?: {
    authenticated?: boolean;
    online?: boolean;
  }
): boolean;
