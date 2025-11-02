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
  // Extract hue and saturation from base, but use a well-distributed lightness range
  const baseHue = base?.h ?? 0;
  const baseSaturation = clamp(base?.s ?? 0.6, 0.4, 0.9);
  
  // Use a dynamic lightness range centered around the base but ensure good spread
  const baseLightness = clamp(base?.l ?? 0.5, 0.25, 0.75);
  // Create a lightness range that spans from lighter to darker
  const lightnessRange = 0.4; // Total range of lightness variation
  const minLightness = Math.max(0.25, baseLightness - lightnessRange / 2);
  const maxLightness = Math.min(0.85, baseLightness + lightnessRange / 2);
  
  return hues.map((offset, index) => {
    const h = wrapHue(baseHue + offset);
    // Vary saturation slightly across the palette for visual interest
    const s = clamp(baseSaturation + (index - hues.length / 2) * 0.05, 0.35, 0.95);
    
    // Distribute lightness across the range for this palette
    // Create a smooth distribution from min to max
    const lightnessPosition = hues.length > 1 ? index / (hues.length - 1) : 0.5;
    
    // Apply adjustLightness parameter on top of the base distribution
    let l;
    if (adjustLightness !== 0) {
      // When adjustLightness is specified, use it to create variation
      const baseDistributedL = minLightness + (maxLightness - minLightness) * lightnessPosition;
      const variation = adjustLightness * (index - hues.length / 2);
      l = clamp(baseDistributedL + variation, 0.25, 0.85);
    } else {
      // Even distribution across the lightness range
      l = minLightness + (maxLightness - minLightness) * lightnessPosition;
    }
    
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
      // Generate complementary palette: base color + its complement with variations
      // Create a palette that alternates between base hue and complement hue with good distribution
      const baseHsl = ensureHsl(base);
      const baseHue = baseHsl?.h ?? 0;
      
      // Build hues array alternating between base (0°) and complement (180°)
      const hues: number[] = [];
      for (let i = 0; i < length; i++) {
        // Alternate: even indices = base hue, odd indices = complement hue
        hues.push(i % 2 === 0 ? 0 : 180);
      }
      
      // Use buildPaletteFromHues which will create proper lightness distribution
      return buildPaletteFromHues(base, hues, 0.06);
    }
    case 'analogous': {
      // Generate analogous colors: neighboring hues with continuous variations
      // Support unlimited colors by continuing the sequence
      const baseStep = 20; // Step size for analogous hues
      const hues: number[] = [];
      const startOffset = -40; // Start from -40° (left of base)
      for (let i = 0; i < length; i++) {
        hues.push(startOffset + i * baseStep);
      }
      return buildPaletteFromHues(base, hues, 0.04);
    }
    case 'triadic': {
      // Generate triadic colors: base + two 120° shifts, with variations
      // Support up to 12 colors by adding lightness variations
      const baseHues = [0, 120, 240];
      const variations = [0, 20, -20, 40, -40];
      const hues: number[] = [];
      for (let i = 0; i < length; i++) {
        const baseIndex = i % 3;
        const variationIndex = Math.floor(i / 3);
        const hue = baseHues[baseIndex] + (variations[variationIndex] || 0);
        hues.push(hue);
      }
      return buildPaletteFromHues(base, hues, 0.05);
    }
    case 'tetradic': {
      // Generate tetradic colors: four corners (0°, 90°, 180°, 270°) with variations
      // Support unlimited colors by cycling through corners with variations
      const baseHues = [0, 90, 180, 270];
      const variations = [0, 15, -15, 30, -30, 45];
      const hues: number[] = [];
      for (let i = 0; i < length; i++) {
        const baseIndex = i % 4;
        const variationIndex = Math.floor(i / 4);
        const hue = baseHues[baseIndex] + (variations[variationIndex] || 0);
        hues.push(hue);
      }
      return buildPaletteFromHues(base, hues, 0.03);
    }
    case 'split': {
      // Generate split-complementary colors: base + two splits (150° and 210° from complement)
      // Support unlimited colors by adding variations
      const baseHues = [0, 150, 210]; // Base color, split-complement 1, split-complement 2
      const variations = [0, 20, -20, 40, -40, 10, -10];
      const hues: number[] = [];
      for (let i = 0; i < length; i++) {
        const baseIndex = i % 3;
        const variationIndex = Math.floor(i / 3);
        const hue = baseHues[baseIndex] + (variations[variationIndex] || 0);
        hues.push(hue);
      }
      return buildPaletteFromHues(base, hues, 0.05);
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
