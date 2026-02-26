## MODIFIED Requirements

### Requirement: Drillable elements can be entered by double-click
The system SHALL allow users to double-click on a Software System, Container, or Component element to navigate into its child diagram. If no child diagram exists, one SHALL be created automatically. Upon navigation, the system SHALL track which parent node is focused so that the canvas can distinguish the active group from sibling context groups. Double-clicking on the canvas background outside any group boundary SHALL navigate up one level in the hierarchy.

#### Scenario: Double-click on element with existing child diagram
- **WHEN** the user double-clicks on an element that has an associated child diagram
- **THEN** the canvas transitions to display that child diagram, the navigation stack is updated, and the focused parent node ID is recorded

#### Scenario: Double-click on element with no child diagram
- **WHEN** the user double-clicks on a drillable element with no existing child diagram
- **THEN** a new empty child diagram is created at the appropriate C4 level, the canvas navigates into it, and the focused parent node ID is recorded

#### Scenario: Double-click on non-drillable element
- **WHEN** the user double-clicks on a Person element (not drillable)
- **THEN** no navigation occurs; the label enters edit mode instead

#### Scenario: Double-click on background outside any group navigates up
- **WHEN** the user double-clicks on the canvas background outside any group boundary while inside a child diagram
- **THEN** the system navigates up one level to the parent diagram

#### Scenario: Double-click on background at root level
- **WHEN** the user double-clicks on the canvas background while at the root diagram
- **THEN** nothing happens; the user is already at the top level
