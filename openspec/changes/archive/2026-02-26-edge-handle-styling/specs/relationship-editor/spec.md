## MODIFIED Requirements

### Requirement: Relationships have editable label, description, and technology fields
The system SHALL allow users to set a label (short verb phrase), description (longer explanation), and technology (e.g., "HTTPS", "gRPC") on each relationship. The properties panel SHALL also provide controls for configuring the edge's start marker, end marker, and line style.

#### Scenario: Edit relationship label
- **WHEN** the user double-clicks on a relationship arrow
- **THEN** an inline editor or properties panel opens for the label, description, and technology fields

#### Scenario: Relationship label displayed on arrow
- **WHEN** a relationship has a label set
- **THEN** the label is displayed along the arrow on the canvas

#### Scenario: Edit edge markers in properties panel
- **WHEN** the user selects an edge and opens the properties panel
- **THEN** the panel SHALL display dropdown controls for start marker (arrow/dot/none) and end marker (arrow/dot/none)

#### Scenario: Edit edge line style in properties panel
- **WHEN** the user selects an edge and opens the properties panel
- **THEN** the panel SHALL display a dropdown control for line style (solid/dashed/dotted)
