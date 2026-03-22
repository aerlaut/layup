import { describe, it, expect } from 'vitest';
import {
  computeNodeHeight,
  computeBoundingBox,
  resolveNodeOverlaps,
  bboxOverlap,
  childTypeIsValid,
  resolveBoundaryOverlaps,
  collectDescendants,
} from '../../src/stores/diagramLayout';
import type { C4Node, DiagramState, C4LevelType } from '../../src/types';
import {
  NODE_DEFAULT_WIDTH,
  NODE_DEFAULT_HEIGHT,
  BOUNDARY_PADDING,
  BOUNDARY_MIN_WIDTH,
  BOUNDARY_MIN_HEIGHT,
} from '../../src/utils/constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<C4Node> = {}): C4Node {
  return {
    id: `node-${Math.random().toString(36).slice(2, 8)}`,
    type: 'system',
    label: 'Test',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function makeState(overrides: Partial<DiagramState> = {}): DiagramState {
  return {
    version: 1,
    levels: {
      context:   { level: 'context',   nodes: [], edges: [], annotations: [] },
      container: { level: 'container', nodes: [], edges: [], annotations: [] },
      component: { level: 'component', nodes: [], edges: [], annotations: [] },
      code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
    },
    currentLevel: 'context',
    selectedId: null,
    pendingNodeType: null,
    ...overrides,
  };
}

// ─── computeBoundingBox ───────────────────────────────────────────────────────

describe('computeBoundingBox', () => {
  it('returns a box at the fallback position when no child nodes', () => {
    const box = computeBoundingBox([], { x: 100, y: 200 });
    expect(box.x).toBe(100);
    expect(box.y).toBe(200);
    expect(box.width).toBe(BOUNDARY_MIN_WIDTH);
    expect(box.height).toBe(BOUNDARY_MIN_HEIGHT);
  });

  it('empty group: fallback position is used directly as box origin (no PADDING offset)', () => {
    // Regression: previously computeBoundingBox subtracted BOUNDARY_PADDING from the fallback,
    // causing a 40px top-left snap each time an empty group was dragged.
    // The fallback (boundaryPosition) must now equal bbox.x/y so drag writes and reads are consistent.
    const pos = { x: 300, y: 400 };
    const box = computeBoundingBox([], pos);
    expect(box.x).toBe(pos.x);
    expect(box.y).toBe(pos.y);
  });

  it('computes bounding box from node positions', () => {
    const nodes = [
      makeNode({ id: 'a', position: { x: 100, y: 100 } }),
      makeNode({ id: 'b', position: { x: 300, y: 200 } }),
    ];
    const box = computeBoundingBox(nodes, { x: 0, y: 0 });
    expect(box.x).toBe(100 - BOUNDARY_PADDING);
    expect(box.y).toBe(100 - BOUNDARY_PADDING);
    expect(box.width).toBeGreaterThanOrEqual(NODE_DEFAULT_WIDTH + (300 - 100) + BOUNDARY_PADDING * 2);
    expect(box.height).toBeGreaterThanOrEqual(NODE_DEFAULT_HEIGHT + (200 - 100) + BOUNDARY_PADDING * 2);
  });

  it('enforces minimum width and height with a single node', () => {
    const nodes = [makeNode({ id: 'a', position: { x: 50, y: 50 } })];
    const box = computeBoundingBox(nodes, { x: 0, y: 0 });
    expect(box.width).toBeGreaterThanOrEqual(BOUNDARY_MIN_WIDTH);
    expect(box.height).toBeGreaterThanOrEqual(BOUNDARY_MIN_HEIGHT);
  });

  it('respects minSize when larger than auto-computed (empty boundary)', () => {
    const box = computeBoundingBox([], { x: 100, y: 200 }, { width: 500, height: 400 });
    expect(box.width).toBe(500);
    expect(box.height).toBe(400);
  });

  it('respects minSize when larger than auto-computed (with children)', () => {
    const nodes = [makeNode({ id: 'a', position: { x: 50, y: 50 } })];
    const box = computeBoundingBox(nodes, { x: 0, y: 0 }, { width: 600, height: 500 });
    expect(box.width).toBe(600);
    expect(box.height).toBe(500);
  });

  it('ignores minSize when smaller than auto-computed', () => {
    const nodes = [
      makeNode({ id: 'a', position: { x: 0, y: 0 } }),
      makeNode({ id: 'b', position: { x: 400, y: 300 } }),
    ];
    const autoBox = computeBoundingBox(nodes, { x: 0, y: 0 });
    const box = computeBoundingBox(nodes, { x: 0, y: 0 }, { width: 10, height: 10 });
    expect(box.width).toBe(autoBox.width);
    expect(box.height).toBe(autoBox.height);
  });

  it('ignores minSize when smaller than BOUNDARY_MIN_WIDTH/HEIGHT constants', () => {
    const box = computeBoundingBox([], { x: 0, y: 0 }, { width: 10, height: 10 });
    expect(box.width).toBe(BOUNDARY_MIN_WIDTH);
    expect(box.height).toBe(BOUNDARY_MIN_HEIGHT);
  });
});

// ─── resolveNodeOverlaps ──────────────────────────────────────────────────────

describe('resolveNodeOverlaps', () => {
  it('leaves non-overlapping nodes unchanged', () => {
    const nodes = [
      makeNode({ id: 'a', position: { x: 0, y: 0 } }),
      makeNode({ id: 'b', position: { x: 500, y: 500 } }),
    ];
    const result = resolveNodeOverlaps('b', nodes);
    expect(result.find((n) => n.id === 'a')!.position).toEqual({ x: 0, y: 0 });
    expect(result.find((n) => n.id === 'b')!.position).toEqual({ x: 500, y: 500 });
  });

  it('pushes the fixed node away when the moved node overlaps it', () => {
    const nodes = [
      makeNode({ id: 'a', position: { x: 0, y: 0 } }),
      makeNode({ id: 'b', position: { x: 0, y: 0 } }), // fully overlapping
    ];
    const result = resolveNodeOverlaps('b', nodes);
    const a = result.find((n) => n.id === 'a')!;
    const b = result.find((n) => n.id === 'b')!;
    // b is the moved node so it stays; a should be pushed
    expect(b.position).toEqual({ x: 0, y: 0 });
    const dist = Math.abs(a.position.x - b.position.x) + Math.abs(a.position.y - b.position.y);
    expect(dist).toBeGreaterThan(0);
  });

  it('resolves overlaps across multiple nodes', () => {
    const nodes = [
      makeNode({ id: 'a', position: { x: 0, y: 0 } }),
      makeNode({ id: 'b', position: { x: 10, y: 0 } }),
      makeNode({ id: 'c', position: { x: 20, y: 0 } }),
    ];
    const result = resolveNodeOverlaps('a', nodes);
    // No two nodes should overlap after resolution
    for (let i = 0; i < result.length - 1; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const ni = result[i]!;
        const nj = result[j]!;
        const horizontalOverlap =
          ni.position.x < nj.position.x + NODE_DEFAULT_WIDTH &&
          ni.position.x + NODE_DEFAULT_WIDTH > nj.position.x;
        const verticalOverlap =
          ni.position.y < nj.position.y + NODE_DEFAULT_HEIGHT &&
          ni.position.y + NODE_DEFAULT_HEIGHT > nj.position.y;
        expect(horizontalOverlap && verticalOverlap).toBe(false);
      }
    }
  });
});

