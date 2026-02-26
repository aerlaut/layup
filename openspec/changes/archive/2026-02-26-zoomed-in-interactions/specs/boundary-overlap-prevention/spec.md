## ADDED Requirements

### Requirement: Group boundaries SHALL NOT overlap each other
The system SHALL detect boundary overlap after any operation that changes node positions (drag, add, overlap resolution). If two group boundaries overlap, the system SHALL reposition the smaller group (fewer child nodes) away from the larger group to eliminate the overlap.

#### Scenario: Moving a node causes boundary overlap
- **WHEN** the user moves a node near the edge of its group boundary, causing the boundary to expand and overlap a sibling group's boundary
- **THEN** the sibling group is repositioned so that boundaries no longer overlap

#### Scenario: Adding a node causes boundary overlap
- **WHEN** a new node is added to a group and the expanded boundary overlaps another group's boundary
- **THEN** the overlapping group is repositioned to eliminate the boundary intersection

### Requirement: Boundary overlap resolution shifts all nodes in the displaced group
The system SHALL reposition a group by shifting all of its child nodes by the same offset, preserving the internal layout of the group.

#### Scenario: Group displacement preserves internal layout
- **WHEN** a group boundary is repositioned to resolve overlap
- **THEN** all nodes within the displaced group move by the same x/y offset, maintaining their relative positions
