# Plan: Account → Project → Diagram Management with Home Screen

## Summary

Add a multi-level data hierarchy (Account → Projects → Diagrams) and a dedicated home screen for managing projects and diagrams. Clicking a diagram opens the existing editor. The existing `diagramStore` and all canvas/element components remain untouched.

---

## Data Model

### New types added to `src/types.ts`

```
Account
  ├── id: string (UUID)
  ├── name: string
  ├── email?: string         (future auth)
  ├── createdAt: number
  └── updatedAt: number

Project
  ├── id: string (UUID)
  ├── name: string
  ├── createdAt: number
  ├── updatedAt: number
  └── diagrams: Record<string, DiagramMeta>

DiagramMeta
  ├── id: string (UUID)
  ├── name: string
  ├── createdAt: number
  ├── updatedAt: number
  └── state: DiagramState    (existing type, unchanged)

AppState
  ├── version: number
  ├── account: Account
  └── projects: Record<string, Project>

AppView (discriminated union)
  ├── { screen: 'home' }
  └── { screen: 'editor', projectId: string, diagramId: string }
```

The existing `DiagramState`, `DiagramLevel`, `C4Node`, `C4Edge`, and all related types are **unchanged**.

---

## File Changes Overview

| File | Status | Description |
|------|--------|-------------|
| `src/types.ts` | MODIFY | Add `Account`, `Project`, `DiagramMeta`, `AppState`, `AppView` |
| `src/stores/appStore.ts` | NEW | App-level store: project/diagram CRUD, view routing, sync |
| `src/stores/diagramStore.ts` | UNCHANGED | — |
| `src/utils/persistence.ts` | MODIFY | Save/load `AppState`; migrate from old `laverop_diagram` key |
| `src/components/Shell.svelte` | NEW | Top-level router: home screen vs editor |
| `src/screens/HomeScreen.svelte` | NEW | Full-screen project/diagram management |
| `src/screens/ProjectCard.svelte` | NEW | Single project card with diagram grid |
| `src/screens/DiagramCard.svelte` | NEW | Single diagram card (click to open) |
| `src/components/ConfirmDialog.svelte` | NEW | Reusable inline delete confirmation |
| `src/components/Toolbar.svelte` | MODIFY | Add ← Home button; show project + diagram name |
| `src/components/BreadcrumbBar.svelte` | MODIFY | Prepend project name and diagram name before level crumbs |
| `src/App.svelte` | MODIFY | Replace body with `<Shell />` |
| `src/main.ts` | MODIFY | Bootstrap `appStore`; auto-save `AppState` |
| `src/app.css` | MODIFY | Add CSS variables and base styles for home screen |
| `tests/stores/appStore.test.ts` | NEW | Tests for all appStore actions |
| `tests/utils/persistence.test.ts` | MODIFY | Add tests for AppState save/load and migration |
| All canvas/element components | UNCHANGED | — |

---

## Tasks

### Task 1: Types
**File:** `src/types.ts`

Add the following types (appending to existing file, no modifications to existing types):

- `Account` — `{ id, name, email?, createdAt, updatedAt }`
- `DiagramMeta` — `{ id, name, createdAt, updatedAt, state: DiagramState }`
- `Project` — `{ id, name, createdAt, updatedAt, diagrams: Record<string, DiagramMeta> }`
- `AppState` — `{ version, account: Account, projects: Record<string, Project> }`
- `AppView` — discriminated union: `{ screen: 'home' } | { screen: 'editor', projectId: string, diagramId: string }`

### Task 2: App Store
**File:** `src/stores/appStore.ts` (new)

Create a Svelte writable store for `AppState` and a separate writable for `AppView`.

**Exported stores:**
- `appState` — `writable<AppState>`
- `appView` — `writable<AppView>` (initial: `{ screen: 'home' }`)

**Exported actions:**

Account:
- `updateAccount(patch: Partial<Account>)` — update account name/email

Projects:
- `createProject(name?: string)` — creates project with auto-name "Untitled Project N", returns project ID
- `renameProject(projectId: string, name: string)` — updates project name + updatedAt
- `deleteProject(projectId: string)` — removes project and all its diagrams; if active diagram was in this project, navigates home

Diagrams:
- `createDiagram(projectId: string, name?: string)` — creates diagram with fresh `DiagramState` (via `createInitialState()`), auto-names "Untitled Diagram N", returns diagram ID
- `renameDiagram(projectId: string, diagramId: string, name: string)` — updates diagram name + updatedAt
- `deleteDiagram(projectId: string, diagramId: string)` — removes diagram; if it was active, navigates home
- `duplicateDiagram(projectId: string, diagramId: string)` — deep clones diagram with new ID and name "Copy of X"

