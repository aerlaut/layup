import { get } from 'svelte/store';
import {
  diagramStore,
  SCHEMA_VERSION,
  createInitialDiagramState,
  loadDiagram,
  mergeImportedDiagram,
} from '../../src/stores/diagramStore';
import type { C4Node, DiagramState, C4LevelType } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(id: string, overrides: Partial<C4Node> = {}): C4Node {
  return {
    id,
    type: 'system',
    label: `Node ${id}`,
    position: { x: 0, y: 0 },
    ...overrides,
  } as C4Node;
}

function makeImportable(levelOverrides: Partial<Record<C4LevelType, Partial<DiagramState['levels'][C4LevelType]>>> = {}): DiagramState {
  const base = createInitialDiagramState();
  base.levels['context'].nodes = [makeNode('imported_n1', { position: { x: 10, y: 20 } })];
  for (const [level, overrides] of Object.entries(levelOverrides)) {
    Object.assign(base.levels[level as C4LevelType], overrides);
  }
  return base;
}

beforeEach(() => {
  loadDiagram(createInitialDiagramState());
});

// ─── mergeImportedDiagram ─────────────────────────────────────────────────────

describe('mergeImportedDiagram', () => {
  it('appends imported context nodes into the current level', () => {
    mergeImportedDiagram(makeImportable());
    const state = get(diagramStore);
    expect(state.levels['context'].nodes).toHaveLength(1);
    expect(state.levels['context'].nodes[0]!.label).toBe('Node imported_n1');
  });

  it('does not remove existing nodes', () => {
    const initial = createInitialDiagramState();
    initial.levels['context'].nodes = [makeNode('existing_node', { position: { x: 500, y: 500 } })];
    loadDiagram(initial);

    mergeImportedDiagram(makeImportable());

    const state = get(diagramStore);
    expect(state.levels['context'].nodes).toHaveLength(2);
    const ids = state.levels['context'].nodes.map((n) => n.id);
    expect(ids).toContain('existing_node');
  });

  it('remaps imported node IDs — no collisions with existing content', () => {
    const initial = createInitialDiagramState();
    initial.levels['context'].nodes = [makeNode('imported_n1')];
    loadDiagram(initial);

    mergeImportedDiagram(makeImportable());

    const state = get(diagramStore);
    const nodes = state.levels['context'].nodes;
    expect(nodes).toHaveLength(2);
    const uniqueIds = new Set(nodes.map((n) => n.id));
    expect(uniqueIds.size).toBe(2);
  });

  it('applies an x offset to imported nodes', () => {
    mergeImportedDiagram(makeImportable());
    const state = get(diagramStore);
    const importedNode = state.levels['context'].nodes[0]!;
    expect(importedNode.position.x).toBeGreaterThan(10);
  });

  it('merges imported edges into the level', () => {
    const importable = createInitialDiagramState();
    importable.levels['context'].nodes = [
      makeNode('i_n1', { position: { x: 0, y: 0 } }),
      makeNode('i_n2', { position: { x: 200, y: 0 } }),
    ];
    importable.levels['context'].edges = [
      { id: 'i_e1', source: 'i_n1', target: 'i_n2', label: '' } as any,
    ];

    mergeImportedDiagram(importable);

    const state = get(diagramStore);
    const level = state.levels['context'];
    expect(level.edges).toHaveLength(1);
    // Edge source/target must reference the remapped node IDs
    const nodeIds = new Set(level.nodes.map((n) => n.id));
    expect(nodeIds.has(level.edges[0]!.source)).toBe(true);
    expect(nodeIds.has(level.edges[0]!.target)).toBe(true);
  });

  it('merges imported annotations with offset', () => {
    const importable = createInitialDiagramState();
    importable.levels['context'].annotations = [
      { id: 'a1', type: 'note', label: 'A note', position: { x: 5, y: 5 } } as any,
    ];
    importable.levels['context'].nodes = [];

    mergeImportedDiagram(importable);

    const state = get(diagramStore);
    const annotations = state.levels['context'].annotations ?? [];
    expect(annotations).toHaveLength(1);
    expect(annotations[0]!.id).not.toBe('a1'); // remapped
    expect(annotations[0]!.position.x).toBeGreaterThan(5); // offset applied
  });

  it('merges all levels from the imported state', () => {
    const importable = createInitialDiagramState();
    importable.levels['context'].nodes = [makeNode('ctx1', { position: { x: 0, y: 0 } })];
    importable.levels['container'].nodes = [
      makeNode('cont1', { type: 'container', parentNodeId: 'ctx1', position: { x: 0, y: 0 } }),
    ];

    mergeImportedDiagram(importable);

    const state = get(diagramStore);
    expect(state.levels['context'].nodes).toHaveLength(1);
    expect(state.levels['container'].nodes).toHaveLength(1);
    // parentNodeId in container must reference the remapped context node
    const ctxNodeId = state.levels['context'].nodes[0]!.id;
    expect(state.levels['container'].nodes[0]!.parentNodeId).toBe(ctxNodeId);
  });

  it('handles an empty imported diagram without errors', () => {
    const importable = createInitialDiagramState();
    expect(() => mergeImportedDiagram(importable)).not.toThrow();
    const state = get(diagramStore);
    expect(state.levels['context'].nodes).toHaveLength(0);
  });

  it('does not change currentLevel', () => {
    const before = get(diagramStore).currentLevel;
    mergeImportedDiagram(makeImportable());
    expect(get(diagramStore).currentLevel).toBe(before);
  });
});
