## MODIFIED Requirements

### Requirement: Context nodes from sibling groups are visible but non-interactive
The system SHALL display nodes from sibling parent groups as subtly distinguished elements on the canvas. These context nodes SHALL be selectable, draggable, and connectable, allowing full interaction including edge creation to and from context nodes. Context nodes SHALL be rendered at slightly reduced opacity (approximately 0.7) to visually distinguish them from nodes in the focused group.

#### Scenario: Context nodes can be selected
- **WHEN** the user clicks on a context node from a sibling group
- **THEN** the node is selected and the selection event fires

#### Scenario: Context nodes can be connected
- **WHEN** the user drags a connection handle from or to a context node
- **THEN** the connection is established as a cross-group edge

#### Scenario: Context nodes are visually distinguished
- **WHEN** context nodes are displayed on the canvas
- **THEN** they appear at slightly reduced opacity (approximately 0.7) compared to active nodes, maintaining readability while indicating they belong to a different group
