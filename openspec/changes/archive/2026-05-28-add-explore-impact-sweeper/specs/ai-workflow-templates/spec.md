## ADDED Requirements

### Requirement: Explore invokes impact sweeper
`openspec-explore` SHALL invoke `openspec-impact-sweeper` when exploration reaches a code-change concept that needs impact discovery, a user term does not clearly map to project terminology and affects scope, or the agent is preparing to say the discussion is ready for proposal/change artifacts.

The explore agent SHALL treat the sweeper as a reusable method that may be invoked multiple times in one conversation, one concept per invocation. The explore agent SHALL read the JSON report path returned by the sweeper before summarizing impact findings to the user.

#### Scenario: Proposal readiness requires a sweep
- **WHEN** `openspec-explore` is about to recommend creating or updating proposal/change artifacts
- **AND** the current code-change concept has not already been swept in the conversation
- **THEN** the agent SHALL invoke `openspec-impact-sweeper`
- **AND** SHALL read the generated JSON report before saying the discussion is ready for proposal

#### Scenario: New concept triggers another sweep
- **WHEN** the user introduces a new module, workflow, command, configuration key, project concept, or unfamiliar domain term during explore
- **AND** the term may affect implementation scope
- **THEN** the agent SHALL invoke `openspec-impact-sweeper` for that concept
- **AND** SHALL keep the sweep independent from prior concept sweeps

#### Scenario: Scope-affecting uncertainty asks the user
- **WHEN** the sweeper report includes questions that affect scope or proposal readiness
- **THEN** `openspec-explore` SHALL ask the user instead of silently choosing one interpretation
- **AND** SHALL not claim proposal readiness until the scope-affecting question is resolved or explicitly deferred by the user

### Requirement: Impact sweeper report contract
`openspec-impact-sweeper` SHALL accept lightweight location and concept input from the caller: `projectRoot`, `concept`, optional `optionalChangeName`, optional `knownUserTerms`, and optional `focus`.

The sweeper SHALL write a JSON report under `openspec/sweeper/impact-sweep-<english-project-term-slug>.json` relative to `projectRoot`, overwriting the same concept path on repeat runs. The JSON report SHALL use this schema shape:

```json
{
  "concept": "string",
  "projectRoot": "string",
  "termMappings": [
    {
      "userTerm": "string",
      "projectTerms": ["string"],
      "evidence": ["string"]
    }
  ],
  "opsx": {
    "nodes": [
      {
        "id": "string",
        "reason": "string"
      }
    ],
    "relationsExpanded": [
      {
        "from": "string",
        "to": "string",
        "type": "string"
      }
    ],
    "coverageGaps": ["string"]
  },
  "mustChange": [
    {
      "target": "string",
      "reason": "string",
      "evidence": ["string"]
    }
  ],
  "mustCheck": [
    {
      "target": "string",
      "reason": "string",
      "evidence": ["string"]
    }
  ],
  "coverageGaps": ["string"],
  "questions": ["string"]
}
```

The sweeper response SHALL contain only the report path on success. The report content MAY use natural language in item values, but the JSON field names SHALL remain canonical.

#### Scenario: Sweeper writes project report
- **WHEN** `openspec-impact-sweeper` completes an impact sweep for concept `explore impact sweep`
- **THEN** it SHALL write `openspec/sweeper/impact-sweep-explore-impact-sweep.json`
- **AND** SHALL return that path to the caller
- **AND** SHALL not emit a separate summary

#### Scenario: Sweeper prepares ignored report directory
- **WHEN** `openspec/sweeper/` does not exist
- **THEN** the sweeper SHALL create it
- **AND** SHALL ensure `openspec/sweeper/.gitignore` exists with content that ignores reports while keeping `.gitignore`
- **AND** SHALL NOT modify an existing `.gitignore`

### Requirement: Impact sweeper evidence collection
`openspec-impact-sweeper` SHALL ground impact discovery in OPSX before broad code search. It SHALL read `openspec/project.opsx.yaml`, `openspec/project.opsx.code-map.yaml`, and `openspec/project.opsx.relations.yaml` when present. It SHALL inspect one-hop OPSX neighbors for matched nodes and SHALL expand to second-hop only when the first-hop node is shared infrastructure, cross-domain, or code search shows outward runtime use.

The sweeper SHALL use `git ls-files` as the repository search boundary when available and SHALL exclude `openspec/changes/archive/**`. It SHALL perform repo-wide reverse search for mapped project terms, exported symbols, workflow/skill names, command names, config keys, template fragment names, and path references. It SHALL not rely only on OPSX code-map paths.

#### Scenario: OPSX first then reverse search
- **WHEN** the concept maps to an OPSX capability
- **THEN** the sweeper SHALL read matching OPSX node intent, code-map refs, and direct relations
- **AND** SHALL perform repo-wide reverse search for key mapped project terms and symbols
- **AND** SHALL classify relevant targets into `mustChange`, `mustCheck`, `coverageGaps`, or `questions`

#### Scenario: Multiple term mappings are explored
- **WHEN** a user term maps plausibly to multiple project terms
- **THEN** the sweeper SHALL search all plausible mappings
- **AND** SHALL record mappings and evidence in `termMappings`
- **AND** SHALL put scope-changing ambiguity into `questions`

#### Scenario: Optional change artifacts are scoped
- **WHEN** `optionalChangeName` is provided
- **THEN** the sweeper SHALL read only that change's proposal, specs, design, tasks, and opsx-delta if they exist
- **AND** SHALL NOT inspect unrelated active changes

### Requirement: Impact sweeper write and execution boundaries
`openspec-impact-sweeper` SHALL perform read-only analysis except for its report directory writes. It MAY create `openspec/sweeper/`, create `openspec/sweeper/.gitignore` if missing, and write or overwrite its JSON report. It SHALL NOT modify source files, specs, change artifacts, OPSX files, config, package files, tests, or generated workflow files.

The sweeper SHALL NOT run tests, builds, installs, `git diff`, `git status`, or `git log` as impact evidence. It MAY use `git ls-files`, file reads, and text search. Reports under `openspec/sweeper/` SHALL be treated as working notes, not proposal, design, tasks, specs, OPSX delta, sync input, or archive input.

#### Scenario: No tests or git diff
- **WHEN** the sweeper needs impact evidence
- **THEN** it SHALL use OPSX files, main specs, optional selected change artifacts, git tracked file listing, and text search
- **AND** SHALL NOT run `npm test`, build commands, `git diff`, `git status`, or `git log`

#### Scenario: Only sweeper report files are written
- **WHEN** the sweeper writes output
- **THEN** it SHALL write only under `openspec/sweeper/`
- **AND** SHALL NOT modify any formal OpenSpec artifact or implementation file