// ─── bboxOverlap ─────────────────────────────────────────────────────────────

describe('bboxOverlap', () => {
  it('returns true for overlapping boxes', () => {
    expect(bboxOverlap(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 50, y: 50, width: 100, height: 100 }
    )).toBe(true);
  });

  it('returns false for non-overlapping boxes (side by side)', () => {
    expect(bboxOverlap(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 100, y: 0, width: 100, height: 100 }
    )).toBe(false);
  });

  it('returns false for non-overlapping boxes (above/below)', () => {
    expect(bboxOverlap(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 0, y: 100, width: 100, height: 100 }
    )).toBe(false);
  });

  it('returns true when one box is fully inside another', () => {
    expect(bboxOverlap(
      { x: 0, y: 0, width: 200, height: 200 },
      { x: 50, y: 50, width: 50, height: 50 }
    )).toBe(true);
  });
});

// ─── childTypeIsValid ─────────────────────────────────────────────────────────

describe('childTypeIsValid', () => {
  it('system can have children at container level', () => {
    expect(childTypeIsValid('system', 'container')).toBe(true);
  });

  it('external-system can have children at container level', () => {
    expect(childTypeIsValid('external-system', 'container')).toBe(true);
  });

  it('container can have children at component level', () => {
    expect(childTypeIsValid('container', 'component')).toBe(true);
  });

  it('database can have children at component level', () => {
    expect(childTypeIsValid('database', 'component')).toBe(true);
  });

  it('component can have children at code level', () => {
    expect(childTypeIsValid('component', 'code')).toBe(true);
  });

  it('db-schema can have children at code level', () => {
    expect(childTypeIsValid('db-schema', 'code')).toBe(true);
  });

  it('person cannot have children at any level', () => {
    expect(childTypeIsValid('person', 'container')).toBe(false);
    expect(childTypeIsValid('person', 'component')).toBe(false);
    expect(childTypeIsValid('person', 'code')).toBe(false);
  });

  it('system cannot have children at component level', () => {
    expect(childTypeIsValid('system', 'component')).toBe(false);
  });

  it('class node cannot have children at any level', () => {
    expect(childTypeIsValid('class', 'container')).toBe(false);
    expect(childTypeIsValid('class', 'component')).toBe(false);
    expect(childTypeIsValid('class', 'code')).toBe(false);
  });
});

