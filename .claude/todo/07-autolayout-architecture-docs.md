# Task: Update ARCHITECTURE.md for auto-layout

## Motivation

`ARCHITECTURE.md` is the canonical orientation document for this codebase. The auto-layout feature adds a new dependency (elkjs), a new store module, and a new component — all of which should be documented so future contributors understand where to look.

**Prerequisite tasks:** `04-autolayout-engine.md`, `05-autolayout-dialog.md`, and `06-autolayout-toolbar.md` should be complete or in progress.

## Steps

### 1. Tech Stack table — add elkjs row

```markdown
| elkjs | Graph layout engine (auto-arrange nodes and boundary groups) |
```

### 2. Directory Layout — add new files

In `stores/`:
```
│   └── autoLayout.ts       # ELK-based auto-layout: LayoutOptions type + applyAutoLayout()
```

In `components/`:
```
│   └── AutoLayoutDialog.svelte  # Modal for configuring and triggering auto-layout
```

### 3. No new invariants needed

The auto-layout feature doesn't introduce new invariants — it is a pure position transform that respects the existing rules (`childTypeIsValid`, absolute positions in the store, etc.).
