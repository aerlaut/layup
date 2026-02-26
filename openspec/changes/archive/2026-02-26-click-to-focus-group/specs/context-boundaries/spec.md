## MODIFIED Requirements

### Requirement: The focused group boundary is visually distinguished from sibling boundaries
The system SHALL render the boundary of the currently focused group with higher visual prominence than sibling group boundaries, so users can immediately identify which group they are editing. When no group is focused (no-focus state), all boundaries SHALL be rendered with focused styling (solid border, blue tint) to indicate equal prominence.

#### Scenario: Focused vs sibling boundary appearance
- **WHEN** the user is inside Container A1's child diagram and A1's group is focused
- **THEN** the A1 boundary is rendered with higher opacity and a subtle background tint, while sibling boundaries (e.g., A2) are rendered with lower opacity and no background tint

#### Scenario: No-focus state renders all boundaries as focused
- **WHEN** no group is focused (user clicked outside all boundaries)
- **THEN** all boundaries are rendered with focused styling (solid border, blue tint, higher opacity) and all nodes across all groups are rendered at full opacity

### Requirement: Context nodes from sibling groups are visible but non-interactive
The system SHALL display nodes from sibling parent groups as subtly distinguished elements on the canvas. These context nodes SHALL be selectable, draggable, and connectable, allowing full interaction including edge creation to and from context nodes. Context nodes SHALL be rendered at slightly reduced opacity (approximately 0.7) to visually distinguish them from nodes in the focused group. When no group is focused, all nodes SHALL be rendered at full opacity.

#### Scenario: Context nodes can be selected
- **WHEN** the user clicks on a context node from a sibling group
- **THEN** the node is selected and the selection event fires

#### Scenario: Context nodes can be connected
- **WHEN** the user drags a connection handle from or to a context node
- **THEN** the connection is established as a cross-group edge

#### Scenario: Context nodes are visually distinguished
- **WHEN** context nodes are displayed on the canvas and a group is focused
- **THEN** they appear at slightly reduced opacity (approximately 0.7) compared to active nodes, maintaining readability while indicating they belong to a different group

#### Scenario: No-focus state renders all nodes at full opacity
- **WHEN** no group is focused
- **THEN** all nodes across all groups are rendered at full opacity with no visual distinction between groups