// ─── collectDescendants ───────────────────────────────────────────────────────

describe('collectDescendants', () => {
  it('returns just the root node when it has no children', () => {
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [makeNode({ id: 'sys1', type: 'system' })], edges: [], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const result = collectDescendants(state, 'sys1', 'context');
    expect(result.size).toBe(1);
    expect(result.get('context')!.has('sys1')).toBe(true);
  });

  it('collects direct children at the next level', () => {
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [makeNode({ id: 'sys1', type: 'system' })], edges: [], annotations: [] },
        container: { level: 'container', nodes: [
          makeNode({ id: 'cont1', parentNodeId: 'sys1' }),
          makeNode({ id: 'cont2', parentNodeId: 'sys1' }),
        ], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const result = collectDescendants(state, 'sys1', 'context');
    expect(result.get('context')!.has('sys1')).toBe(true);
    expect(result.get('container')!.has('cont1')).toBe(true);
    expect(result.get('container')!.has('cont2')).toBe(true);
  });

  it('collects descendants across multiple levels', () => {
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [makeNode({ id: 'sys1', type: 'system' })], edges: [], annotations: [] },
        container: { level: 'container', nodes: [makeNode({ id: 'cont1', parentNodeId: 'sys1' })], edges: [], annotations: [] },
        component: { level: 'component', nodes: [makeNode({ id: 'comp1', parentNodeId: 'cont1' })], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const result = collectDescendants(state, 'sys1', 'context');
    expect(result.get('context')!.has('sys1')).toBe(true);
    expect(result.get('container')!.has('cont1')).toBe(true);
    expect(result.get('component')!.has('comp1')).toBe(true);
    expect(result.has('code')).toBe(false);
  });

  it('does not collect children of other parents', () => {
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [
          makeNode({ id: 'sys1', type: 'system' }),
          makeNode({ id: 'sys2', type: 'system' }),
        ], edges: [], annotations: [] },
        container: { level: 'container', nodes: [
          makeNode({ id: 'cont1', parentNodeId: 'sys1' }),
          makeNode({ id: 'cont2', parentNodeId: 'sys2' }),
        ], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const result = collectDescendants(state, 'sys1', 'context');
    expect(result.get('container')!.has('cont1')).toBe(true);
    expect(result.get('container')!.has('cont2')).toBe(false);
  });
});

// ─── resolveBoundaryOverlaps ──────────────────────────────────────────────────

