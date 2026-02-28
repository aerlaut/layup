import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { appState, appView, syncDiagramToApp, loadAppState as setAppState, createInitialAppState } from './stores/appStore';
import { diagramStore } from './stores/diagramStore';
import {
  loadAppState,
  migrateFromLegacy,
  saveAppState,
  debounce,
} from './utils/persistence';
import { get } from 'svelte/store';

// ─── Bootstrap: load or migrate persisted state ───────────────────────────────

let initialState = loadAppState();
if (!initialState) {
  initialState = migrateFromLegacy();
}
if (initialState) {
  setAppState(initialState);
} else {
  // Fresh install — createInitialAppState() is already the default
  setAppState(createInitialAppState());
}

// ─── Auto-save AppState on every change (debounced 500ms) ─────────────────────

const debouncedSaveApp = debounce((state: unknown) => {
  saveAppState(state as Parameters<typeof saveAppState>[0]);
}, 500);

appState.subscribe((state) => {
  debouncedSaveApp(state);
});

// ─── Sync diagramStore → appState when editing (debounced 500ms) ──────────────

const debouncedSync = debounce(() => {
  const view = get(appView);
  if (view.screen === 'editor') {
    syncDiagramToApp();
  }
}, 500);

diagramStore.subscribe(() => {
  debouncedSync();
});

// ─── Mount ────────────────────────────────────────────────────────────────────

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
