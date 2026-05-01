## MODIFIED Requirements

### Requirement: Completion Generation

The completion command SHALL generate completion scripts for all supported shells on demand.

#### Scenario: Generating Zsh completion

- **WHEN** user executes `openspec completion generate zsh`
- **THEN** output a complete Zsh completion script to stdout
- **AND** include completions for all commands: init, list, show, validate, archive, view, update, change, spec, completion, verify
- **AND** include all command-specific flags and options
- **AND** use Zsh's `_arguments` and `_describe` built-in functions
- **AND** support dynamic completion for change and spec IDs

#### Scenario: Generating Bash completion

- **WHEN** user executes `openspec completion generate bash`
- **THEN** output a complete Bash completion script to stdout
- **AND** include completions for all commands: init, list, show, validate, archive, view, update, change, spec, completion, verify
- **AND** use `complete -F` with custom completion function
- **AND** populate `COMPREPLY` with appropriate suggestions
- **AND** support dynamic completion for change and spec IDs via `openspec __complete`

#### Scenario: Generating Fish completion

- **WHEN** user executes `openspec completion generate fish`
- **THEN** output a complete Fish completion script to stdout
- **AND** include completions for all commands: init, list, show, validate, archive, view, update, change, spec, completion, verify
- **AND** use `complete -c openspec` with conditions
- **AND** include command-specific completions with `--condition` predicates
- **AND** support dynamic completion for change and spec IDs via `openspec __complete`
- **AND** include descriptions for each completion option

#### Scenario: Generating PowerShell completion

- **WHEN** user executes `openspec completion generate powershell`
- **THEN** output a complete PowerShell completion script to stdout
- **AND** include completions for all commands: init, list, show, validate, archive, view, update, change, spec, completion, verify
- **AND** use `Register-ArgumentCompleter -CommandName openspec`
- **AND** implement scriptblock that handles command context
- **AND** support dynamic completion for change and spec IDs via `openspec __complete`
- **AND** return `[System.Management.Automation.CompletionResult]` objects

#### Scenario: Verify command subcommand completion

- **WHEN** user types `openspec verify <TAB>`
- **THEN** the shell SHALL suggest verify subcommands: phase1, phase2, seal, status
- **AND** each subcommand SHALL complete its flags (e.g., `--input`, `--json`, `--type`, `--files`)
- **AND** each subcommand SHALL accept `<change-name>` as positional argument with dynamic change-id completion

## ADDED Requirements

### Requirement: Command Registry

The `COMMAND_REGISTRY` constant SHALL include all CLI commands, including `verify` with its subcommands.

#### Scenario: Verify command registered

- **WHEN** the `COMMAND_REGISTRY` is loaded
- **THEN** it SHALL contain a `verify` entry with description "Programmatic verify gates for changes"
- **AND** it SHALL have subcommands: phase1, phase2, seal, status
- **AND** phase1 SHALL have flags: `--input`, `--json` and positional type `change-id`
- **AND** phase2 SHALL have flags: `--type`, `--files`, `--input`, `--json` and positional type `change-id`
- **AND** seal SHALL have flags: `--json` and positional type `change-id`
- **AND** status SHALL have flags: `--json` and positional type `change-id`
