/**
 * Shared OPSX instruction fragments for workflow templates
 *
 * These fragments reduce duplication across workflow templates and ensure
 * consistent OPSX integration patterns.
 */

/**
 * Fragment: Shared OPSX read context
 * Used in: explore, propose, apply-change
 */
export const OPSX_SHARED_CONTEXT = `
Before reading other context files, check whether \`openspec/project.opsx.yaml\` exists.
- If it exists, read it first for domains → capabilities structure
- Read the \`project:\` block for project intent and scope
- Treat it as navigation context, not as a replacement for change artifacts
`.trim();

/**
 * Fragment: CLI-backed OPSX query context
 * Used in: propose, snack, apply-change
 */
export const OPSX_CLI_QUERY_CONTEXT = `
After reading shared \`project.opsx.yaml\` context, use OpenSpec CLI query surfaces for node details.
- Run \`openspec list --specs --json\` to get specs and their \`capabilities\` string arrays; specs without frontmatter return \`capabilities: []\`.
- For known or affected OPSX node IDs, run \`openspec opsx query <node-id...> --json\` to get node details, relations and code-map refs in one batch; add \`--depth 2\` when broader related context is needed.
- Treat CLI output as navigation context, not as a replacement for change artifacts.
`.trim();

/**
 * Fragment: Generate opsx-delta.yaml
 * Used in: propose, snack
 */
export const OPSX_GENERATE_DELTA = `
**Generate opsx-delta.yaml**:
- Read \`openspec instructions opsx-delta --change "<name>" --json\`
- Use the returned \`template\`, \`instruction\`, and \`outputPath\` to generate \`opsx-delta.yaml\`
- Read \`proposal.md\` to extract the capability list
- Read all delta specs in \`openspec/changes/<name>/specs/*/spec.md\`
- For existing capability or domain IDs, run \`openspec opsx query <node-id...> --json\` for current-system context in one batch; add \`--depth 2\` when related context is needed
- Treat \`ADDED\`, \`MODIFIED\`, and \`REMOVED\` as YAML object keys, not Markdown headings
- Follow a concrete YAML object structure such as:
  \`\`\`yaml
  schema_version: 1
  ADDED:
    capabilities:
      - id: cap.example.feature
        type: capability
        intent: Describe the new capability
    relations:
      - from: cap.example.feature
        type: contains
        to: dom.example
  MODIFIED:
    capabilities:
      - id: cap.example.existing
        intent: Updated intent text
  REMOVED:
    capabilities:
      - id: cap.example.legacy
  \`\`\`
- Delta nodes contain only id, type, intent, status — no code_refs or spec_refs
- Keep this agent-driven: capture merge intent in the YAML, not in programmatic code
`.trim();


/**
 * Fragment: Post-propose warning validation
 * Used in: propose
 */
