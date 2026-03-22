import {
  saveAppState,
  loadAppState,
  migrateFromLegacy,
  getLocalStorageUsageBytes,
  isNearStorageLimit,
  exportDiagramJSON,
  parseDiagramJSON,
  ImportError,
  debounce,
} from '../../src/utils/persistence';
import { SCHEMA_VERSION } from '../../src/stores/diagramStore';
import { createInitialAppState } from '../../src/stores/appStore';
import { APP_STATE_VERSION } from '../../src/utils/constants';
import type { AppState, DiagramState } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Valid v2 DiagramState for tests that need a well-formed diagram. */
function makeValidState(overrides: Partial<DiagramState> = {}): DiagramState {
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

/** v1 legacy format for migrateFromLegacy tests. */
function makeLegacyV1State() {
  return {
    version: 1,
    diagrams: {
      root: {
        id: 'root',
        level: 'context',
        label: 'System Context',
        nodes: [],
        edges: [],
        annotations: [],
      },
    },
    rootId: 'root',
    navigationStack: ['root'],
    selectedId: null,
    pendingNodeType: null,
  };
}

// ─── parseDiagramJSON ─────────────────────────────────────────────────────────

describe('parseDiagramJSON', () => {
  it('parses valid v2 JSON and returns DiagramState', () => {
    const state = makeValidState();
    const result = parseDiagramJSON(JSON.stringify(state));
    expect(result.version).toBe(SCHEMA_VERSION);
    expect(result.levels).toBeDefined();
    expect(result.levels['context']).toBeDefined();
  });

  it('migrates v1 JSON to v2 format', () => {
    const legacy = makeLegacyV1State();
    const result = parseDiagramJSON(JSON.stringify(legacy));
    expect(result.version).toBe(SCHEMA_VERSION);
    expect(result.levels).toBeDefined();
    expect(result.currentLevel).toBe('context');
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
    const obj = { levels: {}, currentLevel: 'context' };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Missing or invalid "version" field.');
  });

  it('throws ImportError when version is not a number', () => {
    const obj = { version: 'abc', levels: {}, currentLevel: 'context' };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Missing or invalid "version" field.');
  });

  it('throws ImportError when version is newer than current schema', () => {
    const obj = { version: SCHEMA_VERSION + 1, levels: {}, currentLevel: 'context' };
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Please upgrade layup.');
  });

  it('throws ImportError for structurally invalid data (schema validation)', () => {
    const bad = JSON.stringify({
      version: SCHEMA_VERSION,
      levels: { context: { level: 'context', nodes: 'WRONG', edges: [], annotations: [] } },
      currentLevel: 'context',
      selectedId: null,
      pendingNodeType: null,
    });
    expect(() => parseDiagramJSON(bad)).toThrow(ImportError);
    expect(() => parseDiagramJSON(bad)).toThrow('Invalid diagram structure:');
  });

  it('throws ImportError when levels is missing in v2 format', () => {
    const bad = JSON.stringify({ version: SCHEMA_VERSION, currentLevel: 'context', selectedId: null, pendingNodeType: null });
    expect(() => parseDiagramJSON(bad)).toThrow(ImportError);
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

  it('wraps legacy v1 DiagramState in an AppState with migrated v2 diagram', () => {
    const legacyState = makeLegacyV1State();
    localStorage.setItem('layup_diagram', JSON.stringify(legacyState));

    const migrated = migrateFromLegacy();
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(APP_STATE_VERSION);
    expect(migrated!.account).toBeDefined();

    const projects = Object.values(migrated!.projects);
    expect(projects).toHaveLength(1);
    const diagrams = Object.values(projects[0]!.diagrams);
    expect(diagrams).toHaveLength(1);
    // Legacy v1 is migrated to v2 format
    expect(diagrams[0]!.state.version).toBe(SCHEMA_VERSION);
    expect(diagrams[0]!.state.levels).toBeDefined();
  });

  it('deletes the legacy key after migration', () => {
    const legacyState = makeLegacyV1State();
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

// ─── exportDiagramJSON ───────────────────────────────────────────────────────

describe('exportDiagramJSON', () => {
  let createdAnchor: HTMLAnchorElement | null = null;
  let clickedDownload: string | null = null;

  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        createdAnchor = origCreate('a') as HTMLAnchorElement;
        vi.spyOn(createdAnchor, 'click').mockImplementation(() => {
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
