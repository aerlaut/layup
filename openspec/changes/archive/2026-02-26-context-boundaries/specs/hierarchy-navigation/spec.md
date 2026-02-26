## Purpose
Track the focused parent node ID during navigation to enable visual distinction of context boundaries.

## MODIFIED Requirements

### Requirement: Drillable elements can be entered by double-click
The system SHALL allow users to double-click on a Software System, Container, or Component element to navigate into its child diagram. If no child diagram exists, one SHALL be created automatically. Upon navigation, the system SHALL track which parent node is focused so that the canvas can distinguish the active group from sibling context groups.

#### Scenario: Double-click on element with existing child diagram
- **WHEN** the user double-clicks on an element that has an associated child diagram
- **THEN** the canvas transitions to display that child diagram, the navigation stack is updated, and the focused parent node ID is recorded

#### Scenario: Double-click on element with no child diagram
- **WHEN** the user double-clicks on a drillable element with no existing child diagram
- **THEN** a new empty child diagram is created at the appropriate C4 level, the canvas navigates into it, and the focused parent node ID is recorded

#### Scenario: Double-click on non-drillable element
- **WHEN** the user double-clicks on a Person element (not drillable)
- **THEN** no navigation occurs; the label enters edit mode instead
