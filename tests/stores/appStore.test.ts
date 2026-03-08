import { get } from 'svelte/store';
import {
  appState,
  appView,
  projectList,
  activeProject,
  activeDiagram,
  createInitialAppState,
  createProject,
  renameProject,
  deleteProject,
  createDiagram,
  renameDiagram,
  deleteDiagram,
  duplicateDiagram,
  openDiagram,
  goHome,
  syncDiagramToApp,
  updateAccount,
  resetAppState,
  loadAppState,
} from '../../src/stores/appStore';
import { APP_STATE_VERSION } from '../../src/utils/constants';
import { diagramStore, addNode, resetDiagram } from '../../src/stores/diagramStore';
import type { AppState, C4Node } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAppState(): AppState {
  return get(appState);
}

function getFirstProjectId(): string {
  return Object.keys(getAppState().projects)[0];
}

function getFirstDiagramId(projectId: string): string {
  return Object.keys(getAppState().projects[projectId].diagrams)[0];
}

function makeNode(overrides: Partial<C4Node> = {}): C4Node {
  return {
    id: `node-${Math.random().toString(36).slice(2, 8)}`,
    type: 'system',
    label: 'Test Node',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetAppState();
});

// ── createInitialAppState ─────────────────────────────────────────────────────

describe('createInitialAppState', () => {
  it('returns valid structure with default account, project, and diagram', () => {
    const state = createInitialAppState();
    expect(state.version).toBe(APP_STATE_VERSION);
    expect(state.account).toBeDefined();
    expect(state.account.name).toBe('Local User');

    const projects = Object.values(state.projects);
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('My Project');

    const diagrams = Object.values(projects[0].diagrams);
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0].name).toBe('Untitled Diagram');
    expect(diagrams[0].state.currentLevel).toBe('context');
  });
});

// ── Account ───────────────────────────────────────────────────────────────────

describe('updateAccount', () => {
  it('updates account name', () => {
    updateAccount({ name: 'Alice' });
    expect(getAppState().account.name).toBe('Alice');
  });

  it('updates updatedAt', () => {
    const before = getAppState().account.updatedAt;
    updateAccount({ name: 'Bob' });
    expect(getAppState().account.updatedAt).toBeGreaterThanOrEqual(before);
  });
});

// ── Project CRUD ──────────────────────────────────────────────────────────────

describe('createProject', () => {
  it('adds a project with auto-generated name', () => {
    const beforeCount = Object.keys(getAppState().projects).length;
    const id = createProject();
    const state = getAppState();
    expect(Object.keys(state.projects)).toHaveLength(beforeCount + 1);
    expect(state.projects[id].name).toMatch(/^Untitled Project/);
  });

  it('uses provided name', () => {
    const id = createProject('My Custom Project');
    expect(getAppState().projects[id].name).toBe('My Custom Project');
  });

  it('returns the new project ID', () => {
    const id = createProject();
    expect(id).toBeDefined();
    expect(getAppState().projects[id]).toBeDefined();
  });
});

