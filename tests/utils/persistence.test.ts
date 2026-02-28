import {
  saveToLocalStorage,
  loadFromLocalStorage,
  getLocalStorageUsageBytes,
  isNearStorageLimit,
  parseDiagramJSON,
  ImportError,
  debounce,
} from '../../src/utils/persistence';
import { SCHEMA_VERSION } from '../../src/stores/diagramStore';
import type { DiagramState } from '../../src/types';

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
    focusedParentNodeId: null,
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
    expect(() => parseDiagramJSON(JSON.stringify(obj))).toThrow('Please upgrade laverop.');
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
});

// ─── localStorage round-trip ──────────────────────────────────────────────────

describe('saveToLocalStorage / loadFromLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a DiagramState', () => {
    const state = makeValidState();
    saveToLocalStorage(state);
    const loaded = loadFromLocalStorage();
    expect(loaded).toEqual(state);
  });

  it('returns null when nothing is stored', () => {
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns null on corrupted data', () => {
    localStorage.setItem('laverop_diagram', '{broken json');
    expect(loadFromLocalStorage()).toBeNull();
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
    const state = makeValidState();
    saveToLocalStorage(state);
    const bytes = getLocalStorageUsageBytes();
    expect(bytes).toBeGreaterThan(0);
  });
});

describe('isNearStorageLimit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false for small data', () => {
    saveToLocalStorage(makeValidState());
    expect(isNearStorageLimit()).toBe(false);
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
