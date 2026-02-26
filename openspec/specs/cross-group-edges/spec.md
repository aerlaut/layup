## ADDED Requirements

### Requirement: Users can create edges between nodes in different groups
The system SHALL allow users to create edges by dragging a connection from a node in one group to a node in a different group at the same hierarchy level. The edge SHALL be stored on the parent diagram level with metadata identifying the source and target groups.

#### Scenario: Connect node in focused group to node in sibling group
- **WHEN** the user drags a connection from node B1 in the focused group to node B2 in a sibling group
- **THEN** an edge is created between B1 and B2, stored on the parent diagram level with sourceGroupId and targetGroupId metadata

#### Scenario: Connect node in sibling group to node in focused group
- **WHEN** the user drags a connection from a context node in a sibling group to a node in the focused group
- **THEN** an edge is created with the correct source and target, stored on the parent diagram level

### Requirement: Cross-group edges are rendered when zoomed into any involved group
The system SHALL display cross-group edges when the user is zoomed into any group that contains a source or target node of the edge. The edge SHALL be rendered connecting the visible nodes.

#### Scenario: Edge visible from source group
- **WHEN** the user is zoomed into group A which contains the source node of a cross-group edge to a node in group B
- **THEN** the edge is rendered on the canvas connecting the source node to the target context node

#### Scenario: Edge visible from target group
- **WHEN** the user is zoomed into group B which contains the target node of a cross-group edge from group A
- **THEN** the edge is rendered on the canvas connecting the context source node to the target node

### Requirement: Cross-group edges use the C4Edge style
The system SHALL render cross-group edges using the same C4Edge component and styling as intra-group edges, including labels, technology annotations, and arrow markers.

#### Scenario: Cross-group edge appearance
- **WHEN** a cross-group edge is displayed on the canvas
- **THEN** it uses the same visual style (bezier path, markers, label) as edges within a single group
