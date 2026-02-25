## ADDED Requirements

### Requirement: Drillable elements can be entered by double-click
The system SHALL allow users to double-click on a Software System, Container, or Component element to navigate into its child diagram. If no child diagram exists, one SHALL be created automatically.

#### Scenario: Double-click on element with existing child diagram
- **WHEN** the user double-clicks on an element that has an associated child diagram
- **THEN** the canvas transitions to display that child diagram and the navigation stack is updated

#### Scenario: Double-click on element with no child diagram
- **WHEN** the user double-clicks on a drillable element with no existing child diagram
- **THEN** a new empty child diagram is created at the appropriate C4 level, and the canvas navigates into it

#### Scenario: Double-click on non-drillable element
- **WHEN** the user double-clicks on a Person element (not drillable)
- **THEN** no navigation occurs; the label enters edit mode instead

### Requirement: Child diagram level is determined by parent element type
The system SHALL automatically assign the correct C4 level to child diagrams based on the parent element type: System → Container level; Container → Component level; Component → Code level.

#### Scenario: Drilling into a System
- **WHEN** the user drills into a Software System element
- **THEN** the child diagram is at the Container level and the palette shows Container elements

#### Scenario: Drilling into a Container
- **WHEN** the user drills into a Container element
- **THEN** the child diagram is at the Component level and the palette shows Component elements

### Requirement: Breadcrumb shows current navigation path
The system SHALL display a breadcrumb bar at the top of the editor showing the full path from root to the current diagram (e.g., "Context > My System > Auth Service").

#### Scenario: Breadcrumb reflects drill depth
- **WHEN** the user has drilled two levels deep
- **THEN** the breadcrumb shows three entries: the root diagram name, the intermediate diagram name, and the current diagram name

### Requirement: Users can navigate up via breadcrumb
The system SHALL allow users to click any ancestor entry in the breadcrumb to navigate directly to that level.

#### Scenario: Navigate up via breadcrumb click
- **WHEN** the user clicks on a parent entry in the breadcrumb
- **THEN** the canvas transitions to that ancestor diagram

### Requirement: Back navigation pops one level
The system SHALL provide a back button (or keyboard shortcut Escape) that navigates one level up in the hierarchy.

#### Scenario: Back button at depth
- **WHEN** the user is inside a child diagram and clicks the back button
- **THEN** the canvas transitions to the immediate parent diagram

#### Scenario: Back button at root
- **WHEN** the user is at the root diagram and clicks the back button
- **THEN** nothing happens (the back button is disabled or hidden)

### Requirement: Canvas transition is visually animated
The system SHALL animate the drill-down and drill-up transitions to give users spatial context.

#### Scenario: Drill-down animation
- **WHEN** the user double-clicks a drillable element
- **THEN** the canvas zooms into the element and transitions to the child diagram with a smooth animation
