import { describe, it, expect } from 'vitest';
import {
  parseNodeSubtreeJSON,
  getValidParentNodes,
  importNodeSubtree,
} from '../../src/utils/nodeSubtreeImport';
import { ImportError } from '../../src/utils/persistence';
import type { C4Node, C4Edge, DiagramState, NodeSubtreeExport } from '../../src/types';
import { SCHEMA_VERSION } from '../../src/stores/diagramStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _nodeCounter = 0;
let _edgeCounter = 0;

function makeNode(overrides: Partial<C4Node> = {}): C4Node {
  return {
    id: `node-${++_nodeCounter}`,
    type: 'system',
    label: 'Test Node',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function makeEdge(overrides: Partial<C4Edge> = {}): C4Edge {
  return {
    id: `edge-${++_edgeCounter}`,
    source: 'a',
    target: 'b',
    ...overrides,
  };
}

function makeState(overrides: Partial<DiagramState> = {}): DiagramState {
  return {
    version: SCHEMA_VERSION,
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

function makeSubtree(overrides: Partial<NodeSubtreeExport> = {}): NodeSubtreeExport {
  const root = makeNode({ id: 'root', type: 'system' });
  return {
    exportType: 'node-subtree',
    version: 1,
    rootLevel: 'context',
    levels: {
      context: { level: 'context', nodes: [root], edges: [] },
    },
    ...overrides,
  };
}

// ─── parseNodeSubtreeJSON ─────────────────────────────────────────────────────

describe('parseNodeSubtreeJSON', () => {
  it('throws ImportError for invalid JSON', () => {
    expect(() => parseNodeSubtreeJSON('not-json')).toThrow(ImportError);
  });

  it('throws ImportError when root is not an object', () => {
    expect(() => parseNodeSubtreeJSON('"string"')).toThrow(ImportError);
  });

  it('throws ImportError when exportType is wrong', () => {
    const bad = JSON.stringify({ exportType: 'full-diagram', version: 1, rootLevel: 'context', levels: { context: { nodes: [{}] } } });
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(ImportError);
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(/exportType/);
  });

  it('throws ImportError when version is not 1', () => {
    const bad = JSON.stringify({ exportType: 'node-subtree', version: 2, rootLevel: 'context', levels: { context: { nodes: [{}] } } });
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(ImportError);
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(/version/);
  });

  it('throws ImportError when rootLevel is unknown', () => {
    const bad = JSON.stringify({ exportType: 'node-subtree', version: 1, rootLevel: 'invalid', levels: { invalid: { nodes: [{}] } } });
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(ImportError);
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(/rootLevel/);
  });

  it('throws ImportError when levels is missing', () => {
    const bad = JSON.stringify({ exportType: 'node-subtree', version: 1, rootLevel: 'context' });
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(ImportError);
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(/levels/);
  });

  it('throws ImportError when levels does not include rootLevel key', () => {
    const bad = JSON.stringify({ exportType: 'node-subtree', version: 1, rootLevel: 'context', levels: { container: { nodes: [{}] } } });
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(ImportError);
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(/rootLevel/);
  });

  it('throws ImportError when levels[rootLevel].nodes is empty', () => {
    const bad = JSON.stringify({ exportType: 'node-subtree', version: 1, rootLevel: 'context', levels: { context: { nodes: [] } } });
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(ImportError);
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(/nodes/);
  });

  it('throws ImportError when levels[rootLevel].nodes is missing', () => {
    const bad = JSON.stringify({ exportType: 'node-subtree', version: 1, rootLevel: 'context', levels: { context: {} } });
    expect(() => parseNodeSubtreeJSON(bad)).toThrow(ImportError);
  });

  it('returns the parsed object for a valid subtree export', () => {
    const subtree = makeSubtree();
    const result = parseNodeSubtreeJSON(JSON.stringify(subtree));
    expect(result.exportType).toBe('node-subtree');
    expect(result.version).toBe(1);
    expect(result.rootLevel).toBe('context');
  });

  it('accepts all four valid rootLevel values', () => {
    for (const level of ['context', 'container', 'component', 'code'] as const) {
      const subtree = makeSubtree({
        rootLevel: level,
        levels: { [level]: { level, nodes: [makeNode()], edges: [] } },
      });
      const result = parseNodeSubtreeJSON(JSON.stringify(subtree));
      expect(result.rootLevel).toBe(level);
    }
  });
});

// ─── getValidParentNodes ──────────────────────────────────────────────────────

describe('getValidParentNodes', () => {
  it('returns empty array when rootLevel is "context" (no parent level exists)', () => {
    const subtree = makeSubtree({ rootLevel: 'context' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [makeNode({ type: 'system' })], edges: [], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    expect(getValidParentNodes(state, subtree)).toEqual([]);
  });

  it('returns context-level nodes that are valid parents for a container subtree', () => {
    const validParent = makeNode({ id: 'sys1', type: 'system' });
    const invalidParent = makeNode({ id: 'person1', type: 'person' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [validParent, invalidParent], edges: [], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const subtree = makeSubtree({
      rootLevel: 'container',
      levels: {
        container: { level: 'container', nodes: [makeNode({ type: 'container' })], edges: [] },
      },
    });
    const result = getValidParentNodes(state, subtree);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sys1');
  });

  it('returns empty array when no valid parent nodes exist', () => {
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [makeNode({ type: 'person' })], edges: [], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });
    const subtree = makeSubtree({
      rootLevel: 'container',
      levels: {
        container: { level: 'container', nodes: [makeNode({ type: 'container' })], edges: [] },
      },
    });
    // person is not a valid parent for container level
    expect(getValidParentNodes(state, subtree)).toEqual([]);
  });
});

// ─── importNodeSubtree ────────────────────────────────────────────────────────

describe('importNodeSubtree', () => {
  it('does not mutate the input state', () => {
    const state = makeState();
    const subtree = makeSubtree();
    const stateCopy = JSON.stringify(state);
    importNodeSubtree(state, subtree);
    expect(JSON.stringify(state)).toBe(stateCopy);
  });

  it('all imported node/edge IDs are fresh (not present in original state)', () => {
    const existing = makeNode({ id: 'existing-node' });
    const existingEdge = makeEdge({ id: 'existing-edge', source: 'existing-node', target: 'existing-node' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [existing], edges: [existingEdge], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });

    const importRoot = makeNode({ id: 'import-root', type: 'system' });
    const subtree = makeSubtree({
      rootLevel: 'context',
      levels: {
        context: { level: 'context', nodes: [importRoot], edges: [] },
      },
    });

    const newState = importNodeSubtree(state, subtree);
    const newIds = newState.levels.context.nodes.map((n) => n.id);
    expect(newIds).toContain('existing-node');
    expect(newIds).not.toContain('import-root'); // remapped to a fresh ID
    expect(newIds).toHaveLength(2);
  });

  it('sets root node parentNodeId to the supplied parentNodeId', () => {
    const parent = makeNode({ id: 'parent-sys', type: 'system' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [parent], edges: [], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });

    const importRoot = makeNode({ id: 'import-root', type: 'container' });
    const subtree: NodeSubtreeExport = {
      exportType: 'node-subtree',
      version: 1,
      rootLevel: 'container',
      levels: {
        container: { level: 'container', nodes: [importRoot], edges: [] },
      },
    };

    const newState = importNodeSubtree(state, subtree, 'parent-sys');
    const [imported] = newState.levels.container.nodes;
    expect(imported.parentNodeId).toBe('parent-sys');
  });

  it('remaps all cross-references within the subtree (edge source/target, descendant parentNodeIds)', () => {
    const rootNode = makeNode({ id: 'root', type: 'system' });
    const childA = makeNode({ id: 'child-a', type: 'container', parentNodeId: 'root' });
    const childB = makeNode({ id: 'child-b', type: 'container', parentNodeId: 'root' });
    const edge = makeEdge({ id: 'edge-ab', source: 'child-a', target: 'child-b' });

    const subtree: NodeSubtreeExport = {
      exportType: 'node-subtree',
      version: 1,
      rootLevel: 'context',
      levels: {
        context:   { level: 'context',   nodes: [rootNode], edges: [] },
        container: { level: 'container', nodes: [childA, childB], edges: [edge] },
      },
    };

    const state = makeState();
    const newState = importNodeSubtree(state, subtree);

    // Capture new IDs
    const [newRoot] = newState.levels.context.nodes;
    const [newChildA, newChildB] = newState.levels.container.nodes;
    const [newEdge] = newState.levels.container.edges;

    // IDs are remapped
    expect(newRoot.id).not.toBe('root');
    expect(newChildA.id).not.toBe('child-a');
    expect(newChildB.id).not.toBe('child-b');
    expect(newEdge.id).not.toBe('edge-ab');

    // parentNodeIds of children point to the new root ID
    expect(newChildA.parentNodeId).toBe(newRoot.id);
    expect(newChildB.parentNodeId).toBe(newRoot.id);

    // Edge endpoints point to the new child IDs
    expect(newEdge.source).toBe(newChildA.id);
    expect(newEdge.target).toBe(newChildB.id);
  });

  it('does not add or remove annotations', () => {
    const annotation = { id: 'ann-1', type: 'note' as const, label: 'note', position: { x: 0, y: 0 } };
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [], edges: [], annotations: [annotation] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });

    const subtree = makeSubtree();
    const newState = importNodeSubtree(state, subtree);

    expect(newState.levels.context.annotations).toEqual([annotation]);
    expect(newState.levels.container.annotations).toEqual([]);
  });

  it('preserves all existing nodes and edges in the state', () => {
    const existing = makeNode({ id: 'existing' });
    const existingEdge = makeEdge({ id: 'e-edge', source: 'existing', target: 'existing' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [existing], edges: [existingEdge], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });

    const subtree = makeSubtree();
    const newState = importNodeSubtree(state, subtree);

    expect(newState.levels.context.nodes).toHaveLength(2);
    expect(newState.levels.context.nodes[0].id).toBe('existing');
    expect(newState.levels.context.edges[0].id).toBe('e-edge');
  });

  it('imports a multi-level subtree across context, container, and component', () => {
    const ctxNode = makeNode({ id: 'ctx', type: 'system' });
    const ctnNode = makeNode({ id: 'ctn', type: 'container', parentNodeId: 'ctx' });
    const cmpNode = makeNode({ id: 'cmp', type: 'component', parentNodeId: 'ctn' });

    const subtree: NodeSubtreeExport = {
      exportType: 'node-subtree',
      version: 1,
      rootLevel: 'context',
      levels: {
        context:   { level: 'context',   nodes: [ctxNode], edges: [] },
        container: { level: 'container', nodes: [ctnNode], edges: [] },
        component: { level: 'component', nodes: [cmpNode], edges: [] },
      },
    };

    const newState = importNodeSubtree(makeState(), subtree);

    const [newCtx] = newState.levels.context.nodes;
    const [newCtn] = newState.levels.container.nodes;
    const [newCmp] = newState.levels.component.nodes;

    // IDs remapped
    expect(newCtx.id).not.toBe('ctx');
    expect(newCtn.id).not.toBe('ctn');
    expect(newCmp.id).not.toBe('cmp');

    // Root has no parentNodeId (undefined was supplied)
    expect(newCtx.parentNodeId).toBeUndefined();

    // Container's parent is the new context node
    expect(newCtn.parentNodeId).toBe(newCtx.id);

    // Component's parent is the new container node
    expect(newCmp.parentNodeId).toBe(newCtn.id);
  });
});
