## MODIFIED Requirements

### Requirement: Profile Configuration Flow

The `openspec config profile` command SHALL support first-class `core` and `expanded` presets in addition to custom workflow selection.

#### Scenario: Expanded preset is available
- **WHEN** user runs `openspec config profile`
- **THEN** the profile flow SHALL expose `core` and `expanded` as named workflow modes
- **AND** `expanded` SHALL map to the fixed workflow set:
  - `propose`
  - `explore`
  - `apply`
  - `archive`
  - `new`
  - `continue`
  - `ff`
  - `verify`
  - `sync`
  - `bulk-archive`
  - `onboard`

#### Scenario: Bootstrap remains separately selectable
- **WHEN** user selects `expanded`
- **THEN** workflow `bootstrap-opsx` SHALL NOT be included by default
- **AND** it MAY still be selected separately through custom workflow configuration

#### Scenario: Expanded preset stays stable
- **WHEN** the system reads or writes expanded profile configuration
- **THEN** the expanded workflow membership SHALL remain deterministic
- **AND** the preset SHALL NOT depend on documentation-only conventions or inferred lists

#### Scenario: Applying changed profile still uses update flow
- **WHEN** profile settings are changed in an OpenSpec project
- **THEN** the command SHALL prompt whether to apply changes to the current project
- **AND** if not applied immediately, the command SHALL instruct the user to run `openspec update`
