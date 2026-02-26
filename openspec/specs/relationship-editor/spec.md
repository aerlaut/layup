## Requirements

### Requirement: Users can draw relationships between elements
The system SHALL allow users to draw a directed arrow from one element to another by dragging from a connection handle on the source element to the target element.

#### Scenario: Draw relationship
- **WHEN** the user hovers over a source element and drags from its connection handle to a target element
- **THEN** a directed arrow is created between the two elements

#### Scenario: Cancel incomplete relationship
- **WHEN** the user starts dragging a relationship but releases on empty canvas (no target)
- **THEN** the relationship creation is cancelled and no arrow is added

### Requirement: Relationships have editable label, description, and technology fields
The system SHALL allow users to set a label (short verb phrase), description (longer explanation), and technology (e.g., "HTTPS", "gRPC") on each relationship.

#### Scenario: Edit relationship label
- **WHEN** the user double-clicks on a relationship arrow
- **THEN** an inline editor or properties panel opens for the label, description, and technology fields

#### Scenario: Relationship label displayed on arrow
- **WHEN** a relationship has a label set
- **THEN** the label is displayed along the arrow on the canvas

### Requirement: Relationships are directed
The system SHALL render relationships as directed arrows (with an arrowhead) indicating the direction of interaction or dependency.

#### Scenario: Arrow direction matches creation order
- **WHEN** a relationship was drawn from element A to element B
- **THEN** the arrowhead points toward element B

### Requirement: Users can delete relationships
The system SHALL allow deletion of a selected relationship using the Delete or Backspace key, or a delete button in the properties panel.

#### Scenario: Delete selected relationship
- **WHEN** a relationship is selected and the user presses Delete
- **THEN** the relationship arrow is removed from the canvas

### Requirement: Relationships can only connect elements within the same diagram level
The system SHALL prevent relationships from being drawn between elements in different diagram levels (cross-level edges are not supported).

#### Scenario: Cross-level connection attempt
- **WHEN** the user attempts to draw a relationship from an element in the current diagram to an element not in the current diagram
- **THEN** the connection attempt is rejected and no relationship is created
