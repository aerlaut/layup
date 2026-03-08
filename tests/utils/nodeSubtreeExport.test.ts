import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildNodeSubtreeExport, exportNodeSubtree } from '../../src/utils/nodeSubtreeExport';
import type { C4Node, C4Edge, DiagramState } from '../../src/types';
import { SCHEMA_VERSION } from '../../src/stores/diagramStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<C4Node> = {}): C4Node {
  return {
    id: `node-${Math.random().toString(36).slice(2, 8)}`,
    type: 'system',
    label: 'Test Node',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function makeEdge(overrides: Partial<C4Edge> = {}): C4Edge {
  return {
    id: `edge-${Math.random().toString(36).slice(2, 8)}`,
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

// ─── buildNodeSubtreeExport ───────────────────────────────────────────────────

describe('buildNodeSubtreeExport', () => {
  it('throws when nodeId is not found in any level', () => {
    const state = makeState();
    expect(() => buildNodeSubtreeExport(state, 'missing-id')).toThrow(
      'Node "missing-id" not found in any level of the diagram.'
    );
  });

  it('returns correct exportType, version, and rootLevel for a context-level root', () => {
    const root = makeNode({ id: 'root', type: 'system' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [root], edges: [], annotations: [] },
        container: { level: 'container', nodes: [],     edges: [], annotations: [] },
        component: { level: 'component', nodes: [],     edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],     edges: [], annotations: [] },
      },
    });
    const result = buildNodeSubtreeExport(state, 'root');
    expect(result.exportType).toBe('node-subtree');
    expect(result.version).toBe(1);
    expect(result.rootLevel).toBe('context');
  });

  it('strips parentNodeId from the root node in the export', () => {
    const root = makeNode({ id: 'root', type: 'container', parentNodeId: 'some-parent' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [],     edges: [], annotations: [] },
        container: { level: 'container', nodes: [root], edges: [], annotations: [] },
        component: { level: 'component', nodes: [],     edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],     edges: [], annotations: [] },
      },
    });
    const result = buildNodeSubtreeExport(state, 'root');
    const exportedRoot = result.levels['container']?.nodes[0];
    expect(exportedRoot).toBeDefined();
    expect(exportedRoot?.parentNodeId).toBeUndefined();
  });

  it('preserves parentNodeId on non-root nodes', () => {
    const root = makeNode({ id: 'root', type: 'system' });
    const child = makeNode({ id: 'child', type: 'container', parentNodeId: 'root' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [root],  edges: [], annotations: [] },
        container: { level: 'container', nodes: [child], edges: [], annotations: [] },
        component: { level: 'component', nodes: [],      edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],      edges: [], annotations: [] },
      },
    });
    const result = buildNodeSubtreeExport(state, 'root');
    const exportedChild = result.levels['container']?.nodes[0];
    expect(exportedChild?.parentNodeId).toBe('root');
  });

  it('excludes edges at the root level', () => {
    const root = makeNode({ id: 'root', type: 'system' });
    const other = makeNode({ id: 'other', type: 'system' });
    const edge = makeEdge({ id: 'e1', source: 'root', target: 'other' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [root, other], edges: [edge], annotations: [] },
        container: { level: 'container', nodes: [],            edges: [],     annotations: [] },
        component: { level: 'component', nodes: [],            edges: [],     annotations: [] },
        code:      { level: 'code',      nodes: [],            edges: [],     annotations: [] },
      },
    });
    const result = buildNodeSubtreeExport(state, 'root');
    // Only the root is in the subtree; edges at root level are always excluded
    expect(result.levels['context']?.edges).toHaveLength(0);
  });

  it('includes edges at descendant levels only when both endpoints are in the subtree', () => {
    const root = makeNode({ id: 'root', type: 'system' });
    const c1 = makeNode({ id: 'c1', type: 'container', parentNodeId: 'root' });
    const c2 = makeNode({ id: 'c2', type: 'container', parentNodeId: 'root' });
    const outsider = makeNode({ id: 'outsider', type: 'container', parentNodeId: 'other-root' });
    const internalEdge = makeEdge({ id: 'e-internal', source: 'c1', target: 'c2' });
    const externalEdge = makeEdge({ id: 'e-external', source: 'c1', target: 'outsider' });

    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [root],              edges: [],                           annotations: [] },
        container: { level: 'container', nodes: [c1, c2, outsider],  edges: [internalEdge, externalEdge], annotations: [] },
        component: { level: 'component', nodes: [],                  edges: [],                           annotations: [] },
        code:      { level: 'code',      nodes: [],                  edges: [],                           annotations: [] },
      },
    });

    const result = buildNodeSubtreeExport(state, 'root');
    const containerEdges = result.levels['container']?.edges ?? [];
    expect(containerEdges).toHaveLength(1);
    expect(containerEdges[0].id).toBe('e-internal');
  });

  it('excludes nodes not in the subtree from descendant levels', () => {
    const root = makeNode({ id: 'root', type: 'system' });
    const childOfRoot = makeNode({ id: 'c1', type: 'container', parentNodeId: 'root' });
    const childOfOther = makeNode({ id: 'c2', type: 'container', parentNodeId: 'other' });

    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [root],               edges: [], annotations: [] },
        container: { level: 'container', nodes: [childOfRoot, childOfOther], edges: [], annotations: [] },
        component: { level: 'component', nodes: [],                   edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],                   edges: [], annotations: [] },
      },
    });

    const result = buildNodeSubtreeExport(state, 'root');
    const containerNodes = result.levels['container']?.nodes ?? [];
    expect(containerNodes).toHaveLength(1);
    expect(containerNodes[0].id).toBe('c1');
  });

  it('includes multi-level subtree correctly', () => {
    const root = makeNode({ id: 'root', type: 'system' });
    const container = makeNode({ id: 'cont', type: 'container', parentNodeId: 'root' });
    const component = makeNode({ id: 'comp', type: 'component', parentNodeId: 'cont' });
    const code = makeNode({ id: 'cod', type: 'class', parentNodeId: 'comp' });

    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [root],      edges: [], annotations: [] },
        container: { level: 'container', nodes: [container], edges: [], annotations: [] },
        component: { level: 'component', nodes: [component], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [code],      edges: [], annotations: [] },
      },
    });

    const result = buildNodeSubtreeExport(state, 'root');
    expect(result.levels['context']?.nodes).toHaveLength(1);
    expect(result.levels['container']?.nodes).toHaveLength(1);
    expect(result.levels['component']?.nodes).toHaveLength(1);
    expect(result.levels['code']?.nodes).toHaveLength(1);
  });

  it('works when root is at container level', () => {
    const root = makeNode({ id: 'root', type: 'container', parentNodeId: 'ctx-node' });
    const comp = makeNode({ id: 'comp', type: 'component', parentNodeId: 'root' });

    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [],     edges: [], annotations: [] },
        container: { level: 'container', nodes: [root], edges: [], annotations: [] },
        component: { level: 'component', nodes: [comp], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],     edges: [], annotations: [] },
      },
    });

    const result = buildNodeSubtreeExport(state, 'root');
    expect(result.rootLevel).toBe('container');
    expect(result.levels['container']?.nodes[0].parentNodeId).toBeUndefined();
    expect(result.levels['component']?.nodes).toHaveLength(1);
    // context level should not appear in levels map
    expect(result.levels['context']).toBeUndefined();
  });

  it('never includes annotations', () => {
    const root = makeNode({ id: 'root', type: 'system' });
    const state = makeState({
      levels: {
        context:   {
          level: 'context',
          nodes: [root],
          edges: [],
          annotations: [{ id: 'annot-1', type: 'note', label: 'Some note', position: { x: 0, y: 0 } }],
        },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
      },
    });

    const result = buildNodeSubtreeExport(state, 'root');
    // NodeSubtreeLevelData has no annotations field
    const levelData = result.levels['context'];
    expect(levelData).toBeDefined();
    expect((levelData as Record<string, unknown>)['annotations']).toBeUndefined();
  });
});

