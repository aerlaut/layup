import type { C4NodeType } from '../types';

/** Default primary colors per node type */
export const NODE_DEFAULT_COLORS: Record<C4NodeType, string> = {
  person: '#3b82f6',
  system: '#22c55e',
  container: '#f59e0b',
  component: '#a855f7',
  'code-element': '#6b7280',
};

/** Default edge color */
export const EDGE_DEFAULT_COLOR = '#6b7280';

/** Curated pastel palette for quick color selection */
export const PASTEL_PALETTE: { color: string; label: string }[] = [
  { color: '#f87171', label: 'Red' },
  { color: '#fb923c', label: 'Orange' },
  { color: '#fbbf24', label: 'Amber' },
  { color: '#a3e635', label: 'Lime' },
  { color: '#34d399', label: 'Emerald' },
  { color: '#22d3ee', label: 'Cyan' },
  { color: '#60a5fa', label: 'Blue' },
  { color: '#818cf8', label: 'Indigo' },
  { color: '#a78bfa', label: 'Violet' },
  { color: '#c084fc', label: 'Purple' },
  { color: '#e879f9', label: 'Fuchsia' },
  { color: '#fb7185', label: 'Rose' },
  { color: '#9ca3af', label: 'Gray' },
  { color: '#6b7280', label: 'Dark Gray' },
];

/**
 * Parse a hex color string (#RGB or #RRGGBB) into { r, g, b } (0-255).
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/**
 * Convert RGB (0-255) to HSL (h: 0-360, s: 0-100, l: 0-100).
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export interface ColorVariants {
  /** The primary color (used for borders, icons) */
  primary: string;
  /** Light background tint */
  bg: string;
  /** Dark text color */
  text: string;
  /** Muted/secondary text color */
  muted: string;
  /** Badge/chip background */
  badge: string;
}

/**
 * Derive a full set of color variants from a single hex color.
 * - primary: the color itself
 * - bg: very light tint (lightness 96%)
 * - text: very dark shade (lightness 15%)
 * - muted: the color at moderate lightness (lightness 40%)
 * - badge: light background for chips (lightness 85%)
 */
export function getColorVariants(hex: string): ColorVariants {
  const { r, g, b } = hexToRgb(hex);
  const { h, s } = rgbToHsl(r, g, b);
  return {
    primary: hex,
    bg: `hsl(${h}, ${Math.min(s, 80)}%, 96%)`,
    text: `hsl(${h}, ${Math.min(s, 70)}%, 15%)`,
    muted: `hsl(${h}, ${Math.min(s, 80)}%, 40%)`,
    badge: `hsl(${h}, ${Math.min(s, 80)}%, 85%)`,
  };
}
