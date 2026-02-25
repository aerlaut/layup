## MODIFIED Requirements

### Requirement: Node connection points
Each C4 node type SHALL provide six connection handles: top-target, bottom-source, left-target, left-source, right-target, and right-source. Each handle SHALL have a unique `id` attribute corresponding to its position and type.

#### Scenario: Node renders all six handles
- **WHEN** any C4 node (Person, System, Container, Component) is rendered on the canvas
- **THEN** the node SHALL display handles at top, bottom, left, and right positions

#### Scenario: Handles support correct connection directions
- **WHEN** a user interacts with node handles
- **THEN** top and left/right target handles SHALL accept incoming connections
- **AND** bottom and left/right source handles SHALL allow outgoing connections
