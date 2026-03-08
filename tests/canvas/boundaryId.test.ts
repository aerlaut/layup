import { describe, it, expect } from 'vitest';
import { toBoundaryId, fromBoundaryId, isBoundaryId } from '../../src/canvas/boundaryId';

describe('toBoundaryId', () => {
  it('prefixes the parent node ID with "boundary-"', () => {
    expect(toBoundaryId('sysA')).toBe('boundary-sysA');
  });

  it('works with arbitrary IDs', () => {
    expect(toBoundaryId('abc-123')).toBe('boundary-abc-123');
  });
});

describe('isBoundaryId', () => {
  it('returns true for a boundary-prefixed ID', () => {
    expect(isBoundaryId('boundary-sysA')).toBe(true);
  });

  it('returns false for a plain node ID', () => {
    expect(isBoundaryId('sysA')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isBoundaryId('')).toBe(false);
  });
});

describe('fromBoundaryId', () => {
  it('strips the "boundary-" prefix', () => {
    expect(fromBoundaryId('boundary-sysA')).toBe('sysA');
  });

  it('handles IDs with hyphens after the prefix', () => {
    expect(fromBoundaryId('boundary-abc-123')).toBe('abc-123');
  });

  it('throws when the ID is not a boundary ID', () => {
    expect(() => fromBoundaryId('sysA')).toThrow('Not a boundary ID: "sysA"');
  });

  it('is the inverse of toBoundaryId', () => {
    const original = 'my-node-42';
    expect(fromBoundaryId(toBoundaryId(original))).toBe(original);
  });
});
