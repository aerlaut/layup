import type { AppState, DiagramState, DiagramLevel, C4LevelType } from '../types';
import { SCHEMA_VERSION, LEVEL_ORDER } from '../stores/diagramStore';
import { createInitialAppState } from '../stores/appStore';
import { APP_STATE_VERSION } from './constants';
import { STORAGE_WARN_BYTES } from './constants';
import Ajv from 'ajv';
import diagramSchema from '../../schema/diagram.schema.json';

// Lazily compiled validator — only created on first import attempt.
let _validate: ReturnType<Ajv['compile']> | null = null;
function getDiagramValidator(): ReturnType<Ajv['compile']> {
  if (!_validate) {
    const ajv = new Ajv({ allErrors: true });
    _validate = ajv.compile(diagramSchema);
  }
  return _validate;
}

export { remapIds } from './remapIds';

const STORAGE_KEY = 'layup_diagram';
const STORAGE_KEY_APP = 'layup_app';

// ─── AppState localStorage ────────────────────────────────────────────────────

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY_APP, JSON.stringify(state));
  } catch (e) {
    console.warn('layup: failed to save app state to localStorage', e);
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
    console.warn('layup: failed to load app state from localStorage', e);
    return null;
  }
}

/**
 * Migrate from legacy single-diagram format (layup_diagram) to AppState.
 * Returns the migrated AppState, or null if no legacy data exists.
 * Deletes the legacy key on success.
 */
export function migrateFromLegacy(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;

    // Accept both v1 (diagrams/rootId) and v2 (levels/currentLevel) formats
    const asRecord = parsed as Record<string, unknown>;
    const isV1 = 'diagrams' in asRecord && typeof asRecord.rootId === 'string';
    const isV2 = 'levels' in asRecord && typeof asRecord.currentLevel === 'string';
    if (!isV1 && !isV2) return null;

    // Run through parseDiagramJSON to apply any necessary migration
    let diagramState: DiagramState;
    try {
      diagramState = parseDiagramJSON(raw);
    } catch {
      return null;
    }

    const appState = createInitialAppState();
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
    console.warn('layup: failed to migrate legacy data', e);
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

export function exportDiagramJSON(state: DiagramState, name?: string): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name ? `${name}.json` : 'diagram.json';
  a.click();
  URL.revokeObjectURL(url);
}

export class ImportError extends Error {}

// ─── V1 format types (for migration) ─────────────────────────────────────────

// Local type alias for the old v1 format — used only in the migration path
interface DiagramStateV1 {
  version: 1;
  diagrams: Record<string, {
    id: string;
    level: string;
    label: string;
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      position: { x: number; y: number };
      childDiagramId?: string;
      parentNodeId?: string;
      [key: string]: unknown;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceGroupId?: string;
      targetGroupId?: string;
      [key: string]: unknown;
    }>;
    annotations?: Array<{ id: string; [key: string]: unknown }>;
  }>;
  rootId: string;
  navigationStack: string[];
  selectedId: string | null;
  pendingNodeType: unknown;
}

function migrateDiagramStateV1toV2(v1: DiagramStateV1): DiagramState {
  // Initialise empty buckets for all four levels
  type LevelBucket = {
    nodes: DiagramStateV1['diagrams'][string]['nodes'];
    edges: DiagramStateV1['diagrams'][string]['edges'];
    annotations: DiagramStateV1['diagrams'][string]['annotations'];
  };
  const buckets: Record<string, LevelBucket> = {};
  for (const l of LEVEL_ORDER) {
    buckets[l] = { nodes: [], edges: [], annotations: [] };
  }

  // Walk the v1 diagram tree depth-first.
  // parentNodeId is the node in the parent diagram whose childDiagramId === this diagram's id.
  function walk(diagramId: string, parentNodeId: string | undefined): void {
    const diag = v1.diagrams[diagramId];
    if (!diag) return;

    const level = diag.level as C4LevelType;
    if (!buckets[level]) return; // unknown level — skip

    for (const node of diag.nodes) {
      buckets[level].nodes.push({
        ...node,
        parentNodeId: level === 'context' ? undefined : parentNodeId,
      } as DiagramStateV1['diagrams'][string]['nodes'][number]);

      if (node.childDiagramId) {
        walk(node.childDiagramId, node.id);
      }
    }

    for (const edge of diag.edges) {
      if (!edge.sourceGroupId && !edge.targetGroupId) {
        // Intra-level edge: belongs at this diagram's level
        const { sourceGroupId: _s, targetGroupId: _t, ...cleanEdge } = edge;
        buckets[level].edges.push(cleanEdge);
      } else {
        // Cross-group edge: source and target live in child diagrams
        const srcDiag = edge.sourceGroupId ? v1.diagrams[edge.sourceGroupId] : undefined;
        const edgeLevel = (srcDiag?.level ?? level) as C4LevelType;
        if (buckets[edgeLevel]) {
          const { sourceGroupId: _s, targetGroupId: _t, ...cleanEdge } = edge;
          buckets[edgeLevel].edges.push(cleanEdge);
        }
      }
    }

    for (const annot of diag.annotations ?? []) {
      buckets[level].annotations!.push(annot);
    }
  }

  walk(v1.rootId, undefined);

  // Build the v2 DiagramState
  const levels = {} as DiagramState['levels'];
  for (const l of LEVEL_ORDER) {
    levels[l as C4LevelType] = {
      level: l as C4LevelType,
      nodes:       buckets[l].nodes       as DiagramState['levels'][C4LevelType]['nodes'],
      edges:       buckets[l].edges       as DiagramState['levels'][C4LevelType]['edges'],
      annotations: (buckets[l].annotations ?? []) as DiagramState['levels'][C4LevelType]['annotations'],
    };
  }

  return {
    version: 2, // SCHEMA_VERSION
    levels,
    currentLevel: 'context',
    selectedId: null,
    pendingNodeType: null,
  };
}

// ─── Parse & validate ─────────────────────────────────────────────────────────

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
      `Diagram was created with a newer version (v${state.version}). Please upgrade layup.`
    );
  }

  // Migrate v1 → v2
  let migrated: DiagramState = state;
  if (state.version === 1) {
    migrated = migrateDiagramStateV1toV2(state as unknown as DiagramStateV1);
  }

  // ── Schema validation ───────────────────────────────────────────────────────
  const validate = getDiagramValidator();
  const valid = validate(migrated);
  if (!valid) {
    const errorSummary = (validate.errors ?? [])
      .slice(0, 3) // cap to avoid overwhelming the user
      .map((e) => `${e.instancePath || '(root)'}: ${e.message}`)
      .join('; ');
    throw new ImportError(`Invalid diagram structure: ${errorSummary}`);
  }

  return migrated;
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
