## ADDED Requirements

### Requirement: Diagram state is auto-saved to localStorage
The system SHALL automatically persist the full diagram state (all levels of the hierarchy) to localStorage after every change, with no explicit save action required.

#### Scenario: State persisted on change
- **WHEN** the user adds, moves, edits, or deletes any element or relationship
- **THEN** the updated state is written to localStorage within one second

#### Scenario: State restored on reload
- **WHEN** the user reloads the browser
- **THEN** the previously saved diagram state is loaded and the canvas shows the last viewed diagram level

### Requirement: User can export diagram as JSON
The system SHALL provide an "Export JSON" button that downloads the full diagram hierarchy as a `.json` file.

#### Scenario: Export diagram
- **WHEN** the user clicks "Export JSON"
- **THEN** the browser downloads a file named `diagram.json` containing the full diagram state in the canonical JSON schema

### Requirement: User can import a diagram from JSON
The system SHALL provide an "Import JSON" button that loads a diagram from a user-selected `.json` file, replacing the current diagram state.

#### Scenario: Import valid JSON
- **WHEN** the user clicks "Import JSON" and selects a valid diagram JSON file
- **THEN** the current diagram state is replaced with the imported state and the canvas shows the root Context diagram

#### Scenario: Import invalid JSON
- **WHEN** the user selects a file that is not valid diagram JSON
- **THEN** an error message is displayed and the current diagram state is unchanged

### Requirement: Diagram JSON schema is versioned
The system SHALL include a schema version field in the exported JSON to support future format migrations.

#### Scenario: Export includes schema version
- **WHEN** a diagram is exported
- **THEN** the JSON file contains a `schemaVersion` field with the current version string

### Requirement: User is warned when localStorage is near capacity
The system SHALL display a warning when the diagram state approaches the localStorage size limit (within 80% of 5MB).

#### Scenario: Storage warning shown
- **WHEN** the diagram state reaches 4MB or more in localStorage
- **THEN** a persistent warning message is shown advising the user to export their diagram