export const OPSX_POST_PROPOSE_VALIDATION = `
**Run post-propose warning validation**:
- This validation is warning-only. Do NOT turn \`/opsx:propose\` into a blocking gate.
- Validate generated change specs against the same contract used by downstream change delta validation:
  - Prefer \`openspec validate "<name>" --type change --json\` when available
  - Align with \`Validator.validateChangeDeltaSpecs()\` semantics for delta sections, SHALL/MUST requirement text, and required \`#### Scenario:\` blocks
- Validate \`opsx-delta.yaml\` through the same programmatic CLI path used by downstream change validation:
  - Prefer \`openspec validate "<name>" --type change --json\` when available
  - Align with \`Validator.validateOpsxDelta()\` semantics for Zod parsing, dry-run \`applyOpsxDelta()\`, referential integrity, and code-map integrity
  - Do NOT run \`openspec sync\` for this check because it mutates project files
  - If \`openspec/project.opsx.yaml\` does not exist, \`Validator.validateOpsxDelta()\` skips this check and the final summary must report the skip
- Run lightweight structure checks for \`proposal.md\`, \`design.md\`, and \`tasks.md\` against the current schema templates, not scattered examples:
  - Read \`openspec instructions proposal --change "<name>" --json\`, \`openspec instructions design --change "<name>" --json\`, and \`openspec instructions tasks --change "<name>" --json\`
  - Check only key required headings and checkbox structure
  - For \`tasks.md\`, run a deterministic task structure check equivalent to \`validateTaskStructure\` in \`src/core/parsers/task-structure.ts\`
  - Programmatically verify either legacy \`Actions\`/\`Checks\` sections or coarse \`### Task N:\` sections with \`Goal\`, \`Files\`, \`Requirements\`, and nested \`Checks\`
  - For legacy tasks, verify \`A\`-prefixed action checkboxes, \`C\`-prefixed check checkboxes, required \`Covers:\` fields, valid \`Covers:\` references, and every action covered by at least one check
  - For coarse tasks, verify each task has no more than 5 requirements and at least one nested \`C\`-prefixed check
  - For every check, verify required non-empty \`Verifies:\` or \`Preserves:\` field
  - When \`Verifies:\` anchors an ordinary requirement, verify change-local \`Verifies:\` spec paths plus Requirement/Scenario references when local change specs exist
  - When \`Verifies:\` anchors a REMOVED requirement, verify it uses \`REMOVED Requirement "<name>"\` syntax (no Scenario required) and the REMOVED requirement exists in the delta spec
  - When \`Preserves:\` is present, verify it uses main spec path (\`openspec/specs/<cap>/spec.md\`) with Requirement and ≥1 Scenario names, and the path whitelist does not relax \`Verifies:\` constraints
  - Verify at least one \`Command:\`, \`Evidence:\`, or \`Expect:\` field per check
  - Do NOT invent semantic lint rules beyond the current templates
  - Do NOT judge whether a check is semantically sufficient; defer semantic suitability to verify/reviewer
- If warnings are found, do exactly one repair pass on the generated artifacts, then re-check once
- Final summary MUST separate:
  - fixed warnings
  - remaining warnings
  - skipped checks
- Even with remaining warnings, you MAY still declare the change ready for \`/opsx:apply\`, but disclose the residual issues explicitly
`.trim();

/**
 * Fragment: Verify state machine diagram
 * Used in: apply-change
 */
export const VERIFY_STATE_MACHINE_DIAGRAM = `
**Verify State Machine**:
\`\`\`
Phase 1 PASS / PASS_WITH_WARNINGS
  |
  v
PENDING_VERIFICATION
  |-- no affectedFileHashes --> Phase 2 optimization analysis
  |                              |-- NO_OPTIMIZATION_NEEDED --> NOT_NEEDED
  |                              |-- SKIPPED / optimization.enabled=false --> SKIPPED
  |-- affectedFileHashes ------> PENDING_VERIFICATION (optimization proposed)
                                 |-- verification PASS --> IMPROVED
                                 |-- verification FAIL_NEEDS_REMEDIATION --> retry or DEGRADED
                                 |-- retries exhausted --> DEGRADED

Archive gate accepts: SKIPPED | NOT_NEEDED | IMPROVED | DEGRADED
Archive gate rejects: PENDING_VERIFICATION | ABORTED_UNSAFE
\`\`\`
`.trim();

/**
 * Fragment: Verify CLI JSON schema reference
 * Used in: apply-change
 */
export const VERIFY_CLI_JSON_SCHEMA_REFERENCE = `
**Verify CLI JSON Schema Reference**:

| CLI call | \`--input\` JSON |
| --- | --- |
| \`openspec verify phase1 "<change-name>" --input '<json>' --json\` | \`{"result":"PASS","issues":[],"evidenceFiles":["..."],"executionMode":"..."}\` |
| \`openspec verify phase2 "<change-name>" --type=optimization --input '<json>' --json\` | \`{"status":"NO_OPTIMIZATION_NEEDED","summary":"..."}\` (summary is required, must be non-empty) |
| \`openspec verify phase2 "<change-name>" --type=optimization --files "<affected-files>" --input '<json>' --json\` | \`{"status":"OPTIMIZATION_PROPOSED","summary":"..."}\` |
| \`openspec verify phase2 "<change-name>" --type=optimization --input '<json>' --json\` | \`{"status":"SKIPPED"}\` |
| \`openspec verify phase2 "<change-name>" --type=verification --input '<json>' --json\` | \`{"result":"PASS","issues":[]}\` |
| \`openspec verify phase2 "<change-name>" --type=verification --input '<json>' --json\` | \`{"result":"FAIL_NEEDS_REMEDIATION","issues":[...],"behaviorRetryCounter":N}\` |
`.trim();

