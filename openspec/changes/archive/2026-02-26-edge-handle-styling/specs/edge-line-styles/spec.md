## ADDED Requirements

### Requirement: Edges support configurable line style
The system SHALL allow each edge to have its line style set to one of: solid, dashed, or dotted.

#### Scenario: Edge with solid line style
- **WHEN** an edge has `lineStyle` set to `"solid"`
- **THEN** the edge SHALL render as a continuous solid line

#### Scenario: Edge with dashed line style
- **WHEN** an edge has `lineStyle` set to `"dashed"`
- **THEN** the edge SHALL render as a dashed line (stroke-dasharray: 8 4)

#### Scenario: Edge with dotted line style
- **WHEN** an edge has `lineStyle` set to `"dotted"`
- **THEN** the edge SHALL render as a dotted line (stroke-dasharray: 2 2)

### Requirement: Default edge line style is solid
New edges SHALL default to `lineStyle: "solid"`.

#### Scenario: New edge created with default line style
- **WHEN** the user creates a new edge without specifying a line style
- **THEN** the edge SHALL render as a solid line

### Requirement: Users can change edge line style via properties panel
The system SHALL provide a control in the properties panel to change the line style of a selected edge.

#### Scenario: User changes line style to dashed
- **WHEN** the user selects an edge and changes the line style to "dashed" in the properties panel
- **THEN** the edge SHALL immediately render as a dashed line

### Requirement: Existing edges without line style use solid
The system SHALL render edges that lack a `lineStyle` field as solid lines.

#### Scenario: Legacy edge renders as solid
- **WHEN** a saved edge has no `lineStyle` field
- **THEN** the edge SHALL render as a solid line
