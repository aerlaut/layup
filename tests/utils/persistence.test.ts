import {
  saveAppState,
  loadAppState,
  migrateFromLegacy,
  getLocalStorageUsageBytes,
  isNearStorageLimit,
  exportDiagramJSON,
  parseDiagramJSON,
  extractSubtree,
  exportLevelJSON,
  ImportError,
  debounce,
} from '../../src/utils/persistence';
import { SCHEMA_VERSION } from '../../src/stores/diagramStore';
import { createInitialAppState } from '../../src/stores/appStore';
import { APP_STATE_VERSION } from '../../src/utils/constants';
import type { AppState, DiagramState } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeValidState(overrides: Partial<DiagramState> = {}): DiagramState {
  return {
    version: SCHEMA_VERSION,
    diagrams: {
      root: {
        id: 'root',
        level: 'context',
        label: 'System Context',
        nodes: [],
        edges: [],
      },
    },
    rootId: 'root',
    navigationStack: ['root'],
    selectedId: null,
    pendingNodeType: null,
    ...overrides,
  };
}

// ─── parseDiagramJSON ─────────────────────────────────────────────────────────

describe('parseDiagramJSON', () => {
  it('parses valid JSON and returns DiagramState', () => {
    const state = makeValidState();
    const result = parseDiagramJSON(JSON.stringify(state));
    expect(result.version).toBe(SCHEMA_VERSION);
    expect(result.rootId).toBe('root');
    expect(result.diagrams['root']).toBeDefined();
  });

  it('throws ImportError for invalid JSON', () => {
    expect(() => parseDiagramJSON('not json {')).toThrow(ImportError);
    expect(() => parseDiagramJSON('not json {')).toThrow('Invalid JSON file.');
  });

  it('throws ImportError when JSON is not an object', () => {
    expect(() => parseDiagramJSON('"hello"')).toThrow(ImportError);
    expect(() => parseDiagramJSON('"hello"')).toThrow('JSON is not an object.');
  });

  it('throws ImportError for null JSON', () => {
    expect(() => parseDiagramJSON('null')).toThrow(ImportError);
    expect(() => parseDiagramJSON('null')).toThrow('JSON is not an object.');
  });

  it('throws ImportError when version is missing', () => {
    const obj = { diagrams: {}, rootId: 'root', navigationStack: ['root'] };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Missing or invalid "version" field.');
  });

  it('throws ImportError when version is not a number', () => {
    const obj = { version: 'abc', diagrams: {}, rootId: 'root', navigationStack: ['root'] };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Missing or invalid "version" field.');
  });

  it('throws ImportError when version is newer than current schema', () => {
    const obj = { version: SCHEMA_VERSION + 1, diagrams: {}, rootId: 'root', navigationStack: ['root'] };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Please upgrade layup.');
  });

  it('throws ImportError when diagrams is missing', () => {
    const obj = { version: SCHEMA_VERSION, rootId: 'root', navigationStack: ['root'] };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Missing "diagrams" map.');
  });

  it('throws ImportError when diagrams is not an object', () => {
    const obj = { version: SCHEMA_VERSION, diagrams: 'bad', rootId: 'root', navigationStack: ['root'] };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Missing "diagrams" map.');
  });

  it('throws ImportError when rootId is missing', () => {
    const obj = { version: SCHEMA_VERSION, diagrams: {}, navigationStack: ['root'] };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Missing "rootId".');
  });

  it('throws ImportError when navigationStack is missing', () => {
    const obj = { version: SCHEMA_VERSION, diagrams: {}, rootId: 'root' };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Missing "navigationStack".');
  });

  it('throws ImportError when navigationStack is not an array', () => {
    const obj = { version: SCHEMA_VERSION, diagrams: {}, rootId: 'root', navigationStack: 'bad' };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Missing "navigationStack".');
  });

  it('throws ImportError for structurally invalid data (schema validation)', () => {
    const bad = JSON.stringify({
      version: 2,
      levels: { context: { level: 'context', nodes: 'WRONG', edges: [], annotations: [] } },
      currentLevel: 'context',
      selectedId: null,
      pendingNodeType: null,
    });
    expect(() => parseDiagramJSON(bad)).toThrow(ImportError);
    expect(() => parseDiagramJSON(bad)).toThrow('Invalid diagram structure:');
  });
});

