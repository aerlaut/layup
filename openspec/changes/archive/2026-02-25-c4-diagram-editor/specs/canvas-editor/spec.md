## ADDED Requirements

### Requirement: Canvas renders a pannable and zoomable surface
The system SHALL provide an infinite canvas that users can pan by dragging the background and zoom with scroll or pinch gestures.

#### Scenario: User pans the canvas
- **WHEN** the user clicks and drags on an empty area of the canvas
- **THEN** the viewport shifts in the direction of the drag

#### Scenario: User zooms in
- **WHEN** the user scrolls up (or pinches out) on the canvas
- **THEN** the canvas zooms in, centered on the cursor position

#### Scenario: User zooms out
- **WHEN** the user scrolls down (or pinches in) on the canvas
- **THEN** the canvas zooms out, centered on the cursor position

### Requirement: Users can add C4 elements to the canvas
The system SHALL provide a palette of C4 element types. Selecting an element type and clicking on the canvas SHALL place a new element at that position.

#### Scenario: Element placed from palette
- **WHEN** the user selects an element type from the palette and clicks on the canvas
- **THEN** a new C4 element of the selected type appears at the clicked position with default label text

### Requirement: Users can drag elements to reposition them
The system SHALL allow elements to be freely repositioned by dragging them on the canvas.

#### Scenario: Element dragged to new position
- **WHEN** the user clicks and drags a C4 element
- **THEN** the element moves with the cursor and its new position is persisted

### Requirement: Users can select elements
The system SHALL support single-click to select an element. Selected elements SHALL display a visual selection indicator (highlight or bounding box).

#### Scenario: Single element selected
- **WHEN** the user clicks on a C4 element
- **THEN** the element becomes selected and displays a selection indicator

#### Scenario: Deselect by clicking canvas
- **WHEN** the user clicks on an empty canvas area
- **THEN** all elements are deselected

### Requirement: Users can delete selected elements
The system SHALL allow deletion of selected elements using the Delete or Backspace key, or a delete button in the toolbar.

#### Scenario: Delete selected element
- **WHEN** an element is selected and the user presses Delete or Backspace
- **THEN** the element and all its connected relationships are removed from the canvas

### Requirement: Canvas palette is filtered by current C4 level
The system SHALL only show element types valid for the current diagram level in the palette (e.g., Person and System at Context level; Container at Container level).

#### Scenario: Palette shows level-appropriate elements
- **WHEN** the user is viewing a Context-level diagram
- **THEN** the palette shows Person and Software System; Container and Component are not available
