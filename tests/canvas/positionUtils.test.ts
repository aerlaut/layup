import { describe, it, expect } from 'vitest';
import { toRelativePosition, toAbsolutePosition } from '../../src/canvas/positionUtils';

describe('toRelativePosition', () => {
  it('subtracts origin from absolute position', () => {
    expect(toRelativePosition({ x: 350, y: 200 }, { x: 100, y: 80 })).toEqual({ x: 250, y: 120 });
  });

  it('returns absolute position unchanged when origin is (0, 0)', () => {
    expect(toRelativePosition({ x: 50, y: 30 }, { x: 0, y: 0 })).toEqual({ x: 50, y: 30 });
  });

  it('produces negative coordinates when node is left/above boundary origin', () => {
    expect(toRelativePosition({ x: 10, y: 20 }, { x: 50, y: 50 })).toEqual({ x: -40, y: -30 });
  });
});

describe('toAbsolutePosition', () => {
  it('adds origin to relative position', () => {
    expect(toAbsolutePosition({ x: 250, y: 120 }, { x: 100, y: 80 })).toEqual({ x: 350, y: 200 });
  });

  it('returns relative position unchanged when origin is (0, 0)', () => {
    expect(toAbsolutePosition({ x: 50, y: 30 }, { x: 0, y: 0 })).toEqual({ x: 50, y: 30 });
  });
});

describe('position round-trip', () => {
  it('toRelativePosition is the inverse of toAbsolutePosition', () => {
    const absolute = { x: 350, y: 200 };
    const origin   = { x: 100, y: 80 };
    const relative  = toRelativePosition(absolute, origin);
    const roundtrip = toAbsolutePosition(relative, origin);
    expect(roundtrip).toEqual(absolute);
  });

  it('toAbsolutePosition is the inverse of toRelativePosition', () => {
    const relative = { x: 40, y: 15 };
    const origin   = { x: 200, y: 300 };
    const absolute  = toAbsolutePosition(relative, origin);
    const roundtrip = toRelativePosition(absolute, origin);
    expect(roundtrip).toEqual(relative);
  });
});