// ─── Storage size helpers ─────────────────────────────────────────────────────

describe('getLocalStorageUsageBytes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns 0 when nothing stored', () => {
    expect(getLocalStorageUsageBytes()).toBe(0);
  });

  it('returns approximate byte size after saving', () => {
    const state = createInitialAppState();
    saveAppState(state);
    const bytes = getLocalStorageUsageBytes();
    expect(bytes).toBeGreaterThan(0);
  });
});

describe('isNearStorageLimit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false for small data', () => {
    saveAppState(createInitialAppState());
    expect(isNearStorageLimit()).toBe(false);
  });
});

// ─── AppState localStorage ────────────────────────────────────────────────────

describe('saveAppState / loadAppState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips an AppState', () => {
    const state = createInitialAppState();
    saveAppState(state);
    const loaded = loadAppState();
    expect(loaded).toEqual(state);
  });

  it('returns null when nothing is stored', () => {
    expect(loadAppState()).toBeNull();
  });

  it('returns null on corrupted data', () => {
    localStorage.setItem('layup_app', '{broken json');
    expect(loadAppState()).toBeNull();
  });

  it('returns null when stored value is not an object', () => {
    localStorage.setItem('layup_app', '"hello"');
    expect(loadAppState()).toBeNull();
  });

  it('returns null when version is missing', () => {
    localStorage.setItem('layup_app', JSON.stringify({ account: {}, projects: {} }));
    expect(loadAppState()).toBeNull();
  });
});

// ─── migrateFromLegacy ────────────────────────────────────────────────────────

describe('migrateFromLegacy', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no legacy data exists', () => {
    expect(migrateFromLegacy()).toBeNull();
  });

  it('wraps legacy DiagramState in an AppState', () => {
    const legacyState = makeValidState();
    localStorage.setItem('layup_diagram', JSON.stringify(legacyState));

    const migrated = migrateFromLegacy();
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(APP_STATE_VERSION);
    expect(migrated!.account).toBeDefined();

    const projects = Object.values(migrated!.projects);
    expect(projects).toHaveLength(1);
    const diagrams = Object.values(projects[0].diagrams);
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0].state).toEqual(legacyState);
  });

  it('deletes the legacy key after migration', () => {
    const legacyState = makeValidState();
    localStorage.setItem('layup_diagram', JSON.stringify(legacyState));

    migrateFromLegacy();
    expect(localStorage.getItem('layup_diagram')).toBeNull();
  });

  it('returns null on corrupted legacy data', () => {
    localStorage.setItem('layup_diagram', '{broken');
    expect(migrateFromLegacy()).toBeNull();
  });

  it('returns null when legacy data is not a valid DiagramState', () => {
    localStorage.setItem('layup_diagram', JSON.stringify({ foo: 'bar' }));
    expect(migrateFromLegacy()).toBeNull();
  });
});

// ─── getLocalStorageUsageBytes with AppState ──────────────────────────────────

describe('getLocalStorageUsageBytes with AppState key', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns size from layup_app key', () => {
    const state = createInitialAppState();
    saveAppState(state);
    const bytes = getLocalStorageUsageBytes();
    expect(bytes).toBeGreaterThan(0);
  });

  it('falls back to legacy key if app key missing', () => {
    localStorage.setItem('layup_diagram', JSON.stringify(makeValidState()));
    const bytes = getLocalStorageUsageBytes();
    expect(bytes).toBeGreaterThan(0);
  });
});

// ─── debounce ─────────────────────────────────────────────────────────────────

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the function after the delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('resets the timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(50);
    debounced(); // reset
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('passes arguments to the function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a', 'b');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('a', 'b');
  });
});

// ─── exportDiagramJSON (named exports) ───────────────────────────────────────

