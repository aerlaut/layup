## ADDED Requirements

### Requirement: Edges support configurable end marker
The system SHALL allow each edge to have its end marker (target side) set to one of: arrow, dot, or none.

#### Scenario: Edge with arrow end marker
- **WHEN** an edge has `markerEnd` set to `"arrow"`
- **THEN** the edge SHALL render with an arrowhead pointing toward the target node

#### Scenario: Edge with dot end marker
- **WHEN** an edge has `markerEnd` set to `"dot"`
- **THEN** the edge SHALL render with a filled circle at the target end

#### Scenario: Edge with no end marker
- **WHEN** an edge has `markerEnd` set to `"none"`
- **THEN** the edge SHALL render with a plain line end (no marker) at the target side

### Requirement: Edges support configurable start marker
The system SHALL allow each edge to have its start marker (source side) set to one of: arrow, dot, or none.

#### Scenario: Edge with arrow start marker
- **WHEN** an edge has `markerStart` set to `"arrow"`
- **THEN** the edge SHALL render with an arrowhead at the source end, pointing away from the source node

#### Scenario: Edge with dot start marker
- **WHEN** an edge has `markerStart` set to `"dot"`
- **THEN** the edge SHALL render with a filled circle at the source end

#### Scenario: Edge with no start marker
- **WHEN** an edge has `markerStart` set to `"none"`
- **THEN** the edge SHALL render with a plain line end (no marker) at the source side

### Requirement: Default edge markers match current behavior
New edges SHALL default to `markerEnd: "arrow"` and `markerStart: "none"`, matching the current directed arrow behavior.

#### Scenario: New edge created with default markers
- **WHEN** the user creates a new edge without specifying markers
- **THEN** the edge SHALL have an arrowhead at the target end and no marker at the source end

### Requirement: Users can change edge markers via properties panel
The system SHALL provide controls in the properties panel to change the start and end markers of a selected edge.

#### Scenario: User changes end marker to dot
- **WHEN** the user selects an edge and changes the end marker to "dot" in the properties panel
- **THEN** the edge SHALL immediately render with a filled circle at the target end instead of an arrowhead
