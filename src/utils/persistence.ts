import type { AppState, DiagramState } from '../types';
import { SCHEMA_VERSION } from '../stores/diagramStore';
import { APP_STATE_VERSION, createInitialAppState } from '../stores/appStore';
import { STORAGE_WARN_BYTES } from './constants';

const STORAGE_KEY = 'laverop_diagram';
const STORAGE_KEY_APP = 'laverop_app';

// ─── AppState localStorage ────────────────────────────────────────────────────

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY_APP, JSON.stringify(state));
  } catch (e) {
    console.warn('laverop: failed to save app state to localStorage', e);
  }
}

export function loadAppState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APP);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (typeof parsed.version !== 'number') return null;
    return parsed;
  } catch (e) {
    console.warn('laverop: failed to load app state from localStorage', e);
    return null;
  }
}

/**
 * Migrate from legacy single-diagram format (laverop_diagram) to AppState.
 * Returns the migrated AppState, or null if no legacy data exists.
 * Deletes the legacy key on success.
 */
export function migrateFromLegacy(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const diagramState = JSON.parse(raw) as DiagramState;
    if (typeof diagramState !== 'object' || diagramState === null) return null;
    if (!diagramState.diagrams || typeof diagramState.rootId !== 'string') return null;

    const appState = createInitialAppState();
    // Replace the default diagram's state with the legacy one
    const projectId = Object.keys(appState.projects)[0] ?? '';
    const project = appState.projects[projectId];
    if (!project) return null;
    const diagramId = Object.keys(project.diagrams)[0] ?? '';
    const diagram = project.diagrams[diagramId];
    if (!diagram) return null;
    diagram.state = diagramState;

    // Remove legacy key
    localStorage.removeItem(STORAGE_KEY);

    return appState;
  } catch (e) {
    console.warn('laverop: failed to migrate legacy data', e);
    return null;
  }
}

// ─── Legacy localStorage (deprecated — kept for migration) ────────────────────

/** @deprecated Use saveAppState instead */
export function saveToLocalStorage(state: DiagramState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('laverop: failed to save to localStorage', e);
  }
}

/** @deprecated Use loadAppState instead */
export function loadFromLocalStorage(): DiagramState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiagramState;
    return parsed;
  } catch (e) {
    console.warn('laverop: failed to load from localStorage', e);
    return null;
  }
}

export function getLocalStorageUsageBytes(): number {
  try {
    // Check new key first, fall back to legacy
    const raw = localStorage.getItem(STORAGE_KEY_APP) ?? localStorage.getItem(STORAGE_KEY);
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
      `Diagram was created with a newer version (v${state.version}). Please upgrade laverop.`
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
