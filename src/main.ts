import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { diagramStore, loadDiagram } from './stores/diagramStore';
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  debounce,
} from './utils/persistence';

// Restore saved state on init
const saved = loadFromLocalStorage();
if (saved) {
  loadDiagram(saved);
}

// Auto-save on every store change (debounced 500ms)
const debouncedSave = debounce((state: unknown) => {
  saveToLocalStorage(state as Parameters<typeof saveToLocalStorage>[0]);
}, 500);

diagramStore.subscribe((state) => {
  debouncedSave(state);
});

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