describe('renameProject', () => {
  it('updates the project name', () => {
    const projectId = getFirstProjectId();
    renameProject(projectId, 'Renamed');
    expect(getAppState().projects[projectId].name).toBe('Renamed');
  });

  it('updates updatedAt', () => {
    const projectId = getFirstProjectId();
    const before = getAppState().projects[projectId].updatedAt;
    renameProject(projectId, 'Renamed');
    expect(getAppState().projects[projectId].updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('does nothing for non-existent project', () => {
    const before = getAppState();
    renameProject('nonexistent', 'X');
    expect(getAppState()).toEqual(before);
  });
});

describe('deleteProject', () => {
  it('removes the project', () => {
    const projectId = getFirstProjectId();
    deleteProject(projectId);
    expect(getAppState().projects[projectId]).toBeUndefined();
  });

  it('navigates home if active editor was in deleted project', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);
    expect(get(appView).screen).toBe('editor');
    deleteProject(projectId);
    expect(get(appView).screen).toBe('home');
  });

  it('does nothing for non-existent project', () => {
    const before = getAppState();
    deleteProject('nonexistent');
    expect(getAppState()).toEqual(before);
  });
});

// ── Diagram CRUD ──────────────────────────────────────────────────────────────

describe('createDiagram', () => {
  it('adds a diagram to the project', () => {
    const projectId = getFirstProjectId();
    const beforeCount = Object.keys(getAppState().projects[projectId].diagrams).length;
    const id = createDiagram(projectId);
    expect(id).not.toBeNull();
    expect(Object.keys(getAppState().projects[projectId].diagrams)).toHaveLength(beforeCount + 1);
  });

  it('auto-names with incrementing number', () => {
    const projectId = getFirstProjectId();
    const id = createDiagram(projectId);
    expect(getAppState().projects[projectId].diagrams[id!].name).toMatch(/^Untitled Diagram/);
  });

  it('uses provided name', () => {
    const projectId = getFirstProjectId();
    const id = createDiagram(projectId, 'Custom Diagram');
    expect(getAppState().projects[projectId].diagrams[id!].name).toBe('Custom Diagram');
  });

  it('returns null for non-existent project', () => {
    const id = createDiagram('nonexistent');
    expect(id).toBeNull();
  });

  it('creates diagram with fresh DiagramState', () => {
    const projectId = getFirstProjectId();
    const id = createDiagram(projectId)!;
    const diagram = getAppState().projects[projectId].diagrams[id];
    expect(diagram.state.currentLevel).toBe('context');
    expect(diagram.state.levels['context'].nodes).toHaveLength(0);
  });
});

describe('renameDiagram', () => {
  it('updates the diagram name', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    renameDiagram(projectId, diagramId, 'Renamed Diagram');
    expect(getAppState().projects[projectId].diagrams[diagramId].name).toBe('Renamed Diagram');
  });

  it('updates updatedAt on both diagram and project', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    const beforeProj = getAppState().projects[projectId].updatedAt;
    const beforeDiag = getAppState().projects[projectId].diagrams[diagramId].updatedAt;
    renameDiagram(projectId, diagramId, 'New Name');
    expect(getAppState().projects[projectId].updatedAt).toBeGreaterThanOrEqual(beforeProj);
    expect(getAppState().projects[projectId].diagrams[diagramId].updatedAt).toBeGreaterThanOrEqual(beforeDiag);
  });

  it('does nothing for non-existent diagram', () => {
    const projectId = getFirstProjectId();
    const before = getAppState();
    renameDiagram(projectId, 'nonexistent', 'X');
    expect(getAppState()).toEqual(before);
  });
});

describe('deleteDiagram', () => {
  it('removes the diagram', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    deleteDiagram(projectId, diagramId);
    expect(getAppState().projects[projectId].diagrams[diagramId]).toBeUndefined();
  });

  it('navigates home if active editor was this diagram', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);
    expect(get(appView).screen).toBe('editor');
    deleteDiagram(projectId, diagramId);
    expect(get(appView).screen).toBe('home');
  });

  it('does nothing for non-existent diagram', () => {
    const projectId = getFirstProjectId();
    const before = getAppState();
    deleteDiagram(projectId, 'nonexistent');
    expect(getAppState()).toEqual(before);
  });
});

describe('duplicateDiagram', () => {
  it('creates a copy with new ID and "Copy of" name', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    const originalName = getAppState().projects[projectId].diagrams[diagramId].name;
    const newId = duplicateDiagram(projectId, diagramId);
    expect(newId).not.toBeNull();
    expect(newId).not.toBe(diagramId);
    const copy = getAppState().projects[projectId].diagrams[newId!];
    expect(copy.name).toBe(`Copy of ${originalName}`);
  });

  it('deep clones the state', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    const newId = duplicateDiagram(projectId, diagramId)!;
    const original = getAppState().projects[projectId].diagrams[diagramId];
    const copy = getAppState().projects[projectId].diagrams[newId];
    expect(copy.state).toEqual(original.state);
    expect(copy.state).not.toBe(original.state);
  });

  it('returns null for non-existent project', () => {
    expect(duplicateDiagram('nonexistent', 'x')).toBeNull();
  });

  it('returns null for non-existent diagram', () => {
    const projectId = getFirstProjectId();
    expect(duplicateDiagram(projectId, 'nonexistent')).toBeNull();
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe('openDiagram', () => {
  it('sets appView to editor', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);
    const view = get(appView);
    expect(view.screen).toBe('editor');
    if (view.screen === 'editor') {
      expect(view.projectId).toBe(projectId);
      expect(view.diagramId).toBe(diagramId);
    }
  });

  it('loads the diagram state into diagramStore', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);
    const ds = get(diagramStore);
    expect(ds.currentLevel).toBe('context');
  });

  it('does nothing for non-existent project', () => {
    const before = get(appView);
    openDiagram('nonexistent', 'x');
    expect(get(appView)).toEqual(before);
  });

  it('does nothing for non-existent diagram', () => {
    const projectId = getFirstProjectId();
    const before = get(appView);
    openDiagram(projectId, 'nonexistent');
    expect(get(appView)).toEqual(before);
  });
});

