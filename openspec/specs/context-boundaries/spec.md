# context-boundaries Specification

## Purpose
Display visual boundaries representing parent-level groupings and context nodes when navigating into child diagrams, with visual distinction between the focused group and sibling groups.
## Requirements
### Requirement: Parent boundaries are displayed when inside a child diagram
The system SHALL display faded boundary rectangles representing parent-level groupings when the user has navigated into a child diagram. Each boundary encloses the child nodes belonging to that parent element.

#### Scenario: Drill into container shows sibling container boundaries
- **WHEN** the user drills into Container A1 which contains components B1 and C1, and a sibling Container A2 contains components B2, C2, and D2
- **THEN** the canvas displays B1 and C1 as interactive nodes enclosed by a faded boundary labeled "A1", and B2, C2, D2 as dimmed nodes enclosed by a faded boundary labeled "A2"

#### Scenario: At root level no boundaries are shown
- **WHEN** the user is at the root context diagram
- **THEN** no boundary rectangles are displayed

### Requirement: Context nodes from sibling groups are visible but non-interactive
The system SHALL display nodes from sibling parent groups as dimmed, read-only elements on the canvas. These context nodes SHALL NOT be selectable, draggable, or connectable.

#### Scenario: Context nodes cannot be selected
- **WHEN** the user clicks on a context node from a sibling group
- **THEN** the node is not selected and no selection event fires

#### Scenario: Context nodes cannot be dragged
- **WHEN** the user attempts to drag a context node
- **THEN** the node does not move

#### Scenario: Context nodes are visually dimmed
- **WHEN** context nodes are displayed on the canvas
- **THEN** they appear at reduced opacity (approximately 35%) compared to active nodes

### Requirement: The focused group boundary is visually distinguished from sibling boundaries
The system SHALL render the boundary of the currently focused group with higher visual prominence than sibling group boundaries, so users can immediately identify which group they are editing.

#### Scenario: Focused vs sibling boundary appearance
- **WHEN** the user is inside Container A1's child diagram
- **THEN** the A1 boundary is rendered with higher opacity and a subtle background tint, while sibling boundaries (e.g., A2) are rendered with lower opacity and no background tint

### Requirement: Boundary rectangles enclose their child nodes with padding
The system SHALL size and position each boundary rectangle to enclose all child nodes within that group, with visual padding around the edges.

#### Scenario: Boundary adapts to node positions
- **WHEN** a node in the active group is moved to a new position
- **THEN** the focused boundary rectangle resizes to continue enclosing all nodes in the group

#### Scenario: Empty group shows minimum-size boundary
- **WHEN** a parent element has no children in its child diagram
- **THEN** a minimum-size boundary placeholder is displayed at a default position with the parent label

### Requirement: Only one level of parent context is shown
The system SHALL display context boundaries only for the immediate parent level. Grandparent and higher levels are not shown.

#### Scenario: Two levels deep shows only parent context
- **WHEN** the user has drilled from Context → System → Container (two levels deep)
- **THEN** only the System-level boundaries are shown as context, not the Context-level boundaries