Navigation:
- `openDiagram(projectId: string, diagramId: string)` — sets `appView` to editor; loads `DiagramMeta.state` into `diagramStore` via `loadDiagram()`
- `goHome()` — syncs current `diagramStore` state back into `appState` (if an editor is open); sets `appView` to `{ screen: 'home' }`

Sync:
- `syncDiagramToApp()` — reads current `diagramStore` value and writes it back into the active `DiagramMeta.state` in `appState`; also updates `updatedAt` timestamp. Called by a debounced `diagramStore` subscription (only when `appView` is in editor mode).

**Selectors / derived stores:**
- `projectList` — `derived(appState, ...)` → sorted array of `Project` objects (most recently updated first)
- `activeProject` — `derived([appState, appView], ...)` → current `Project | null`
- `activeDiagram` — `derived([appState, appView], ...)` → current `DiagramMeta | null`

**Helper:**
- `createInitialAppState()` — returns a fresh `AppState` with a default local account, one default project "My Project", and one default diagram "Untitled Diagram" inside it.

**Note:** `diagramStore` is imported but never modified structurally. Only `loadDiagram()` and `resetDiagram()` (existing exports) are called.

### Task 3: Persistence Migration
**File:** `src/utils/persistence.ts` (modify)

**Changes:**
1. Add new localStorage key constant: `STORAGE_KEY_APP = 'laverop_app'`
2. Keep old key constant: `STORAGE_KEY = 'laverop_diagram'` (for migration)
3. Add `saveAppState(state: AppState): void` — saves to `laverop_app`
4. Add `loadAppState(): AppState | null` — loads from `laverop_app`
5. Add `migrateFromLegacy(): AppState | null` — checks if `laverop_diagram` exists; if so, wraps it in a default `Account` + `Project` + `DiagramMeta`; deletes the old key; returns the new `AppState`
6. Update `getLocalStorageUsageBytes()` and `isNearStorageLimit()` to check the new key
7. Keep existing `exportDiagramJSON` / `importDiagramJSON` / `parseDiagramJSON` unchanged (they operate on `DiagramState` which is still what gets exported per-diagram)
8. Add `parseAppStateJSON(text: string): AppState` for future full-app import (optional, low priority)

**Existing functions `saveToLocalStorage` / `loadFromLocalStorage`** — keep for backward compat but mark as deprecated; they are no longer called from `main.ts`.

### Task 4: Home Screen Components
**Files:** `src/screens/HomeScreen.svelte`, `src/screens/ProjectCard.svelte`, `src/screens/DiagramCard.svelte`, `src/components/ConfirmDialog.svelte`

#### `HomeScreen.svelte`
Full-screen layout:
- Top bar: "laverop" title on left, account name on right
- Body: scrollable list of `ProjectCard` components
- Footer area: "+ New Project" button
- Empty state: friendly message + "Create your first project" button when no projects exist

#### `ProjectCard.svelte`
Props: `project: Project`

- Collapsible card with project name as header
- Project name is inline-editable (double-click or pencil icon)
- "⋯" menu on header → Rename, Delete
- Delete triggers `ConfirmDialog`
- Body: grid of `DiagramCard` components (2-3 columns depending on width)
- "+ New Diagram" card at end of grid

#### `DiagramCard.svelte`
Props: `projectId: string`, `diagram: DiagramMeta`

- Clickable card — click → `openDiagram(projectId, diagram.id)`
- Shows diagram name (inline-editable on double-click)
- Shows "Updated X ago" relative timestamp
- "⋯" menu → Rename, Duplicate, Delete
- Delete triggers `ConfirmDialog`
- Visual: simple bordered card with subtle hover effect

#### `ConfirmDialog.svelte`
Props: `message: string`, `confirmLabel?: string`, `onConfirm: () => void`, `onCancel: () => void`

- Inline confirmation banner (not a modal overlay)
- Red-tinted background, "Cancel" and "Delete" buttons
- Reusable across project and diagram deletion

### Task 5: Shell Router
**File:** `src/components/Shell.svelte` (new)

Simple conditional renderer based on `appView` store:
- `screen === 'home'` → renders `<HomeScreen />`
- `screen === 'editor'` → renders the existing editor layout (toolbar + palette + canvas + panel) — this is the current `App.svelte` body

**File:** `src/App.svelte` (modify)

Replace the current body with `<Shell />`. Move the storage warning and import error banners into `Shell.svelte` (they only apply in editor mode).