describe('goHome', () => {
  it('sets appView to home', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);
    goHome();
    expect(get(appView).screen).toBe('home');
  });

  it('syncs diagramStore back to appState before going home', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);

    // Add a node via diagramStore
    const node = makeNode({ id: 'test-node-1' });
    addNode(node);

    goHome();

    // The node should be persisted in appState
    const diagram = getAppState().projects[projectId].diagrams[diagramId];
    expect(diagram.state.levels['context'].nodes.some((n) => n.id === 'test-node-1')).toBe(true);
  });
});

// ── Sync ──────────────────────────────────────────────────────────────────────

describe('syncDiagramToApp', () => {
  it('writes diagramStore value into active DiagramMeta.state', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);

    const node = makeNode({ id: 'sync-node' });
    addNode(node);
    syncDiagramToApp();

    const diagram = getAppState().projects[projectId].diagrams[diagramId];
    expect(diagram.state.levels['context'].nodes.some((n) => n.id === 'sync-node')).toBe(true);
  });

  it('does nothing when not in editor mode', () => {
    const before = getAppState();
    syncDiagramToApp();
    // Should not throw and state should be unchanged structurally
    expect(getAppState().version).toBe(before.version);
  });

  it('updates updatedAt on diagram and project', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);

    const beforeDiag = getAppState().projects[projectId].diagrams[diagramId].updatedAt;
    const beforeProj = getAppState().projects[projectId].updatedAt;

    addNode(makeNode());
    syncDiagramToApp();

    expect(getAppState().projects[projectId].diagrams[diagramId].updatedAt).toBeGreaterThanOrEqual(beforeDiag);
    expect(getAppState().projects[projectId].updatedAt).toBeGreaterThanOrEqual(beforeProj);
  });
});

// ── Derived stores ────────────────────────────────────────────────────────────

describe('projectList', () => {
  it('returns projects sorted by updatedAt desc', () => {
    const id1 = createProject('First');
    const id2 = createProject('Second');
    // Rename to bump updatedAt on First
    renameProject(id1, 'First Updated');

    const list = get(projectList);
    const names = list.map((p) => p.name);
    // 'First Updated' should be first (most recently updated)
    expect(names.indexOf('First Updated')).toBeLessThan(names.indexOf('Second'));
  });
});

describe('activeProject', () => {
  it('returns null when on home screen', () => {
    expect(get(activeProject)).toBeNull();
  });

  it('returns the active project when in editor', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);
    expect(get(activeProject)?.id).toBe(projectId);
  });
});

describe('activeDiagram', () => {
  it('returns null when on home screen', () => {
    expect(get(activeDiagram)).toBeNull();
  });

  it('returns the active diagram when in editor', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);
    expect(get(activeDiagram)?.id).toBe(diagramId);
  });
});

// ── loadAppState ──────────────────────────────────────────────────────────────

describe('loadAppState', () => {
  it('replaces the entire app state', () => {
    const custom = createInitialAppState();
    custom.account.name = 'Custom User';
    loadAppState(custom);
    expect(getAppState().account.name).toBe('Custom User');
  });

  it('resets appView to home', () => {
    const projectId = getFirstProjectId();
    const diagramId = getFirstDiagramId(projectId);
    openDiagram(projectId, diagramId);
    loadAppState(createInitialAppState());
    expect(get(appView).screen).toBe('home');
  });
});
