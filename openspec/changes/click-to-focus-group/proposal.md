## Why

When users drill into a child diagram, the focused group is locked to whichever parent node was drilled into. There's no way to shift focus to a sibling group without navigating back up and drilling into a different node. This makes it cumbersome to work across multiple groups at the same level, and users can't get a "neutral" view showing all groups equally.

## What Changes

- Clicking a node inside an unfocused group (context node) switches focus to that group, making it the active focused group while the previously-focused group becomes unfocused
- Clicking within an unfocused group's boundary rectangle (but not on a node) switches focus to that group
- Single-clicking on the canvas background outside all group boundaries removes focus from all groups, entering a "no focus" state where all groups are rendered equally (all appear focused) for a better overview
- The current diagram in the navigation stack updates to match the newly-focused group's child diagram
- The `focusedParentNodeId` in the store updates accordingly, or becomes null when no group is focused

## Capabilities

### New Capabilities
- `group-focus-switching`: Click-based focus transfer between sibling groups and a "no focus" overview state where all groups appear equally prominent

### Modified Capabilities
- `context-boundaries`: Visual rendering must support a third state — when no group is focused, all boundaries render with focused styling (higher opacity, background tint) and all nodes render at full opacity

## Impact

- `src/stores/diagramStore.ts` — `focusedParentNodeId` management, `contextBoundaries` derived store must handle null focus state, navigation stack must update when focus switches
- `src/canvas/DiagramCanvas.svelte` — click handlers for boundary clicks and context node clicks must trigger focus changes, pane click handler must clear focus
- `src/elements/BoundaryNode.svelte` — must handle "all focused" rendering when no group is focused
- `src/types.ts` — `BoundaryGroup.isFocused` semantics expand to cover the "all focused" case