### Task 6: Toolbar & Breadcrumb Updates
**File:** `src/components/Toolbar.svelte` (modify)

Changes:
- Add a "← Home" button (always visible, replaces `← Back` when at root level of a diagram)
- When in editor: show project name and diagram name in the toolbar left section, before the breadcrumb trail
- `← Back` still works for drill-up within levels; `← Home` always goes to home screen
- Export JSON exports the active diagram's `DiagramState` (unchanged behavior)
- Import JSON imports into the active diagram (unchanged behavior)

**File:** `src/components/BreadcrumbBar.svelte` (modify)

Changes:
- Accept optional `projectName` and `diagramName` props
- Render: `Project Name › Diagram Name › Level1 › Level2 › ...`
- Project name and diagram name are non-clickable labels (styled differently from level crumbs)
- Level crumbs remain clickable (existing behavior)

### Task 7: Bootstrap & Auto-save
**File:** `src/main.ts` (modify)

Replace the current single-diagram bootstrap with:

```
1. Try loadAppState()
2. If null, try migrateFromLegacy()
3. If null, create fresh via createInitialAppState()
4. Set appState store
5. Subscribe to appState with debounced saveAppState (500ms)
6. Subscribe to diagramStore with debounced syncDiagramToApp (500ms, only in editor mode)
7. Mount App
```

Do NOT auto-open a diagram. User starts at the home screen.

### Task 8: CSS additions
**File:** `src/app.css` (modify)

Add CSS variables and base styles for the home screen:
- `--home-max-width: 960px` — content max-width
- `.home-*` utility classes (won't conflict with existing `.app-*` classes)
- Card styles, grid layout for diagram cards
- Inline-edit input styles
- Confirm dialog styles
- Responsive breakpoints for the home screen grid

### Task 9: Tests

#### `tests/stores/appStore.test.ts` (new)

Test cases:
- `createInitialAppState()` — returns valid structure with default account, project, diagram
- `createProject()` — adds project to appState, auto-names correctly
- `createProject(name)` — uses provided name
- `renameProject()` — updates name and updatedAt
- `deleteProject()` — removes project; navigates home if active
- `createDiagram()` — adds diagram to project, auto-names
- `renameDiagram()` — updates name and updatedAt
- `deleteDiagram()` — removes diagram; navigates home if active
- `duplicateDiagram()` — creates copy with new ID and "Copy of" name
- `openDiagram()` — sets appView to editor, loads state into diagramStore
- `goHome()` — syncs diagramStore back, sets appView to home
- `syncDiagramToApp()` — writes diagramStore value into active DiagramMeta.state
- `projectList` derived — returns projects sorted by updatedAt desc
- `activeProject` / `activeDiagram` derived — return correct values based on appView

#### `tests/utils/persistence.test.ts` (modify)

Add test cases:
- `saveAppState / loadAppState` — round-trips an AppState
- `loadAppState` returns null when nothing stored
- `loadAppState` returns null on corrupted data
- `migrateFromLegacy()` — when `laverop_diagram` exists, wraps it in AppState, deletes old key
- `migrateFromLegacy()` — returns null when no legacy data exists
- Storage size helpers work with new key

---

## Task Dependencies

```
Task 1 (Types)
  ├──→ Task 2 (App Store)     ──→ Task 7 (Bootstrap)
  ├──→ Task 3 (Persistence)   ──→ Task 7 (Bootstrap)
  └──→ Task 4 (Home Screen)   ──→ Task 5 (Shell Router) ──→ Task 7 (Bootstrap)
                                    ↑
Task 6 (Toolbar/Breadcrumb) ────────┘
Task 8 (CSS) ── independent, can be done anytime
Task 9 (Tests) ── after Tasks 2 + 3
```

**Parallelizable after Task 1:**
- Task 2, Task 3, Task 4, Task 6, Task 8 can all proceed in parallel
- Task 5 depends on Task 4 (needs HomeScreen component) and Task 2 (needs appView store)
- Task 7 depends on Tasks 2, 3, 5
- Task 9 depends on Tasks 2, 3

---

## What stays untouched

- `src/stores/diagramStore.ts` — no changes
- `src/canvas/DiagramCanvas.svelte` — no changes
- `src/canvas/FlowHelper.svelte` — no changes
- `src/elements/*.svelte` (PersonNode, SystemNode, ContainerNode, ComponentNode, BoundaryNode, C4Edge) — no changes
- `src/components/ElementPalette.svelte` — no changes
- `src/components/PropertiesPanel.svelte` — no changes
- `src/utils/colors.ts` — no changes
- `tests/stores/diagramStore.test.ts` — no changes
