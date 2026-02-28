import {
  NODE_DEFAULT_COLORS,
  EDGE_DEFAULT_COLOR,
  PASTEL_PALETTE,
  getColorVariants,
  type ColorVariants,
} from './colors';
import type { C4NodeType } from '../types';

// ─── NODE_DEFAULT_COLORS ─────────────────────────────────────────────────────

describe('NODE_DEFAULT_COLORS', () => {
  const allNodeTypes: C4NodeType[] = ['person', 'system', 'container', 'component', 'code-element'];

  it('has an entry for every C4 node type', () => {
    for (const type of allNodeTypes) {
      expect(NODE_DEFAULT_COLORS[type]).toBeDefined();
    }
  });

  it('all values are valid hex color strings', () => {
    for (const type of allNodeTypes) {
      expect(NODE_DEFAULT_COLORS[type]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('EDGE_DEFAULT_COLOR', () => {
  it('is a valid hex color', () => {
    expect(EDGE_DEFAULT_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

// ─── PASTEL_PALETTE ───────────────────────────────────────────────────────────

describe('PASTEL_PALETTE', () => {
  it('is non-empty', () => {
    expect(PASTEL_PALETTE.length).toBeGreaterThan(0);
  });

  it('each entry has a valid hex color and non-empty label', () => {
    for (const entry of PASTEL_PALETTE) {
      expect(entry.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });
});

// ─── getColorVariants ─────────────────────────────────────────────────────────

describe('getColorVariants', () => {
  it('returns all 5 keys', () => {
    const v = getColorVariants('#3b82f6');
    expect(v).toHaveProperty('primary');
    expect(v).toHaveProperty('bg');
    expect(v).toHaveProperty('text');
    expect(v).toHaveProperty('muted');
    expect(v).toHaveProperty('badge');
  });

  it('primary equals the input hex', () => {
    const hex = '#3b82f6';
    expect(getColorVariants(hex).primary).toBe(hex);
  });

  it('bg uses high lightness (96%)', () => {
    const v = getColorVariants('#3b82f6');
    expect(v.bg).toMatch(/hsl\(.+,\s*.+%,\s*96%\)/);
  });

  it('text uses low lightness (15%)', () => {
    const v = getColorVariants('#3b82f6');
    expect(v.text).toMatch(/hsl\(.+,\s*.+%,\s*15%\)/);
  });

  it('muted uses moderate lightness (40%)', () => {
    const v = getColorVariants('#3b82f6');
    expect(v.muted).toMatch(/hsl\(.+,\s*.+%,\s*40%\)/);
  });

  it('badge uses lightness (85%)', () => {
    const v = getColorVariants('#3b82f6');
    expect(v.badge).toMatch(/hsl\(.+,\s*.+%,\s*85%\)/);
  });

  it('handles short hex (#fff) correctly', () => {
    const v = getColorVariants('#fff');
    expect(v.primary).toBe('#fff');
    // White has 0 saturation and 100% lightness, so all variants should be valid HSL
    expect(v.bg).toMatch(/^hsl\(/);
    expect(v.text).toMatch(/^hsl\(/);
  });

  it('handles pure gray (#808080) — zero saturation', () => {
    const v = getColorVariants('#808080');
    // Gray should have 0 saturation
    expect(v.bg).toMatch(/hsl\(\d+, 0%, 96%\)/);
    expect(v.text).toMatch(/hsl\(\d+, 0%, 15%\)/);
  });

  it('handles pure black (#000000)', () => {
    const v = getColorVariants('#000000');
    expect(v.primary).toBe('#000000');
    expect(v.bg).toMatch(/^hsl\(/);
  });

  it('handles pure white (#ffffff)', () => {
    const v = getColorVariants('#ffffff');
    expect(v.primary).toBe('#ffffff');
    expect(v.bg).toMatch(/^hsl\(/);
  });

  it('produces consistent results for all default node colors', () => {
    for (const [type, hex] of Object.entries(NODE_DEFAULT_COLORS)) {
      const v = getColorVariants(hex);
      expect(v.primary).toBe(hex);
      expect(v.bg).toMatch(/^hsl\(/);
      expect(v.text).toMatch(/^hsl\(/);
      expect(v.muted).toMatch(/^hsl\(/);
      expect(v.badge).toMatch(/^hsl\(/);
    }
  });
});
