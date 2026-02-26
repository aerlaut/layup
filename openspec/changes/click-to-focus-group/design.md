## Context

Currently, group focus is set exclusively during `drillDown()` via `focusedParentNodeId`, which stores the parent node ID that was double-clicked. This value persists until `drillUp()` or `navigateTo()` resets it to null. The `contextBoundaries` derived store computes `isFocused` by checking if each boundary's `childDiagramId` matches the current diagram in the navigation stack.

The current model ties focus to navigation — you can only focus a different group by navigating out and drilling back in. There's no concept of switching focus between sibling groups while staying at the same hierarchy level.

## Goals / Non-Goals

**Goals:**
- Allow click-based focus switching between sibling groups at the same navigation level
- Support a "no focus" overview state where all groups appear equally prominent
- Keep navigation stack in sync with the focused group's child diagram
- Maintain backward compatibility with existing drill-down/drill-up navigation

**Non-Goals:**
- Multi-group selection (only one group or zero groups can be focused at a time)
- Changing the double-click drill-down behavior
- Keyboard-based focus switching

## Decisions

### 1. Use `focusedParentNodeId = null` for "all focused" state

When the user clicks outside all boundaries, `focusedParentNodeId` is set to `null`. The `contextBoundaries` derived store interprets null as "all groups are focused" — every `BoundaryGroup.isFocused` becomes `true`.

**Rationale**: Reuses the existing field without adding new state. The null state already existed (set on drillUp/navigateTo) but was immediately followed by navigation away, so it was never visible. Now it becomes a meaningful UI state.

**Alternative considered**: A separate `focusMode: 'single' | 'all'` flag — rejected as unnecessary complexity.

### 2. Switching focus updates `navigationStack` to point to the new group's child diagram

When focus switches to a different group, the last entry in `navigationStack` is replaced with the newly-focused group's `childDiagramId`. This keeps `currentDiagram` in sync so that node additions, edge operations, and other actions target the correct diagram.

**Rationale**: The navigation stack drives which diagram is "current" for all store operations. If we only changed `focusedParentNodeId` without updating the stack, new nodes would be added to the wrong diagram.

**Alternative considered**: A separate `activeDiagramId` that overrides the stack — rejected because it would require updating every store action that calls `getCurrentDiagram()`.

### 3. Handle focus switching in `DiagramCanvas.svelte` event handlers

- **Boundary click**: Boundary nodes currently have `pointer-events: none`. To detect clicks on boundaries, we'll handle clicks on the boundary region in the pane click handler by checking if the click position falls within any boundary's bounding box.
- **Context node click**: Already handled by `handleNodeClick`. When a `ctx-*` node is clicked, we detect which group it belongs to and call the new `switchFocusToGroup` action.
- **Pane click outside boundaries**: The existing `handlePaneClick` already fires when clicking the background. Add a check: if click position is outside all boundary bounding boxes, call `clearGroupFocus()`.

**Rationale**: Reuses existing event infrastructure. Boundary click detection via coordinate checking avoids needing to change boundary node `pointer-events` (which would interfere with node dragging within boundaries).

### 4. New store actions: `switchFocusToGroup(parentNodeId)` and `clearGroupFocus()`

- `switchFocusToGroup(parentNodeId)`: Sets `focusedParentNodeId` to the given parent node, replaces the last navigation stack entry with the group's `childDiagramId`, clears selection.
- `clearGroupFocus()`: Sets `focusedParentNodeId` to null, keeps the navigation stack unchanged (stays on whatever diagram was last focused), clears selection.

**Rationale**: Clean separation of concerns. The canvas component detects the interaction, the store actions handle state transitions.

## Risks / Trade-offs

- **Navigation stack out of sync in "no focus" state**: When no group is focused, `currentDiagram` still points to whatever was last focused. Node placement in this state would go to that diagram. → Mitigation: This is acceptable — the user can click a group to focus it before adding nodes. Alternatively, we could disable node placement in "no focus" mode but that adds complexity.
- **Cross-group edges during focus switch**: Edges referencing `ctx-` prefixed IDs must be remapped when focus changes because which nodes are "context" vs "active" swaps. → Mitigation: The existing `$effect` that builds flow nodes/edges already recomputes from store state on every change, so this is handled automatically.