describe('exportDiagramJSON', () => {
  let createdAnchor: HTMLAnchorElement | null = null;
  let clickedHref: string | null = null;
  let clickedDownload: string | null = null;

  beforeEach(() => {
    // Stub URL.createObjectURL / revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
    // Capture anchor creation and click
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        createdAnchor = origCreate('a') as HTMLAnchorElement;
        vi.spyOn(createdAnchor, 'click').mockImplementation(() => {
          clickedHref = createdAnchor!.href;
          clickedDownload = createdAnchor!.download;
        });
        return createdAnchor;
      }
      return origCreate(tag);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    createdAnchor = null;
    clickedHref = null;
    clickedDownload = null;
  });

  it('uses "diagram.json" as download filename when name is not provided', () => {
    exportDiagramJSON(makeValidState());
    expect(clickedDownload).toBe('diagram.json');
  });

  it('uses "diagram.json" as fallback when name is undefined', () => {
    exportDiagramJSON(makeValidState(), undefined);
    expect(clickedDownload).toBe('diagram.json');
  });

  it('uses the provided name as the download filename', () => {
    exportDiagramJSON(makeValidState(), 'Payment Service');
    expect(clickedDownload).toBe('Payment Service.json');
  });

  it('appends .json to the name', () => {
    exportDiagramJSON(makeValidState(), 'My Diagram');
    expect(clickedDownload).toBe('My Diagram.json');
  });
});

// ─── extractSubtree ───────────────────────────────────────────────────────────

describe('extractSubtree', () => {
  function makeNestedState(): DiagramState {
    // root → child → grandchild
    return {
      version: SCHEMA_VERSION,
      diagrams: {
        root: {
          id: 'root',
          level: 'context',
          label: 'Root',
          nodes: [{ id: 'n1', type: 'system', label: 'System', x: 0, y: 0, childDiagramId: 'child' } as any],
          edges: [],
        },
        child: {
          id: 'child',
          level: 'container',
          label: 'Child',
          nodes: [{ id: 'n2', type: 'container', label: 'Container', x: 0, y: 0, childDiagramId: 'grandchild' } as any],
          edges: [],
        },
        grandchild: {
          id: 'grandchild',
          level: 'component',
          label: 'Grandchild',
          nodes: [],
          edges: [],
        },
        orphan: {
          id: 'orphan',
          level: 'context',
          label: 'Orphan',
          nodes: [],
          edges: [],
        },
      },
      rootId: 'root',
      navigationStack: ['root'],
      selectedId: null,
      pendingNodeType: null,
    };
  }

  it('returns full state when extracting from root', () => {
    const state = makeNestedState();
    const subtree = extractSubtree(state, 'root');
    expect(Object.keys(subtree.diagrams)).toContain('root');
    expect(Object.keys(subtree.diagrams)).toContain('child');
    expect(Object.keys(subtree.diagrams)).toContain('grandchild');
  });

  it('excludes orphan levels not reachable from root', () => {
    const state = makeNestedState();
    const subtree = extractSubtree(state, 'root');
    expect(Object.keys(subtree.diagrams)).not.toContain('orphan');
  });

  it('re-roots the subtree at the given levelId', () => {
    const state = makeNestedState();
    const subtree = extractSubtree(state, 'child');
    expect(subtree.rootId).toBe('child');
    expect(subtree.navigationStack).toEqual(['child']);
  });

  it('includes only reachable descendants when extracting a sub-level', () => {
    const state = makeNestedState();
    const subtree = extractSubtree(state, 'child');
    expect(Object.keys(subtree.diagrams)).toContain('child');
    expect(Object.keys(subtree.diagrams)).toContain('grandchild');
    expect(Object.keys(subtree.diagrams)).not.toContain('root');
    expect(Object.keys(subtree.diagrams)).not.toContain('orphan');
  });

  it('returns a single-level subtree for a leaf node', () => {
    const state = makeNestedState();
    const subtree = extractSubtree(state, 'grandchild');
    expect(Object.keys(subtree.diagrams)).toEqual(['grandchild']);
    expect(subtree.rootId).toBe('grandchild');
  });

  it('resets selectedId and pendingNodeType', () => {
    const state = makeNestedState();
    const subtree = extractSubtree(state, 'root');
    expect(subtree.selectedId).toBeNull();
    expect(subtree.pendingNodeType).toBeNull();
  });

  it('preserves the schema version', () => {
    const state = makeNestedState();
    const subtree = extractSubtree(state, 'child');
    expect(subtree.version).toBe(SCHEMA_VERSION);
  });

  it('handles a missing rootLevelId gracefully (returns empty diagrams)', () => {
    const state = makeNestedState();
    const subtree = extractSubtree(state, 'nonexistent');
    expect(Object.keys(subtree.diagrams)).toHaveLength(0);
    expect(subtree.rootId).toBe('nonexistent');
  });
});
