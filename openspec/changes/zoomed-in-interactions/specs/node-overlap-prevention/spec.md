## ADDED Requirements

### Requirement: Nodes within a group SHALL NOT overlap after drag
The system SHALL detect node overlap after a node drag operation completes. If the moved node overlaps another node in the same group, the system SHALL reposition the overlapped node to eliminate the collision.

#### Scenario: Dragging node onto another node pushes it away
- **WHEN** the user drags node A on top of node B within the same group
- **THEN** node B is automatically repositioned so that it no longer overlaps node A

#### Scenario: Chain displacement resolves cascading overlaps
- **WHEN** the user drags node A onto node B, and repositioning node B causes it to overlap node C
- **THEN** node C is also repositioned so that no nodes overlap

#### Scenario: Overlap resolution has an iteration limit
- **WHEN** overlap resolution reaches 10 iterations without fully resolving all overlaps
- **THEN** the system stops iterating and accepts the current positions

### Requirement: Overlap detection uses node bounding boxes
The system SHALL use node bounding boxes (position + dimensions) to detect overlap. Two nodes overlap when their bounding boxes intersect.

#### Scenario: Nodes with non-intersecting bounding boxes
- **WHEN** two nodes are placed with sufficient space between their bounding boxes
- **THEN** no repositioning occurs

#### Scenario: Partially overlapping bounding boxes trigger resolution
- **WHEN** a node is moved so its bounding box partially intersects another node's bounding box
- **THEN** the overlapped node is pushed away to eliminate the intersection
