import { writable, derived, get } from 'svelte/store';
import type { Account, AppState, AppView, DiagramMeta, Project } from '../types';
import { diagramStore, loadDiagram, resetDiagram, SCHEMA_VERSION, createInitialDiagramState } from './diagramStore';
import { generateId } from '../utils/id';
import { APP_STATE_VERSION } from '../utils/constants';
export { APP_STATE_VERSION };

function createDefaultAccount(): Account {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Local User',
    createdAt: now,
    updatedAt: now,
  };
}



export function createInitialAppState(): AppState {
  const now = Date.now();
  const account = createDefaultAccount();
  const diagramId = generateId();
  const projectId = generateId();

  const diagram: DiagramMeta = {
    id: diagramId,
    name: 'Untitled Diagram',
    createdAt: now,
    updatedAt: now,
    state: createInitialDiagramState(),
  };

  const project: Project = {
    id: projectId,
    name: 'My Project',
    createdAt: now,
    updatedAt: now,
    diagrams: { [diagramId]: diagram },
  };

  return {
    version: APP_STATE_VERSION,
    account,
    projects: { [projectId]: project },
  };
}

// ─── Stores ───────────────────────────────────────────────────────────────────

export const appState = writable<AppState>(createInitialAppState());
export const appView = writable<AppView>({ screen: 'home' });

// ─── Derived stores ───────────────────────────────────────────────────────────

/** All projects sorted by updatedAt descending */
export const projectList = derived(appState, ($s) =>
  Object.values($s.projects).sort((a, b) => b.updatedAt - a.updatedAt)
);

/** The currently active project (when in editor mode), or null */
export const activeProject = derived([appState, appView], ([$s, $v]) => {
  if ($v.screen !== 'editor') return null;
  return $s.projects[$v.projectId] ?? null;
});

/** The currently active diagram meta (when in editor mode), or null */
export const activeDiagram = derived([appState, appView], ([$s, $v]) => {
  if ($v.screen !== 'editor') return null;
  const project = $s.projects[$v.projectId];
  if (!project) return null;
  return project.diagrams[$v.diagramId] ?? null;
});

// ─── Account actions ──────────────────────────────────────────────────────────

export function updateAccount(patch: Partial<Account>): void {
  appState.update((s) => ({
    ...s,
    account: { ...s.account, ...patch, updatedAt: Date.now() },
  }));
}

// ─── Project actions ──────────────────────────────────────────────────────────

export function createProject(name?: string): string {
  const id = generateId();
  const now = Date.now();
  const state = get(appState);
  const existingCount = Object.keys(state.projects).length;
  const project: Project = {
    id,
    name: name ?? `Untitled Project ${existingCount + 1}`,
    createdAt: now,
    updatedAt: now,
    diagrams: {},
  };
  appState.update((s) => ({
    ...s,
    projects: { ...s.projects, [id]: project },
  }));
  return id;
}

export function renameProject(projectId: string, name: string): void {
  appState.update((s) => {
    const project = s.projects[projectId];
    if (!project) return s;
    return {
      ...s,
      projects: {
        ...s.projects,
        [projectId]: { ...project, name, updatedAt: Date.now() },
      },
    };
  });
}

export function deleteProject(projectId: string): void {
  appState.update((s) => {
    if (!s.projects[projectId]) return s;
    const { [projectId]: _, ...rest } = s.projects;
    return { ...s, projects: rest };
  });
  // If the active editor was in this project, go home
  const view = get(appView);
  if (view.screen === 'editor' && view.projectId === projectId) {
    appView.set({ screen: 'home' });
  }
}

// ─── Diagram actions ──────────────────────────────────────────────────────────

export function createDiagram(projectId: string, name?: string): string | null {
  const state = get(appState);
  const project = state.projects[projectId];
  if (!project) return null;

  const id = generateId();
  const now = Date.now();
  const existingCount = Object.keys(project.diagrams).length;
  const diagram: DiagramMeta = {
    id,
    name: name ?? `Untitled Diagram ${existingCount + 1}`,
    createdAt: now,
    updatedAt: now,
    state: createInitialDiagramState(),
  };

  appState.update((s) => {
    const proj = s.projects[projectId];
    if (!proj) return s;
    return {
      ...s,
      projects: {
        ...s.projects,
        [projectId]: {
          ...proj,
          updatedAt: now,
          diagrams: { ...proj.diagrams, [id]: diagram },
        },
      },
    };
  });
  return id;
}

