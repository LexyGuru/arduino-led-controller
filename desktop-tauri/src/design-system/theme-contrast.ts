import type { ThemeTokenName } from './theme-types';

export interface ContrastValidation {
  valid: boolean;
  ratio: number | null;
  message: string;
}

function parseHex(input: string): [number, number, number] | null {
  const value = input.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(value);
  if (short) {
    return short[1].split('').map((part) => parseInt(part + part, 16)) as [number, number, number];
  }
  const full = /^#([0-9a-f]{6})$/i.exec(value);
  if (!full) return null;
  return [
    parseInt(full[1].slice(0, 2), 16),
    parseInt(full[1].slice(2, 4), 16),
    parseInt(full[1].slice(4, 6), 16)
  ];
}

function luminance(rgb: [number, number, number]): number {
  const channels = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return null;
  const a = luminance(fg);
  const b = luminance(bg);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateThemeContrast(
  tokens: Partial<Record<ThemeTokenName, string>>
): ContrastValidation {
  const text = tokens.text;
  const background = tokens.background;
  if (!text || !background) {
    return { valid: true, ratio: null, message: 'Base text/background pair is inherited.' };
  }
  const ratio = contrastRatio(text, background);
  if (ratio === null) {
    return { valid: true, ratio: null, message: 'Non-HEX color pair is accepted and validated by runtime preview.' };
  }
  const valid = ratio >= 4.5;
  return {
    valid,
    ratio,
    message: valid
      ? `Contrast ${ratio.toFixed(2)}:1`
      : `Contrast ${ratio.toFixed(2)}:1 is below the 4.5:1 text target.`
  };
}