// ─── exportNodeSubtree ────────────────────────────────────────────────────────

describe('exportNodeSubtree', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let mockAnchor: HTMLAnchorElement;

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => 'blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    clickSpy = vi.fn();

    mockAnchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    });

    appendChildSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('triggers a download with label-based filename', () => {
    const root = makeNode({ id: 'root', type: 'system' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [root], edges: [], annotations: [] },
        container: { level: 'container', nodes: [],     edges: [], annotations: [] },
        component: { level: 'component', nodes: [],     edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],     edges: [], annotations: [] },
      },
    });

    exportNodeSubtree(state, 'root', 'MySystem');
    expect(mockAnchor.download).toBe('MySystem-subtree.json');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('falls back to node-subtree.json when no label is provided', () => {
    const root = makeNode({ id: 'root', type: 'system' });
    const state = makeState({
      levels: {
        context:   { level: 'context',   nodes: [root], edges: [], annotations: [] },
        container: { level: 'container', nodes: [],     edges: [], annotations: [] },
        component: { level: 'component', nodes: [],     edges: [], annotations: [] },
        code:      { level: 'code',      nodes: [],     edges: [], annotations: [] },
      },
    });

    exportNodeSubtree(state, 'root');
    expect(mockAnchor.download).toBe('node-subtree.json');
    expect(clickSpy).toHaveBeenCalledOnce();
  });
});
