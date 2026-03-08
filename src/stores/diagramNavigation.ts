import type { C4LevelType } from '../types';
import { diagramStore } from './diagramStore';

// ─── Level order helpers ──────────────────────────────────────────────────────

export const LEVEL_ORDER: C4LevelType[] = ['context', 'container', 'component', 'code'];

export const LEVEL_LABELS: Record<C4LevelType, string> = {
  context:   'Context',
  container: 'Container',
  component: 'Component',
  code:      'Code',
};

export function nextLevel(level: C4LevelType): C4LevelType | undefined {
  const idx = LEVEL_ORDER.indexOf(level);
  return LEVEL_ORDER[idx + 1];
}

export function prevLevel(level: C4LevelType): C4LevelType | undefined {
  const idx = LEVEL_ORDER.indexOf(level);
  return idx > 0 ? LEVEL_ORDER[idx - 1] : undefined;
}

// ─── Navigation actions ───────────────────────────────────────────────────────

export function drillDown(): void {
  diagramStore.update((s) => {
    const next = nextLevel(s.currentLevel);
    if (!next) return s;
    return { ...s, currentLevel: next, selectedId: null };
  });
}

export function drillUp(): void {
  diagramStore.update((s) => {
    const prev = prevLevel(s.currentLevel);
    if (!prev) return s;
    return { ...s, currentLevel: prev, selectedId: null };
  });
}

export function navigateTo(level: C4LevelType): void {
  diagramStore.update((s) => {
    if (!s.levels[level]) return s;
    return { ...s, currentLevel: level, selectedId: null };
  });
}
