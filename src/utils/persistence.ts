import type { DiagramState } from '../types';
import { SCHEMA_VERSION } from '../stores/diagramStore';

const STORAGE_KEY = 'vasker_diagram';
const STORAGE_WARN_BYTES = 4 * 1024 * 1024; // 4 MB

// ─── localStorage ─────────────────────────────────────────────────────────────

export function saveToLocalStorage(state: DiagramState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('vasker: failed to save to localStorage', e);
  }
}

export function loadFromLocalStorage(): DiagramState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiagramState;
    return parsed;
  } catch (e) {
    console.warn('vasker: failed to load from localStorage', e);
    return null;
  }
}

export function getLocalStorageUsageBytes(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    return new Blob([raw]).size;
  } catch {
    return 0;
  }
}

export function isNearStorageLimit(): boolean {
  return getLocalStorageUsageBytes() >= STORAGE_WARN_BYTES;
}

// ─── JSON export / import ─────────────────────────────────────────────────────

export function exportDiagramJSON(state: DiagramState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diagram.json';
  a.click();
  URL.revokeObjectURL(url);
}

export class ImportError extends Error {}

export function parseDiagramJSON(text: string): DiagramState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('Invalid JSON file.');
  }

  const state = parsed as DiagramState;
  if (typeof state !== 'object' || state === null) {
    throw new ImportError('JSON is not an object.');
  }
  if (typeof state.version !== 'number') {
    throw new ImportError('Missing or invalid "version" field.');
  }
  if (state.version > SCHEMA_VERSION) {
    throw new ImportError(
      `Diagram was created with a newer version (v${state.version}). Please upgrade vasker.`
    );
  }
  if (!state.diagrams || typeof state.diagrams !== 'object') {
    throw new ImportError('Missing "diagrams" map.');
  }
  if (typeof state.rootId !== 'string') {
    throw new ImportError('Missing "rootId".');
  }
  if (!Array.isArray(state.navigationStack)) {
    throw new ImportError('Missing "navigationStack".');
  }
  return state;
}

export async function importDiagramJSON(file: File): Promise<DiagramState> {
  const text = await file.text();
  return parseDiagramJSON(text);
}

// ─── Debounce helper ──────────────────────────────────────────────────────────

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