describe('resolveBoundaryOverlaps', () => {
  it('returns state unchanged at context level (no boundaries)', () => {
    const state = makeState({ currentLevel: 'context' });
    const result = resolveBoundaryOverlaps(state);
    expect(result).toBe(state);
  });

  it('returns state unchanged when fewer than 2 boundary groups', () => {
    const state = makeState({
      currentLevel: 'container',
      levels: {
        context:   { level: 'context',   nodes: [makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } })], edges: [], annotations: [] },
        container: { level: 'container', nodes: [makeNode({ id: 'c1', parentNodeId: 'sys1', position: { x: 0, y: 0 } })], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const result = resolveBoundaryOverlaps(state);
    expect(result).toBe(state);
  });

  it('separates overlapping boundary groups', () => {
    const state = makeState({
      currentLevel: 'container',
      levels: {
        context: { level: 'context', nodes: [
          makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }),
          makeNode({ id: 'sys2', type: 'system', position: { x: 50, y: 0 } }),
        ], edges: [], annotations: [] },
        container: { level: 'container', nodes: [
          makeNode({ id: 'c1', parentNodeId: 'sys1', position: { x: 0, y: 0 } }),
          makeNode({ id: 'c2', parentNodeId: 'sys2', position: { x: 0, y: 0 } }), // same position → groups overlap
        ], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const result = resolveBoundaryOverlaps(state);
    const c1 = result.levels['container'].nodes.find((n) => n.id === 'c1')!;
    const c2 = result.levels['container'].nodes.find((n) => n.id === 'c2')!;
    // The nodes should have moved apart
    const distance = Math.abs(c1.position.x - c2.position.x) + Math.abs(c1.position.y - c2.position.y);
    expect(distance).toBeGreaterThan(0);
  });

  it('separates two overlapping empty boundary groups by setting boundaryPosition on parent nodes', () => {
    // Both sys1 and sys2 have no containers and start at the same position
    const state = makeState({
      currentLevel: 'container',
      levels: {
        context: { level: 'context', nodes: [
          makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }),
          makeNode({ id: 'sys2', type: 'system', position: { x: 0, y: 0 } }),
        ], edges: [], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const result = resolveBoundaryOverlaps(state);
    const sys1 = result.levels['context'].nodes.find((n) => n.id === 'sys1')!;
    const sys2 = result.levels['context'].nodes.find((n) => n.id === 'sys2')!;
    // One of them must have acquired a boundaryPosition that separates the groups
    const bp1 = sys1.boundaryPosition ?? sys1.position;
    const bp2 = sys2.boundaryPosition ?? sys2.position;
    const distance = Math.abs(bp1.x - bp2.x) + Math.abs(bp1.y - bp2.y);
    expect(distance).toBeGreaterThan(0);
  });

  it('separates an empty group overlapping a non-empty group by shifting the empty group', () => {
    // sys1 has one container at (0,0); sys2 is empty and starts at (0,0) — groups overlap
    const state = makeState({
      currentLevel: 'container',
      levels: {
        context: { level: 'context', nodes: [
          makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }),
          makeNode({ id: 'sys2', type: 'system', position: { x: 0, y: 0 } }),
        ], edges: [], annotations: [] },
        container: { level: 'container', nodes: [
          makeNode({ id: 'c1', parentNodeId: 'sys1', position: { x: 0, y: 0 } }),
        ], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const result = resolveBoundaryOverlaps(state);
    // c1 (in the non-empty group) should not move; sys2 should get a boundaryPosition
    const c1 = result.levels['container'].nodes.find((n) => n.id === 'c1')!;
    expect(c1.position).toEqual({ x: 0, y: 0 });
    const sys2 = result.levels['context'].nodes.find((n) => n.id === 'sys2')!;
    expect(sys2.boundaryPosition).toBeDefined();
  });

  it('uses boundaryPosition (not position) for empty group bbox when boundaryPosition is set', () => {
    // sys2 is empty (no containers) but has boundaryPosition set far away from sys1
    const state = makeState({
      currentLevel: 'container',
      levels: {
        context: { level: 'context', nodes: [
          makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }),
          makeNode({ id: 'sys2', type: 'system', position: { x: 0, y: 0 }, boundaryPosition: { x: 2000, y: 2000 } }),
        ], edges: [], annotations: [] },
        container: { level: 'container', nodes: [
          makeNode({ id: 'c1', parentNodeId: 'sys1', position: { x: 0, y: 0 } }),
          // no containers for sys2
        ], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    // sys2's boundary is at (2000,2000) — far from sys1's group — so no overlap resolution needed
    const result = resolveBoundaryOverlaps(state);
    // c1 should not have moved, since the groups don't overlap
    const c1 = result.levels['container'].nodes.find((n) => n.id === 'c1')!;
    expect(c1.position).toEqual({ x: 0, y: 0 });
  });

  it('does not mutate the input state', () => {
    const origPos = { x: 0, y: 0 };
    const state = makeState({
      currentLevel: 'container',
      levels: {
        context: { level: 'context', nodes: [
          makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }),
          makeNode({ id: 'sys2', type: 'system', position: { x: 10, y: 0 } }),
        ], edges: [], annotations: [] },
        container: { level: 'container', nodes: [
          makeNode({ id: 'c1', parentNodeId: 'sys1', position: { ...origPos } }),
          makeNode({ id: 'c2', parentNodeId: 'sys2', position: { ...origPos } }),
        ], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const beforeC1Pos = state.levels['container'].nodes.find((n) => n.id === 'c1')!.position;
    resolveBoundaryOverlaps(state);
    // Original node position object should not have been mutated
    expect(beforeC1Pos).toEqual(origPos);
  });
});
