## ADDED Requirements

### Requirement: Edges connect to specific handles
The system SHALL store the `sourceHandle` and `targetHandle` IDs on each edge, capturing which specific handle the user connected from and to.

#### Scenario: Edge created from right-source to left-target
- **WHEN** the user drags a connection from the right-source handle of node A to the left-target handle of node B
- **THEN** the created edge SHALL have `sourceHandle` set to `"right-source"` and `targetHandle` set to `"left-target"`

#### Scenario: Edge created from bottom-source to top-target
- **WHEN** the user drags a connection from the bottom-source handle of node A to the top-target handle of node B
- **THEN** the created edge SHALL have `sourceHandle` set to `"bottom-source"` and `targetHandle` set to `"top-target"`

### Requirement: Edges route through their stored handles
The system SHALL render each edge path starting from the source handle position and ending at the target handle position, using the stored handle IDs to determine the correct anchor points.

#### Scenario: Edge renders from right handle to left handle
- **WHEN** an edge has `sourceHandle: "right-source"` and `targetHandle: "left-target"`
- **THEN** the edge path SHALL originate from the right side of the source node and terminate at the left side of the target node

#### Scenario: Edge renders from bottom handle to top handle
- **WHEN** an edge has `sourceHandle: "bottom-source"` and `targetHandle: "top-target"`
- **THEN** the edge path SHALL originate from the bottom of the source node and terminate at the top of the target node

### Requirement: Existing edges without handle IDs use default routing
The system SHALL render edges that lack `sourceHandle` and `targetHandle` fields using @xyflow's default handle selection behavior.

#### Scenario: Legacy edge renders with default handles
- **WHEN** a saved edge has no `sourceHandle` or `targetHandle` fields
- **THEN** the edge SHALL render using @xyflow's automatic handle selection (same as current behavior)
