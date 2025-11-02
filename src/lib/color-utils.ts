import { converter, formatHex, interpolate, parse } from 'culori';
import type { PaletteMode } from '../types';

const toHsl = converter('hsl');
const toOklch = converter('oklch');
const toRgb = converter('rgb');

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const wrapHue = (hue: number) => ((hue % 360) + 360) % 360;

const id = () => Math.random().toString(36).slice(2, 10);

export const createColorId = id;

export const normalizeHex = (hex: string) => {
  const value = hex.trim().replace('#', '');
  if (value.length === 3) {
    return `#${value
      .split('')
      .map((ch) => ch.repeat(2))
      .join('')}`;
  }
  return `#${value.slice(0, 6)}`.toUpperCase();
};

export const isValidHex = (hex: string) => /^#?[0-9A-Fa-f]{6}$/.test(hex.trim());

export function randomPleasantHex(): string {
  const hue = Math.random() * 360;
  const saturation = 0.45 + Math.random() * 0.35;
  const lightness = 0.4 + Math.random() * 0.2;
  return formatHex({ mode: 'hsl', h: hue, s: saturation, l: lightness });
}

function ensureHsl(hex: string) {
  const hsl = toHsl(parse(hex));
  if (!hsl || typeof hsl.h !== 'number') {
    return toHsl(parse(randomPleasantHex()));
  }
  return hsl;
}

function buildPaletteFromHues(baseHex: string, hues: number[], adjustLightness = 0) {
  const base = ensureHsl(baseHex);
  return hues.map((offset, index) => {
    const h = wrapHue((base?.h ?? 0) + offset);
    const s = clamp((base?.s ?? 0.6) + (index - hues.length / 2) * 0.02, 0.25, 0.95);
    const l = clamp((base?.l ?? 0.55) + adjustLightness * (index - hues.length / 2), 0.25, 0.85);
    return formatHex({ mode: 'hsl', h, s, l });
  });
}

function lighten(hex: string, delta: number) {
  const hsl = ensureHsl(hex);
  return formatHex({
    mode: 'hsl',
    h: hsl?.h ?? 0,
    s: clamp((hsl?.s ?? 0.5) + delta * 0.1, 0.2, 0.9),
    l: clamp((hsl?.l ?? 0.5) + delta * 0.12, 0.15, 0.9)
  });
}

export function generatePaletteByMode(baseHex: string, mode: PaletteMode, length: number): string[] {
  const base = normalizeHex(baseHex);
  switch (mode) {
    case 'complementary': {
      const complement = buildPaletteFromHues(base, [0, 180], 0).slice(0, 2);
      const derived = [lighten(base, -1), base, lighten(base, 1), complement[1], lighten(complement[1], 1)];
      return derived.slice(0, length);
    }
    case 'analogous': {
      const hues = [-40, -20, 0, 20, 40, 60];
      return buildPaletteFromHues(base, hues.slice(0, length), 0.04);
    }
    case 'triadic': {
      const hues = [0, 120, 240, 120 + 20, 240 + 20];
      return buildPaletteFromHues(base, hues.slice(0, length), 0.05);
    }
    case 'tetradic': {
      const hues = [0, 90, 180, 270, 45];
      return buildPaletteFromHues(base, hues.slice(0, length), 0.03);
    }
    case 'split': {
      const hues = [0, 150, 210, 150 + 20, 210 + 20];
      return buildPaletteFromHues(base, hues.slice(0, length), 0.05);
    }
    case 'gradient': {
      return Array.from({ length }, () => base);
    }
    case 'random':
    default:
      return Array.from({ length }, () => randomPleasantHex());
  }
}

export function formatHslString(hex: string): string {
  const hsl = toHsl(parse(hex));
  if (!hsl || typeof hsl.h !== 'number') return '—';
  const { h, s, l } = hsl;
  return `${Math.round(h)}° ${Math.round((s ?? 0) * 100)}% ${Math.round((l ?? 0) * 100)}%`;
}

export function formatOklchString(hex: string): string {
  const oklch = toOklch(parse(hex));
  if (!oklch) return '—';
  const { l = 0, c = 0, h = 0 } = oklch;
  return `${(l * 100).toFixed(1)} ${c.toFixed(3)} ${Math.round(h ?? 0)}°`;
}

export function getReadableTextColor(hex: string): string {
  const rgb = toRgb(parse(hex));
  if (!rgb) return '#0f172a';
  const { r = 0, g = 0, b = 0 } = rgb;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#0f172a' : '#f8fafc';
}

export function generateGradientPalette(startHex: string, endHex: string, steps: number): string[] {
  const start = parse(startHex);
  const end = parse(endHex);
  if (!start || !end) {
    return Array.from({ length: steps }, () => randomPleasantHex());
  }
  const blend = interpolate([startHex, endHex], { mode: 'oklch' });
  const max = Math.max(steps - 1, 1);
  return Array.from({ length: steps }, (_, index) => formatHex(blend(index / max)));
}
