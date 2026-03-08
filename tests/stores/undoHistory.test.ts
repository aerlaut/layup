import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  undoStack,
  redoStack,
  canUndo,
  canRedo,
  pushUndo,
  undo,
  redo,
  clearHistory,
} from '../../src/stores/undoHistory';
import type { DiagramState } from '../../src/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeState(id: number): DiagramState {
  return {
    version: 1,
    levels: {
      context:   { level: 'context',   nodes: [], edges: [], annotations: [] },
      container: { level: 'container', nodes: [], edges: [], annotations: [] },
      component: { level: 'component', nodes: [], edges: [], annotations: [] },
      code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
    },
    currentLevel: 'context',
    selectedId: `state-${id}`,  // use selectedId as a unique marker
    pendingNodeType: null,
  };
}

beforeEach(() => {
  clearHistory();
});

// ─── canUndo / canRedo derived stores ────────────────────────────────────────

describe('canUndo', () => {
  it('is false when undo stack is empty', () => {
    expect(get(canUndo)).toBe(false);
  });

  it('is true after pushing a snapshot', () => {
    pushUndo(makeState(1));
    expect(get(canUndo)).toBe(true);
  });

  it('is false after undoing the only entry', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    pushUndo(s1);
    undo(s2);
    expect(get(canUndo)).toBe(false);
  });
});

describe('canRedo', () => {
  it('is false initially', () => {
    expect(get(canRedo)).toBe(false);
  });

  it('is true after an undo', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    pushUndo(s1);
    undo(s2);
    expect(get(canRedo)).toBe(true);
  });

  it('is false after redo consumes the only entry', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    pushUndo(s1);
    undo(s2);
    redo(s1);
    expect(get(canRedo)).toBe(false);
  });
});

// ─── pushUndo ────────────────────────────────────────────────────────────────

describe('pushUndo', () => {
  it('adds snapshot to undo stack', () => {
    const s = makeState(1);
    pushUndo(s);
    expect(get(undoStack)).toHaveLength(1);
    expect(get(undoStack)[0]).toBe(s);
  });

  it('clears the redo stack', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    const s3 = makeState(3);
    pushUndo(s1);
    undo(s2);
    // redo stack now has s2
    expect(get(redoStack)).toHaveLength(1);
    pushUndo(s3);
    // redo stack should be cleared
    expect(get(redoStack)).toHaveLength(0);
  });

  it('caps the undo stack at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      pushUndo(makeState(i));
    }
    expect(get(undoStack)).toHaveLength(50);
  });

  it('keeps the most recent 50 entries when cap is exceeded', () => {
    for (let i = 0; i < 55; i++) {
      pushUndo(makeState(i));
    }
    const stack = get(undoStack);
    // Oldest entry should be state 5 (0-4 were dropped)
    expect(stack[0]!.selectedId).toBe('state-5');
    // Newest should be state 54
    expect(stack[49]!.selectedId).toBe('state-54');
  });
});

// ─── undo ─────────────────────────────────────────────────────────────────────

describe('undo', () => {
  it('returns null when stack is empty', () => {
    expect(undo(makeState(1))).toBeNull();
  });

  it('returns the top snapshot', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    pushUndo(s1);
    const result = undo(s2);
    expect(result).toBe(s1);
  });

  it('removes the top entry from the undo stack', () => {
    pushUndo(makeState(1));
    pushUndo(makeState(2));
    undo(makeState(3));
    expect(get(undoStack)).toHaveLength(1);
  });

  it('pushes the current state onto the redo stack', () => {
    const current = makeState(99);
    pushUndo(makeState(1));
    undo(current);
    expect(get(redoStack)).toHaveLength(1);
    expect(get(redoStack)[0]).toBe(current);
  });
});

// ─── redo ─────────────────────────────────────────────────────────────────────

describe('redo', () => {
  it('returns null when redo stack is empty', () => {
    expect(redo(makeState(1))).toBeNull();
  });

  it('returns the top redo snapshot', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    pushUndo(s1);
    undo(s2);
    const result = redo(s1);
    expect(result).toBe(s2);
  });

  it('removes the top entry from the redo stack', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    pushUndo(s1);
    undo(s2);
    redo(s1);
    expect(get(redoStack)).toHaveLength(0);
  });

  it('pushes current state onto the undo stack', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    pushUndo(s1);
    undo(s2);           // undo: [], redo: [s2]
    redo(s1);           // undo: [s1], redo: []
    // undo stack should have the state that was passed to redo (s1)
    expect(get(undoStack)).toHaveLength(1);
    expect(get(undoStack)[0]).toBe(s1);
  });
});

// ─── clearHistory ─────────────────────────────────────────────────────────────

describe('clearHistory', () => {
  it('empties both stacks', () => {
    pushUndo(makeState(1));
    pushUndo(makeState(2));
    undo(makeState(3)); // adds to redo
    clearHistory();
    expect(get(undoStack)).toHaveLength(0);
    expect(get(redoStack)).toHaveLength(0);
  });
});

// ─── round-trip: push → undo → redo ──────────────────────────────────────────

describe('round-trip', () => {
  it('undo then redo returns to the same state reference', () => {
    const s1 = makeState(1);
    const s2 = makeState(2);
    pushUndo(s1);           // save s1 before mutating to s2
    const restored = undo(s2);  // go back: restored === s1
    const reapplied = redo(restored!); // go forward: reapplied === s2
    expect(restored).toBe(s1);
    expect(reapplied).toBe(s2);
  });

  it('multiple undo/redo cycles work correctly', () => {
    const states = [makeState(0), makeState(1), makeState(2), makeState(3)];

    // Simulate: edit s0→s1, s1→s2, s2→s3
    pushUndo(states[0]!);
    pushUndo(states[1]!);
    pushUndo(states[2]!);

    // Undo back to s0
    let cur: DiagramState = states[3]!;
    cur = undo(cur)!;  // cur = s2
    cur = undo(cur)!;  // cur = s1
    cur = undo(cur)!;  // cur = s0
    expect(cur).toBe(states[0]);

    // Redo forward to s2
    cur = redo(cur)!;  // cur = s1
    cur = redo(cur)!;  // cur = s2
    expect(cur).toBe(states[2]);

    // New edit from s2 should clear redo
    pushUndo(cur);
    expect(get(canRedo)).toBe(false);
  });
});