/**
 * Fragment: Verify error recovery guide
 * Used in: apply-change
 */
export const VERIFY_ERROR_RECOVERY_GUIDE = `
**Verify CLI Error Recovery Guide**:
- If the CLI says \`Invalid JSON input\`: re-check that \`--input\` is a JSON string, not a file path; \`issues\` must be an array and \`evidenceFiles\` must be an array of strings
- If the CLI says \`status must be NO_OPTIMIZATION_NEEDED, OPTIMIZATION_PROPOSED, ABORTED_UNSAFE, or SKIPPED\`: fix the \`--input.status\` value and confirm whether \`optimization.status\` already has \`affectedFileHashes\`
- If the CLI says \`result must be PASS, PASS_WITH_WARNINGS, or FAIL_NEEDS_REMEDIATION\`: fix the \`--input.result\` value and keep \`issues\` as an array when provided
- If the CLI says \`Optimization not yet submitted, call phase2 --type=optimization first\`: call \`phase2 --type=optimization\` before retrying verification
- If the CLI says \`FILES_REQUIRED\`: add \`--files "<affected-files>"\` with the space-separated list of files the optimizer subagent declared as affected, then retry the same command
`.trim();

/**
 * Fragment: Fast path for simple changes
 * Used in: apply-change
 */
export const VERIFY_SIMPLE_CHANGE_FAST_PATH = `
**Simple Change Fast Path**:
- You MUST spawn the optimizer subagent at least once for every change, including pure deletions, renames, or parameter removals
- The optimizer subagent (not the master agent) decides whether optimization opportunities exist
- If the optimizer subagent returns "No optimization opportunities found", record \`NO_OPTIMIZATION_NEEDED\` with the optimizer's conclusion as the \`summary\` field:
  \`\`\`bash
  openspec verify phase2 "<change-name>" --type=optimization --input '{"status":"NO_OPTIMIZATION_NEEDED","summary":"<optimizer conclusion>"}' --json
  \`\`\`
- The master agent MUST NOT self-determine that no optimization is needed without spawning the optimizer subagent
- The only conditions that bypass the optimizer subagent are: \`--skip-optimization\` flag or \`optimization.enabled: false\` in config
`.trim();

/**
 * Fragment: OPSX-first navigation guidance
 * Used in: explore
 */
export const OPSX_NAVIGATION_GUIDANCE = `
**OPSX-first navigation**:
If \`openspec/project.opsx.yaml\` exists:
- Use \`project.opsx.yaml\` for domains → capabilities structure
- Use \`project.opsx.code-map.yaml\` to locate implementation files
- Use \`openspec/specs/\` for behavior documentation
- Cross-reference domains to understand system boundaries
`.trim();

/**
 * Fragment: Apply proseLanguage only to natural-language prose
 * Used in: propose, snack, apply-change
 */
export const ARTIFACT_DOC_LANGUAGE_CONTRACT = `
**Document Language Contract**:
- Treat \`openspec/config.yaml\` as the compact source of truth, but consume its compiled prompt projection rather than reinterpreting raw keys ad hoc
- If the compiled projection includes \`proseLanguage\`, apply it to natural-language prose you write or revise in the artifact body
- Natural-language prose includes task titles, check names, Requirement titles, Scenario titles, bullet descriptions, Expect/Evidence descriptions, rationale, goals, risks, and summaries
- Follow the existing template structure exactly; do not invent a different layout because the prose language changes
- Keep template headings, normative keywords, BDD keywords, IDs, schema keys, relation types, file paths, commands, and code identifiers in their canonical form
- Preserve exact existing Requirement titles required for MODIFIED matching
- English project terminology may remain embedded in prose, but ordinary English sentences and titles still follow \`proseLanguage\`
- If no \`proseLanguage\` projection is present, keep the default writing behavior for prose
`.trim();
