import { get } from 'svelte/store';
import {
  diagramStore,
  SCHEMA_VERSION,
  createInitialDiagramState,
  loadDiagram,
  mergeImportedDiagram,
} from '../../src/stores/diagramStore';
import type { C4Node, DiagramState } from '../../src/types';

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

function makeImportable(overrides: Partial<DiagramState> = {}): DiagramState {
  return {
    version: SCHEMA_VERSION,
    diagrams: {
      imported_root: {
        id: 'imported_root',
        level: 'context',
        label: 'Imported Root',
        nodes: [makeNode('imported_n1', { position: { x: 10, y: 20 } })],
        edges: [],
        annotations: [],
      },
    },
    rootId: 'imported_root',
    navigationStack: ['imported_root'],
    selectedId: null,
    pendingNodeType: null,
    ...overrides,
  };
}

beforeEach(() => {
  loadDiagram(createInitialDiagramState());
});

// ─── mergeImportedDiagram ─────────────────────────────────────────────────────

describe('mergeImportedDiagram', () => {
  it('appends imported root nodes into the current level', () => {
    mergeImportedDiagram(makeImportable());

    const state = get(diagramStore);
    const current = state.diagrams[state.rootId]!;
    expect(current.nodes).toHaveLength(1);
    expect(current.nodes[0]!.label).toBe('Node imported_n1');
  });

  it('does not remove existing nodes', () => {
    const existing = makeNode('existing_node', { position: { x: 500, y: 500 } });
    const initial = createInitialDiagramState();
    const rootId = initial.rootId;
    initial.diagrams[rootId]!.nodes = [existing];
    loadDiagram(initial);

    mergeImportedDiagram(makeImportable());

    const state = get(diagramStore);
    const current = state.diagrams[state.rootId]!;
    expect(current.nodes).toHaveLength(2);
    const ids = current.nodes.map((n) => n.id);
    expect(ids).toContain('existing_node');
  });

  it('remaps imported node IDs — no collisions with existing content', () => {
    const initial = createInitialDiagramState();
    const rootId = initial.rootId;
    initial.diagrams[rootId]!.nodes = [makeNode('imported_n1')];
    loadDiagram(initial);

    // Import a state that also has a node with id 'imported_n1'
    mergeImportedDiagram(makeImportable());

    const state = get(diagramStore);
    const current = state.diagrams[state.rootId]!;
    expect(current.nodes).toHaveLength(2);
    const ids = current.nodes.map((n) => n.id);
    // The imported node must have been remapped to a different ID
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(2);
  });

  it('applies an x offset to imported nodes', () => {
    mergeImportedDiagram(makeImportable());

    const state = get(diagramStore);
    const current = state.diagrams[state.rootId]!;
    const importedNode = current.nodes[0]!;
    // The imported node was at x=10; it should be offset
    expect(importedNode.position.x).toBeGreaterThan(10);
  });

  it('merges imported edges into the current level', () => {
    const importable: DiagramState = {
      ...makeImportable(),
      diagrams: {
        imported_root: {
          id: 'imported_root',
          level: 'context',
          label: 'Imported Root',
          nodes: [
            makeNode('i_n1', { position: { x: 0, y: 0 } }),
            makeNode('i_n2', { position: { x: 200, y: 0 } }),
          ],
          edges: [
            { id: 'i_e1', source: 'i_n1', target: 'i_n2', label: '' } as any,
          ],
          annotations: [],
        },
      },
    };

    mergeImportedDiagram(importable);

    const state = get(diagramStore);
    const current = state.diagrams[state.rootId]!;
    expect(current.edges).toHaveLength(1);
    // Edge source/target must reference the remapped node IDs
    const nodeIds = new Set(current.nodes.map((n) => n.id));
    expect(nodeIds.has(current.edges[0]!.source)).toBe(true);
    expect(nodeIds.has(current.edges[0]!.target)).toBe(true);
  });

  it('merges imported annotations into the current level', () => {
    const importable: DiagramState = {
      ...makeImportable(),
      diagrams: {
        imported_root: {
          id: 'imported_root',
          level: 'context',
          label: 'Imported Root',
          nodes: [],
          edges: [],
          annotations: [
            { id: 'a1', type: 'note', label: 'A note', position: { x: 5, y: 5 } } as any,
          ],
        },
      },
    };

    mergeImportedDiagram(importable);

    const state = get(diagramStore);
    const current = state.diagrams[state.rootId]!;
    expect((current.annotations ?? [])).toHaveLength(1);
    expect((current.annotations ?? [])[0]!.id).not.toBe('a1'); // remapped
  });

  it('adds child diagram levels from the imported file to the diagrams map', () => {
    const importable: DiagramState = {
      version: SCHEMA_VERSION,
      diagrams: {
        imported_root: {
          id: 'imported_root',
          level: 'context',
          label: 'Imported Root',
          nodes: [
            makeNode('i_n1', { position: { x: 0, y: 0 }, childDiagramId: 'imported_child' } as any),
          ],
          edges: [],
          annotations: [],
        },
        imported_child: {
          id: 'imported_child',
          level: 'container',
          label: 'Imported Child',
          nodes: [makeNode('i_n2', { position: { x: 0, y: 0 } })],
          edges: [],
          annotations: [],
        },
      },
      rootId: 'imported_root',
      navigationStack: ['imported_root'],
      selectedId: null,
      pendingNodeType: null,
    };

    mergeImportedDiagram(importable);

    const state = get(diagramStore);
    // Should have: original root + imported child level
    expect(Object.keys(state.diagrams)).toHaveLength(2);

    // The merged node's childDiagramId must point to a real level
    const current = state.diagrams[state.rootId]!;
    const nodeWithChild = current.nodes.find((n) => n.childDiagramId != null);
    expect(nodeWithChild).toBeDefined();
    expect(state.diagrams[nodeWithChild!.childDiagramId!]).toBeDefined();
  });

  it('handles an empty imported diagram without errors', () => {
    const importable: DiagramState = {
      ...makeImportable(),
      diagrams: {
        imported_root: {
          id: 'imported_root',
          level: 'context',
          label: 'Imported Root',
          nodes: [],
          edges: [],
          annotations: [],
        },
      },
    };

    expect(() => mergeImportedDiagram(importable)).not.toThrow();

    const state = get(diagramStore);
    const current = state.diagrams[state.rootId]!;
    expect(current.nodes).toHaveLength(0);
  });

  it('does not change the navigationStack', () => {
    const before = get(diagramStore).navigationStack;
    mergeImportedDiagram(makeImportable());
    const after = get(diagramStore).navigationStack;
    expect(after).toEqual(before);
  });

  it('does not change the rootId of the live diagram', () => {
    const before = get(diagramStore).rootId;
    mergeImportedDiagram(makeImportable());
    const after = get(diagramStore).rootId;
    expect(after).toBe(before);
  });

  it('merges into the active level when drilled in', () => {
    // Set up a diagram with a child level
    const initial = createInitialDiagramState();
    const rootId = initial.rootId;
    const parentNode = makeNode('parent_n', { position: { x: 0, y: 0 }, childDiagramId: 'child_level' } as any);
    initial.diagrams[rootId]!.nodes = [parentNode];
    initial.diagrams['child_level'] = {
      id: 'child_level',
      level: 'container',
      label: 'Child Level',
      nodes: [],
      edges: [],
      annotations: [],
    };
    initial.navigationStack = [rootId, 'child_level'];
    loadDiagram(initial);

    mergeImportedDiagram(makeImportable());

    const state = get(diagramStore);
    // Root should be untouched
    expect(state.diagrams[rootId]!.nodes).toHaveLength(1); // only the parent node
    // Child level should have the imported content
    expect(state.diagrams['child_level']!.nodes).toHaveLength(1);
  });
});