export function renameDiagram(projectId: string, diagramId: string, name: string): void {
  appState.update((s) => {
    const project = s.projects[projectId];
    if (!project) return s;
    const diagram = project.diagrams[diagramId];
    if (!diagram) return s;
    const now = Date.now();
    return {
      ...s,
      projects: {
        ...s.projects,
        [projectId]: {
          ...project,
          updatedAt: now,
          diagrams: {
            ...project.diagrams,
            [diagramId]: { ...diagram, name, updatedAt: now },
          },
        },
      },
    };
  });
}

export function deleteDiagram(projectId: string, diagramId: string): void {
  appState.update((s) => {
    const project = s.projects[projectId];
    if (!project) return s;
    if (!project.diagrams[diagramId]) return s;
    const { [diagramId]: _, ...restDiagrams } = project.diagrams;
    return {
      ...s,
      projects: {
        ...s.projects,
        [projectId]: {
          ...project,
          updatedAt: Date.now(),
          diagrams: restDiagrams,
        },
      },
    };
  });
  // If the active editor was this diagram, go home
  const view = get(appView);
  if (view.screen === 'editor' && view.projectId === projectId && view.diagramId === diagramId) {
    appView.set({ screen: 'home' });
  }
}

export function duplicateDiagram(projectId: string, diagramId: string): string | null {
  const state = get(appState);
  const project = state.projects[projectId];
  if (!project) return null;
  const original = project.diagrams[diagramId];
  if (!original) return null;

  const newId = generateId();
  const now = Date.now();
  const copy: DiagramMeta = {
    id: newId,
    name: `Copy of ${original.name}`,
    createdAt: now,
    updatedAt: now,
    state: structuredClone(original.state),
  };

  appState.update((s) => {
    const proj = s.projects[projectId];
    if (!proj) return s;
    return {
      ...s,
      projects: {
        ...s.projects,
        [projectId]: {
          ...proj,
          updatedAt: now,
          diagrams: { ...proj.diagrams, [newId]: copy },
        },
      },
    };
  });
  return newId;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export function openDiagram(projectId: string, diagramId: string): void {
  const state = get(appState);
  const project = state.projects[projectId];
  if (!project) return;
  const diagram = project.diagrams[diagramId];
  if (!diagram) return;

  // Sync current editor state back before switching
  const currentView = get(appView);
  if (currentView.screen === 'editor') {
    syncDiagramToApp();
  }

  loadDiagram(diagram.state);
  appView.set({ screen: 'editor', projectId, diagramId });
}

export function goHome(): void {
  const currentView = get(appView);
  if (currentView.screen === 'editor') {
    syncDiagramToApp();
  }
  appView.set({ screen: 'home' });
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

/** Writes the current diagramStore value back into the active DiagramMeta in appState */
export function syncDiagramToApp(): void {
  const view = get(appView);
  if (view.screen !== 'editor') return;

  const diagramState = get(diagramStore);
  const now = Date.now();

  appState.update((s) => {
    const project = s.projects[view.projectId];
    if (!project) return s;
    const diagram = project.diagrams[view.diagramId];
    if (!diagram) return s;
    return {
      ...s,
      projects: {
        ...s.projects,
        [view.projectId]: {
          ...project,
          updatedAt: now,
          diagrams: {
            ...project.diagrams,
            [view.diagramId]: {
              ...diagram,
              updatedAt: now,
              state: diagramState,
            },
          },
        },
      },
    };
  });
}

// ─── Reset (for testing) ─────────────────────────────────────────────────────

export function resetAppState(): void {
  appState.set(createInitialAppState());
  appView.set({ screen: 'home' });
  resetDiagram();
}

/** Load a full AppState (e.g. from persistence) */
export function loadAppState(state: AppState): void {
  appState.set(state);
  appView.set({ screen: 'home' });
}
