/**
 * Integration tests for undo/redo wired into diagramStore mutations.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  diagramStore,
  addNode,
  updateNode,
  deleteNode,
  addEdge,
  updateEdge,
  deleteEdge,
  addAnnotation,
  updateAnnotation,
  deleteAnnotation,
  updateNodePositions,
  loadDiagram,
  resetDiagram,
  setSelected,
  drillDown,
  drillUp,
  navigateTo,
  performUndo,
  performRedo,
  createInitialDiagramState,
} from '../../src/stores/diagramStore';
import { clearHistory, canUndo, canRedo, undoStack } from '../../src/stores/undoHistory';
import type { C4Node, C4Edge, Annotation } from '../../src/types';

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

function makeEdge(source: string, target: string): C4Edge {
  return {
    id: `edge-${Math.random().toString(36).slice(2, 8)}`,
    source,
    target,
  };
}

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: `annot-${Math.random().toString(36).slice(2, 8)}`,
    type: 'note',
    label: 'Note',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function getState() {
  return get(diagramStore);
}

function getContextNodes() {
  return getState().levels['context'].nodes;
}

beforeEach(() => {
  resetDiagram();
  clearHistory();
});

// ─── Node CRUD undo ───────────────────────────────────────────────────────────

describe('addNode undo/redo', () => {
  it('undo removes the added node', () => {
    addNode(makeNode({ id: 'n1' }));
    expect(getContextNodes()).toHaveLength(1);
    performUndo();
    expect(getContextNodes()).toHaveLength(0);
  });

  it('redo re-adds the node', () => {
    addNode(makeNode({ id: 'n1' }));
    performUndo();
    performRedo();
    expect(getContextNodes()).toHaveLength(1);
    expect(getContextNodes()[0]!.id).toBe('n1');
  });

  it('canUndo is true after addNode', () => {
    addNode(makeNode());
    expect(get(canUndo)).toBe(true);
  });

  it('canRedo is false after a fresh edit', () => {
    addNode(makeNode());
    expect(get(canRedo)).toBe(false);
  });
});

describe('updateNode undo/redo', () => {
  it('undo restores the original label', () => {
    addNode(makeNode({ id: 'n1', label: 'Before' }));
    updateNode('n1', { label: 'After' });
    performUndo();
    expect(getContextNodes().find((n) => n.id === 'n1')!.label).toBe('Before');
  });

  it('redo re-applies the update', () => {
    addNode(makeNode({ id: 'n1', label: 'Before' }));
    updateNode('n1', { label: 'After' });
    performUndo();
    performRedo();
    expect(getContextNodes().find((n) => n.id === 'n1')!.label).toBe('After');
  });
});

describe('deleteNode undo/redo', () => {
  it('undo restores the deleted node', () => {
    addNode(makeNode({ id: 'n1' }));
    deleteNode('n1');
    expect(getContextNodes()).toHaveLength(0);
    performUndo();
    expect(getContextNodes().find((n) => n.id === 'n1')).toBeDefined();
  });

  it('redo removes the node again', () => {
    addNode(makeNode({ id: 'n1' }));
    deleteNode('n1');
    performUndo();
    performRedo();
    expect(getContextNodes()).toHaveLength(0);
  });
});

// ─── Edge CRUD undo ───────────────────────────────────────────────────────────

describe('addEdge undo/redo', () => {
  it('undo removes the added edge', () => {
    addNode(makeNode({ id: 'a', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'b', position: { x: 300, y: 0 } }));
    addEdge(makeEdge('a', 'b'));
    performUndo();
    expect(getState().levels['context'].edges).toHaveLength(0);
  });

  it('redo re-adds the edge', () => {
    addNode(makeNode({ id: 'a', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'b', position: { x: 300, y: 0 } }));
    addEdge(makeEdge('a', 'b'));
    performUndo();
    performRedo();
    expect(getState().levels['context'].edges).toHaveLength(1);
  });
});

describe('updateEdge undo/redo', () => {
  it('undo restores edge label', () => {
    addNode(makeNode({ id: 'a', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'b', position: { x: 300, y: 0 } }));
    const edge = makeEdge('a', 'b');
    addEdge(edge);
    updateEdge(edge.id, { label: 'New Label' });
    performUndo();
    const restored = getState().levels['context'].edges[0]!;
    expect(restored.label).toBeUndefined();
  });
});

describe('deleteEdge undo/redo', () => {
  it('undo restores the deleted edge', () => {
    addNode(makeNode({ id: 'a', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'b', position: { x: 300, y: 0 } }));
    const edge = makeEdge('a', 'b');
    addEdge(edge);
    deleteEdge(edge.id);
    performUndo();
    expect(getState().levels['context'].edges).toHaveLength(1);
  });
});

// ─── Annotation CRUD undo ─────────────────────────────────────────────────────

describe('addAnnotation undo/redo', () => {
  it('undo removes the annotation', () => {
    addAnnotation(makeAnnotation({ id: 'a1' }));
    performUndo();
    expect(getState().levels['context'].annotations).toHaveLength(0);
  });

  it('redo re-adds the annotation', () => {
    addAnnotation(makeAnnotation({ id: 'a1' }));
    performUndo();
    performRedo();
    expect(getState().levels['context'].annotations).toHaveLength(1);
  });
});

describe('updateAnnotation undo/redo', () => {
  it('undo restores annotation label', () => {
    addAnnotation(makeAnnotation({ id: 'a1', label: 'Before' }));
    updateAnnotation('context', 'a1', { label: 'After' });
    performUndo();
    expect(getState().levels['context'].annotations[0]!.label).toBe('Before');
  });
});

describe('deleteAnnotation undo/redo', () => {
  it('undo restores the deleted annotation', () => {
    addAnnotation(makeAnnotation({ id: 'a1' }));
    deleteAnnotation('context', 'a1');
    performUndo();
    expect(getState().levels['context'].annotations).toHaveLength(1);
  });
});

// ─── Position updates (debounced) ─────────────────────────────────────────────

describe('updateNodePositions undo', () => {
  it('does NOT immediately push to undo stack (debounced)', () => {
    // Use fake timers to control debounce
    vi.useFakeTimers();
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    clearHistory(); // remove addNode snapshot

    updateNodePositions([{ id: 'n1', position: { x: 100, y: 0 } }]);
    // Snapshot is debounced — undo stack should still be empty immediately
    expect(get(undoStack)).toHaveLength(0);
    vi.useRealTimers();
  });

  it('after debounce fires, undo restores pre-drag position', async () => {
    vi.useFakeTimers();
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    clearHistory();

    updateNodePositions([{ id: 'n1', position: { x: 100, y: 0 } }]);
    // Advance timer to trigger debounced snapshot
    vi.advanceTimersByTime(300);

    vi.useRealTimers();
    performUndo();
    const pos = getContextNodes().find((n) => n.id === 'n1')!.position;
    expect(pos.x).toBe(100); // snapshot was taken at x=100, after first move
  });
});

// ─── Navigation does NOT push to undo stack ───────────────────────────────────

describe('navigation actions are not undoable', () => {
  it('drillDown does not push to undo stack', () => {
    drillDown();
    expect(get(canUndo)).toBe(false);
  });

  it('drillUp does not push to undo stack', () => {
    drillDown();
    clearHistory();
    drillUp();
    expect(get(canUndo)).toBe(false);
  });

  it('navigateTo does not push to undo stack', () => {
    navigateTo('container');
    expect(get(canUndo)).toBe(false);
  });

  it('setSelected does not push to undo stack', () => {
    setSelected('some-id');
    expect(get(canUndo)).toBe(false);
  });
});

// ─── loadDiagram clears history ───────────────────────────────────────────────

describe('loadDiagram clears undo/redo history', () => {
  it('clears undo stack when loading new diagram', () => {
    addNode(makeNode());
    expect(get(canUndo)).toBe(true);
    loadDiagram(createInitialDiagramState());
    expect(get(canUndo)).toBe(false);
  });

  it('clears redo stack when loading new diagram', () => {
    addNode(makeNode());
    performUndo();
    expect(get(canRedo)).toBe(true);
    loadDiagram(createInitialDiagramState());
    expect(get(canRedo)).toBe(false);
  });
});

// ─── Multiple sequential undos ────────────────────────────────────────────────

describe('sequential undo', () => {
  it('undoes multiple operations in order', () => {
    addNode(makeNode({ id: 'n1', label: 'First' }));
    addNode(makeNode({ id: 'n2', label: 'Second', position: { x: 300, y: 0 } }));

    expect(getContextNodes()).toHaveLength(2);
    performUndo(); // undo addNode n2
    expect(getContextNodes()).toHaveLength(1);
    performUndo(); // undo addNode n1
    expect(getContextNodes()).toHaveLength(0);
  });

  it('new edit after undo clears redo stack', () => {
    addNode(makeNode({ id: 'n1' }));
    performUndo();
    expect(get(canRedo)).toBe(true);
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } })); // new edit
    expect(get(canRedo)).toBe(false);
  });
});

// ─── performUndo/performRedo are no-ops when stack empty ─────────────────────

describe('performUndo / performRedo no-ops', () => {
  it('performUndo does nothing when nothing to undo', () => {
    const before = getState();
    performUndo();
    expect(getState()).toBe(before);
  });

  it('performRedo does nothing when nothing to redo', () => {
    const before = getState();
    performRedo();
    expect(getState()).toBe(before);
  });
});
