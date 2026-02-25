## Why

Currently all C4 nodes only have handles on the top (target) and bottom (source), forcing all connections to flow vertically. Adding left and right handles enables horizontal connections, giving users more flexibility in diagram layout and producing cleaner, more readable diagrams.

## What Changes

- Add left-side and right-side handles to all four node types (Person, System, Container, Component)
- Left and right handles should support both source and target connections (bidirectional)
- Style side handles to be visually consistent with existing top/bottom handles

## Capabilities

### New Capabilities
- `side-handles`: Left and right connection handles on all C4 node types, enabling horizontal edge routing

### Modified Capabilities
- `c4-elements`: Nodes gain additional handle positions (left, right) alongside existing top/bottom handles

## Impact

- **Code**: All node components in `src/elements/` (PersonNode, SystemNode, ContainerNode, ComponentNode)
- **Edges**: Existing edges remain unaffected; new edges can connect via any handle position
- **Styles**: Minor CSS additions for handle positioning/visibility on left and right sides
