import { describe, it, expect } from 'vitest';
import { applyAutoLayout, DEFAULT_LAYOUT_OPTIONS } from '../../src/stores/autoLayout';
import type { DiagramState, C4Node } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
function makeNode(overrides: Partial<C4Node> = {}): C4Node {
  return {
    id: `node-${++_id}`,
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('applyAutoLayout — context level (flat)', () => {
  it('returns a new state with updated positions for two nodes', async () => {
    const n1 = makeNode({ id: 'n1', position: { x: 0,   y: 0 } });
    const n2 = makeNode({ id: 'n2', position: { x: 0,   y: 0 } });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [n1, n2], edges: [{ id: 'e1', sources: ['n1'], targets: ['n2'], source: 'n1', target: 'n2' }] as any, annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });

    const result = await applyAutoLayout(state, DEFAULT_LAYOUT_OPTIONS);
    const [rn1, rn2] = result.levels.context.nodes;

    // ELK should separate the two nodes
    expect(rn1.position.x !== rn2.position.x || rn1.position.y !== rn2.position.y).toBe(true);
  });

  it('does not mutate the original state', async () => {
    const n1 = makeNode({ id: 'n1' });
    const state = makeState({
      levels: {
        context: { level: 'context', nodes: [n1], edges: [], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });

    const origPosition = { ...n1.position };
    await applyAutoLayout(state, DEFAULT_LAYOUT_OPTIONS);
    expect(state.levels.context.nodes[0].position).toEqual(origPosition);
  });

  it('does not modify other levels', async () => {
    const n1 = makeNode({ id: 'n1' });
    const containerNode = makeNode({ id: 'c1', type: 'container' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [n1],            edges: [], annotations: [] },
        container: { level: 'container', nodes: [containerNode], edges: [], annotations: [] },
        component: { level: 'component', nodes: [],              edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],              edges: [], annotations: [] },
      },
    });

    const result = await applyAutoLayout(state, DEFAULT_LAYOUT_OPTIONS);
    // Other levels are the same reference (unchanged)
    expect(result.levels.container).toBe(state.levels.container);
    expect(result.levels.component).toBe(state.levels.component);
    expect(result.levels.code).toBe(state.levels.code);
  });

  it('handles empty node list without error', async () => {
    const state = makeState();
    const result = await applyAutoLayout(state, DEFAULT_LAYOUT_OPTIONS);
    expect(result.levels.context.nodes).toHaveLength(0);
  });
});

describe('applyAutoLayout — container level, flow style', () => {
  it('assigns absolute positions to children in compound layout', async () => {
    const parent = makeNode({ id: 'p1', type: 'system', position: { x: 100, y: 100 } });
    const child1 = makeNode({ id: 'ch1', type: 'container', parentNodeId: 'p1', position: { x: 0, y: 0 } });
    const child2 = makeNode({ id: 'ch2', type: 'container', parentNodeId: 'p1', position: { x: 0, y: 0 } });

    const state = makeState({
      currentLevel: 'container',
      levels: {
        context:   { level: 'context',   nodes: [parent],         edges: [], annotations: [] },
        container: { level: 'container', nodes: [child1, child2], edges: [{ id: 'e1', sources: ['ch1'], targets: ['ch2'], source: 'ch1', target: 'ch2' }] as any, annotations: [] },
        component: { level: 'component', nodes: [],               edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],               edges: [], annotations: [] },
      },
    });

    const result = await applyAutoLayout(state, { direction: 'right', style: 'flow', spacing: 'normal' });
    const [rc1, rc2] = result.levels.container.nodes;

    // ELK should separate the two children
    expect(rc1.position.x !== rc2.position.x || rc1.position.y !== rc2.position.y).toBe(true);
  });
});

describe('applyAutoLayout — container level, compact style', () => {
  it('packs children within a group using rectpacking', async () => {
    const parent = makeNode({ id: 'p1', type: 'system', position: { x: 50, y: 50 } });
    const child1 = makeNode({ id: 'ch1', type: 'container', parentNodeId: 'p1', position: { x: 0, y: 0 } });
    const child2 = makeNode({ id: 'ch2', type: 'container', parentNodeId: 'p1', position: { x: 0, y: 0 } });

    const state = makeState({
      currentLevel: 'container',
      levels: {
        context:   { level: 'context',   nodes: [parent],         edges: [], annotations: [] },
        container: { level: 'container', nodes: [child1, child2], edges: [], annotations: [] },
        component: { level: 'component', nodes: [],               edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],               edges: [], annotations: [] },
      },
    });

    const result = await applyAutoLayout(state, { direction: 'right', style: 'compact', spacing: 'normal' });
    const [rc1, rc2] = result.levels.container.nodes;

    // Children should be moved to positions relative to the parent
    expect(rc1.position.x !== rc2.position.x || rc1.position.y !== rc2.position.y).toBe(true);
  });

  it('leaves orphan nodes at their original positions', async () => {
    const parent = makeNode({ id: 'p1', type: 'system', position: { x: 50, y: 50 } });
    const orphan = makeNode({ id: 'orphan', type: 'container', position: { x: 999, y: 999 } });

    const state = makeState({
      currentLevel: 'container',
      levels: {
        context:   { level: 'context',   nodes: [parent], edges: [], annotations: [] },
        container: { level: 'container', nodes: [orphan], edges: [], annotations: [] },
        component: { level: 'component', nodes: [],       edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],       edges: [], annotations: [] },
      },
    });

    const result = await applyAutoLayout(state, { direction: 'right', style: 'compact', spacing: 'normal' });
    // Orphan has no parentNodeId — compact layout leaves it as-is
    expect(result.levels.container.nodes[0].position).toEqual({ x: 999, y: 999 });
  });
});
