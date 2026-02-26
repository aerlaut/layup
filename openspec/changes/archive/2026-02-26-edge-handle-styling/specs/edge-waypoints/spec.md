## ADDED Requirements

### Requirement: Users can add waypoints to edges
The system SHALL allow users to add waypoints to an edge by double-clicking on the edge path, creating a draggable control point at that position.

#### Scenario: Add waypoint by double-clicking edge
- **WHEN** the user double-clicks on an edge path
- **THEN** a waypoint SHALL be added at the clicked position and the edge path SHALL reroute through the new waypoint

### Requirement: Users can drag waypoints to reposition them
The system SHALL allow users to drag waypoints to new positions, causing the edge path to update in real time.

#### Scenario: Drag waypoint to new position
- **WHEN** the user drags an existing waypoint to a new position
- **THEN** the edge path SHALL update to route through the waypoint's new position

### Requirement: Users can delete waypoints
The system SHALL allow users to remove a waypoint by right-clicking it and selecting delete, or by selecting the waypoint and pressing Delete/Backspace.

#### Scenario: Delete waypoint via right-click
- **WHEN** the user right-clicks a waypoint and selects delete
- **THEN** the waypoint SHALL be removed and the edge path SHALL reroute without it

#### Scenario: Delete waypoint via keyboard
- **WHEN** the user selects a waypoint and presses Delete or Backspace
- **THEN** the waypoint SHALL be removed and the edge path SHALL reroute without it

### Requirement: Edge path routes through waypoints in order
The system SHALL render the edge path as a series of smooth segments from the source handle, through each waypoint in order, to the target handle.

#### Scenario: Edge with multiple waypoints
- **WHEN** an edge has waypoints at positions P1, P2, P3
- **THEN** the edge path SHALL route from source handle → P1 → P2 → P3 → target handle

### Requirement: Waypoints persist across sessions
The system SHALL store waypoint positions as part of the edge data and persist them to localStorage and JSON export.

#### Scenario: Waypoints survive page reload
- **WHEN** the user adds waypoints to an edge and reloads the page
- **THEN** the edge SHALL still have its waypoints at the same positions

### Requirement: Edges without waypoints render as bezier curves
Edges with no waypoints SHALL render as bezier curves (current behavior).

#### Scenario: Edge with empty waypoints array
- **WHEN** an edge has no waypoints (empty array or undefined)
- **THEN** the edge SHALL render as a standard bezier curve
