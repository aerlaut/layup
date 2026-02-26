## ADDED Requirements

### Requirement: Clicking a context node switches focus to its group
The system SHALL switch the focused group when the user single-clicks on a node belonging to an unfocused sibling group. The clicked node's group SHALL become the focused group, the previously-focused group SHALL become unfocused, and the navigation stack SHALL update to point to the newly-focused group's child diagram.

#### Scenario: Click context node to switch focus
- **WHEN** the user is viewing Group A (focused) and Group B (unfocused), and clicks on a node in Group B
- **THEN** Group B becomes the focused group, Group A becomes unfocused, the navigation stack points to Group B's child diagram, and the clicked node is selected

### Requirement: Clicking within an unfocused boundary switches focus to that group
The system SHALL switch the focused group when the user single-clicks within the bounding box of an unfocused group's boundary (but not on a node). The clicked boundary's group SHALL become the focused group.

#### Scenario: Click inside unfocused boundary area
- **WHEN** the user clicks on empty space within an unfocused group's boundary rectangle
- **THEN** that group becomes the focused group, the previously-focused group becomes unfocused, and the navigation stack updates to the newly-focused group's child diagram

### Requirement: Clicking outside all boundaries clears group focus
The system SHALL remove focus from all groups when the user single-clicks on the canvas background outside all group boundary rectangles. In this "no focus" state, all groups SHALL be displayed as if they are all focused, providing a neutral overview.

#### Scenario: Click outside all boundaries enters no-focus mode
- **WHEN** the user clicks on the canvas background outside all group boundary rectangles
- **THEN** no group is focused, all groups are rendered with focused styling (solid border, blue tint, full opacity nodes), and selection is cleared

#### Scenario: Click a group after no-focus mode restores single focus
- **WHEN** the user is in no-focus mode (all groups appear focused) and clicks on a node or boundary area of a specific group
- **THEN** that group becomes the sole focused group and all other groups revert to unfocused styling
