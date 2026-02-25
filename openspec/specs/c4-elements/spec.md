## Requirements

### Requirement: Person element is visually distinct
The system SHALL render Person elements as a named figure (e.g., person icon with label below) to represent a human user or role.

#### Scenario: Person element displayed
- **WHEN** a Person element exists on the canvas
- **THEN** it is rendered with a person icon and its label, visually distinct from system elements

### Requirement: Software System element is visually distinct
The system SHALL render Software System elements as a labeled rectangle with a distinct background color, representing a top-level system boundary.

#### Scenario: System element displayed
- **WHEN** a Software System element exists on the canvas
- **THEN** it is rendered as a rectangle with the system label and optional description

### Requirement: Container element is visually distinct
The system SHALL render Container elements as a labeled rectangle with a technology badge, representing a deployable unit (app, service, database).

#### Scenario: Container element displayed
- **WHEN** a Container element exists on the canvas
- **THEN** it is rendered as a rectangle with label, description, and technology fields visible

### Requirement: Component element is visually distinct
The system SHALL render Component elements as a labeled rectangle with a technology badge and a visual marker distinguishing it from Container.

#### Scenario: Component element displayed
- **WHEN** a Component element exists on the canvas
- **THEN** it is rendered with label, description, and technology fields and a visual style different from Container

### Requirement: Each element has editable metadata fields
The system SHALL allow editing of label, description, and technology fields for each element via an inline editor or sidebar panel.

#### Scenario: User edits element label
- **WHEN** the user double-taps a selected element's label (or uses the properties panel)
- **THEN** the label becomes editable and changes are saved on blur or Enter

#### Scenario: User edits element description and technology
- **WHEN** an element is selected
- **THEN** a properties panel is shown with editable description and technology fields

### Requirement: Node connection points
Each C4 node type SHALL provide six connection handles: top-target, bottom-source, left-target, left-source, right-target, and right-source. Each handle SHALL have a unique `id` attribute corresponding to its position and type.

#### Scenario: Node renders all six handles
- **WHEN** any C4 node (Person, System, Container, Component) is rendered on the canvas
- **THEN** the node SHALL display handles at top, bottom, left, and right positions

#### Scenario: Handles support correct connection directions
- **WHEN** a user interacts with node handles
- **THEN** top and left/right target handles SHALL accept incoming connections
- **AND** bottom and left/right source handles SHALL allow outgoing connections

### Requirement: Elements display metadata inline
The system SHALL render label, description (truncated), and technology tag directly on the element shape on the canvas, without requiring expansion.

#### Scenario: Element shows all metadata
- **WHEN** an element has label, description, and technology set
- **THEN** all three fields are visible on the element shape (description may be truncated with ellipsis)
