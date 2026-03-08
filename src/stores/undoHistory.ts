import { writable, derived, get } from 'svelte/store';
import type { DiagramState } from '../types';

const MAX_UNDO_DEPTH = 50;

export const undoStack = writable<DiagramState[]>([]);
export const redoStack = writable<DiagramState[]>([]);

export const canUndo = derived(undoStack, ($s) => $s.length > 0);
export const canRedo = derived(redoStack, ($s) => $s.length > 0);

/**
 * Call before every user-initiated mutation to snapshot the current state.
 * Clears the redo stack (a new edit invalidates undone history).
 */
export function pushUndo(snapshot: DiagramState): void {
  undoStack.update((stack) => {
    const next = [...stack, snapshot];
    return next.length > MAX_UNDO_DEPTH ? next.slice(next.length - MAX_UNDO_DEPTH) : next;
  });
  redoStack.set([]);
}

/**
 * Pops the last snapshot from the undo stack, pushes currentState to redo,
 * and returns the snapshot to restore (or null if nothing to undo).
 */
export function undo(currentState: DiagramState): DiagramState | null {
  const stack = get(undoStack);
  if (stack.length === 0) return null;
  const previous = stack[stack.length - 1]!;
  undoStack.update((s) => s.slice(0, -1));
  redoStack.update((s) => [...s, currentState]);
  return previous;
}

/**
 * Pops the last snapshot from the redo stack, pushes currentState to undo,
 * and returns the snapshot to restore (or null if nothing to redo).
 */
export function redo(currentState: DiagramState): DiagramState | null {
  const stack = get(redoStack);
  if (stack.length === 0) return null;
  const next = stack[stack.length - 1]!;
  redoStack.update((s) => s.slice(0, -1));
  undoStack.update((s) => [...s, currentState]);
  return next;
}

/** Clear history (e.g. when loading a new diagram). */
export function clearHistory(): void {
  undoStack.set([]);
  redoStack.set([]);
}
