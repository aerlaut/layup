## ADDED Requirements

### Requirement: Nodes have left-side connection handles
All C4 node types (Person, System, Container, Component) SHALL have connection handles on the left side that support both incoming and outgoing edges.

#### Scenario: User connects an edge to the left side of a node
- **WHEN** user drags a connection to the left side of any C4 node
- **THEN** the edge SHALL connect to the left-side target handle

#### Scenario: User starts a connection from the left side of a node
- **WHEN** user drags from the left-side source handle of any C4 node
- **THEN** the system SHALL allow creating an edge from that handle

### Requirement: Nodes have right-side connection handles
All C4 node types (Person, System, Container, Component) SHALL have connection handles on the right side that support both incoming and outgoing edges.

#### Scenario: User connects an edge to the right side of a node
- **WHEN** user drags a connection to the right side of any C4 node
- **THEN** the edge SHALL connect to the right-side target handle

#### Scenario: User starts a connection from the right side of a node
- **WHEN** user drags from the right-side source handle of any C4 node
- **THEN** the system SHALL allow creating an edge from that handle

### Requirement: Each handle has a unique identifier
Every handle on a node SHALL have a unique `id` to allow xyflow to distinguish between multiple handles of the same type on a single node.

#### Scenario: Node has multiple source handles
- **WHEN** a node renders with bottom-source, left-source, and right-source handles
- **THEN** each handle SHALL have a distinct `id` property

### Requirement: Existing top and bottom handles remain functional
Adding side handles SHALL NOT affect the behavior of existing top (target) and bottom (source) handles.

#### Scenario: Vertical connection still works after change
- **WHEN** user connects an edge from the bottom of one node to the top of another
- **THEN** the connection SHALL work identically to before the change
