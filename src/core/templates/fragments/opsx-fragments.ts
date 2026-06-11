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
 * Backward-compatible alias for older consumers.
 */
export const OPSX_READ_CONTEXT = OPSX_SHARED_CONTEXT;

/**
 * Fragment: CLI-backed OPSX query context
 * Used in: propose, apply-change
 */
export const OPSX_CLI_QUERY_CONTEXT = `
After reading shared \`project.opsx.yaml\` context, use OpenSpec CLI query surfaces for node details.
- Run \`openspec list --specs --json\` to get specs and their \`capabilities\` string arrays; specs without frontmatter return \`capabilities: []\`.
- For known or affected OPSX node IDs, run \`openspec opsx query <node-id...> --json\` to get node details, relations and code-map refs in one batch; add \`--depth 2\` when broader related context is needed.
- Treat CLI output as navigation context, not as a replacement for change artifacts.
`.trim();

/**
 * Fragment: Generate opsx-delta.yaml
 * Used in: propose, ff-change
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
  - When \`Verifies:\` anchors an ordinary requirement, verify change-local spec path plus Requirement and ≥1 Scenario names when local change specs exist
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
 * Fragment: Verify result freshness rules
 * Used in: archive-change
 */
export const VERIFY_FRESHNESS_RULES = `
**Verify Result Freshness Rules**:

A verify result is considered **FRESH** if ALL of the following hold:
- \`.verify-result.json\` exists in the change directory
- \`verificationContext.evidenceFingerprint\` matches the current workspace fingerprint
- \`verificationContext.contractVersion\` is \`"1.0"\`
- \`result\` is \`PASS\` or \`PASS_WITH_WARNINGS\`

A verify result is considered **STALE** if ANY of the following hold:
- \`verificationContext.evidenceFiles\` is missing or the file list changed
- \`verificationContext.evidenceFingerprint\` does not match the recomputed fingerprint
- \`verificationContext.gitHeadCommit\` does not match the current HEAD (if recorded)
- \`verificationContext.contractVersion\` is missing or not \`"1.0"\`
- \`result\` is not \`PASS\` or \`PASS_WITH_WARNINGS\`

**Optimization metadata compatibility**:
- \`optimization\` metadata is advisory for archive gating, not part of the freshness hash inputs
- Legacy verify results without \`optimization\` may still be fresh if every freshness rule above passes
- If \`optimization.status\` exists, evaluate its acceptability separately from freshness

**When verify result is STALE or MISSING**:
- Archive MUST execute full verify before continuing
- Do NOT attempt to repair or reuse a stale verify result

**Fingerprint Computation**:
- Sort \`evidenceFiles\` alphabetically before hashing
- For each evidence file, collect normalized relative POSIX path + content hash
- Hash the JSON-serialized entries with SHA-256
- Use \`path.join()\`, \`path.resolve()\`, and \`path.normalize()\` for all path handling
- Persist \`evidenceFiles\` as relative POSIX paths for cross-platform comparison
`.trim();

/**
 * Fragment: Verify coordinator role declaration
 * Used in: verify-change
 */
export const VERIFY_COORDINATOR_ROLE = `
**Verification Coordinator Role**:

You are the verification coordinator, not the verification judge.

| Role | Responsibility |
| --- | --- |
| Coordinator (top-level agent) | Determine changeDir/projectRoot, pass location inputs to subagents, validate payload shape, perform deterministic write-back, manage git checkpoints, and persist results through CLI |
| Reviewer Subagent | Read files and run tests/git commands as needed; own all completeness, correctness, and coherence judgments |
| Optimizer Subagent | Read files and propose behavior-preserving Search/Replace blocks; never edit files directly |
| CLI | Persist results deterministically, compute hashes, and validate seal state |

Core constraint: You MUST NOT substitute your own completeness/correctness/coherence judgments for the reviewer's.
`.trim();

/**
 * Fragment: Git evidence usage rules
 * Used in: verify-change
 */
export const GIT_EVIDENCE_PROTOCOL = `
**Git Evidence Usage Protocol**:
- Use \`git status\`, \`git diff\`, and \`git log -5 --oneline\` to discover candidate files and suspicious gaps
- Git diff hunks are investigation clues, NOT sufficient proof that a requirement is satisfied
- Final judgment MUST be based on the final file contents after all changes
- If a diff looks correct but the final file still diverges from the spec, report the divergence
- If a requirement is satisfied outside the current diff, still mark it covered and cite the final file evidence

**Evidence Priority Order**:
1. Change artifacts (proposal, specs, design, tasks) define what should exist
2. Git evidence points to likely implementation areas
3. Final file contents are the authoritative basis for judgment
4. Tests and test results confirm scenario coverage
`.trim();

/**
 * Fragment: Clean-context verify protocol for tools with subagents
 * Used in: tool-specific verify-change templates
 */
export const CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT = `
**Clean-Context Verification Protocol**:

Use the subagent-orchestrated verify skeleton.

**Top-level agent responsibilities before invoking the reviewer subagent**:
- Determine \`changeName\`, absolute \`changeDir\`, and absolute \`projectRoot\`
- State that the reviewer subagent has Read and Bash tool capability
- Instruct the reviewer subagent to invoke \`openspec-reviewer\`

**Top-level agent restrictions**:
- Do NOT collect artifact contents, git evidence, or final file contents for the reviewer
- Pass only \`changeName\`, \`changeDir\`, and \`projectRoot\` to the reviewer subagent
- Apply any write-back plan in the main workspace after validating the reviewer payload

**Record in verify result**:
- \`executionMode: 'subagent-orchestrated'\`
`.trim();

/**
 * Fragment: Structured reviewer contract for subagent-orchestrated verify
 * Used in: verify-change, archive-change
 */
export const VERIFY_REVIEWER_SUBAGENT_CONTRACT = `
**Reviewer Subagent Contract**:
- Treat implementation conversation history as unavailable and non-authoritative
- Base every judgment only on the explicit inputs provided by the top-level agent
- Own all completeness, correctness, coherence, and speculative fence verdicts
- For each requirement, cite specific file paths and line ranges as evidence
- Follow the step-by-step objective verification protocol before assigning severity
- Return a structured assessment containing:
  - \`result\`: \`PASS\` / \`PASS_WITH_WARNINGS\` / \`FAIL_NEEDS_REMEDIATION\`
  - \`issues\`: severity, requirement linkage, task linkage, recommendations, and evidence citations
  - \`summary\`: scorecard data for completeness / correctness / coherence
  - \`writeBackPlan\`: typed instructions for \`tasks.md\` updates when CRITICAL issues exist
  - \`evidenceFiles\`: the relative POSIX paths actually used for judgment
  - \`gitDiffSummary\`: a concise summary of git evidence considered
`.trim();

/**
 * Fragment: Clean-context verify protocol for tools without subagents
 * Used in: verify-change
 */
export const CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD = `
**Clean-Context Verification Protocol**:

Execute verification in the current agent with an explicit re-read protocol.

**Before making ANY verification judgment**:
1. Re-read all change artifacts from disk: \`proposal.md\`, \`specs/\`, \`design.md\`, \`tasks.md\`
2. Re-run git commands: \`git status\`, \`git diff\`, \`git log -5 --oneline\`
3. Re-read the final file contents for candidate implementation files identified from git evidence
4. Re-read prior \`.verify-result.json\` if it exists

**Important**:
- Treat implementation conversation history as non-authoritative background context
- Base all judgments ONLY on freshly read evidence
- Follow the step-by-step objective verification protocol before assigning severity

**Record in verify result**:
- \`executionMode: 'current-agent-reread'\`
`.trim();

/**
 * Fragment: Phase 2 optimization protocol for tools with subagents
 * Used in: verify-change
 */
export const OPTIMIZATION_PROTOCOL_SUBAGENT = `
**Phase 2 Optimization Protocol**:

Spawn a second clean-context optimization subagent only after the canonical Phase 1 result is \`PASS\` or \`PASS_WITH_WARNINGS\`.

**Inputs to pass to the optimization subagent**:
- Canonical Phase 1 summary, issues, and evidence file list
- Change artifacts: \`proposal.md\`, \`specs/\`, \`design.md\`, \`tasks.md\`
- Final file contents for the candidate implementation files
- Project policy context from \`openspec/config.yaml\`, including \`optimization.enabled\`

**Optimization subagent contract**:
- Treat prior implementation conversation as unavailable and non-authoritative
- Optimize existing tracked files only; do NOT create, delete, or rename files
- Prefer simpler structure, lower duplication, clearer control flow, and better locality without changing behavior
- If no meaningful improvement is needed, return exactly: \`No optimization opportunities found\`
- Otherwise return one or more Search/Replace blocks with explicit file paths

**Search/Replace block format**:
\`\`\`text
<<<PATH: relative/path/to/file.ts
<<<SEARCH
exact old text
===
replacement new text
>>>REPLACE
\`\`\`

**Search/Replace constraints**:
- Each block must target exactly one existing file
- The SEARCH payload must be specific enough to match exactly one location
- The main agent applies blocks by trying exact match first, then whitespace-normalized matching
- All blocks must pre-validate before any file write occurs
- A block that matches zero or multiple locations is invalid and must be regenerated
`.trim();

/**
 * Fragment: Subagent timeout and waiting rules
 * Used in: verify-change
 */
export const VERIFY_SUBAGENT_TIMEOUT_RULES = `
**Subagent Timeout and Waiting Rules**:
- Use a 10 minute waiting budget for each subagent delegation before asking the user whether to continue waiting or terminate
- Wait for the complete subagent payload before moving to payload validation, Search/Replace application, speculative verification, or CLI persistence
- If a subagent does not return within a short default timeout, keep polling or waiting; do NOT treat that as failure
- If the wait exceeds the 10 minute budget, ask the user whether to continue waiting or terminate the subagent
- Never terminate a subagent without explicit user confirmation
- The top-level agent MUST receive the complete subagent payload before entering the next mode
`.trim();

/**
 * Fragment: Verify OPSX alignment
 * Used in: verify-change
 */
export const OPSX_VERIFY_ALIGNMENT = `
**OPSX Alignment** (if \`opsx-delta.yaml\` exists):
- Check if \`opsx-delta.yaml\` exists in \`openspec/changes/<name>/\`
- If exists, verify OPSX alignment:
  - **Referential integrity**: All relation from/to references must exist in the delta or project.opsx.yaml
  - **Code-map integrity**: All code-map node IDs must reference existing domains or capabilities
  - If misalignment found:
    - Add WARNING: "OPSX delta not reflected in code: <capability>"
    - Recommendation: "Update code or revise opsx-delta.yaml"
`.trim();

/**
 * Fragment: Shared conformance check rules
 * Used in: verify-change, archive-change
 */
export const CONFORMANCE_CHECK_RULES = `
**Conformance Check Rules**:
- For each delta-spec requirement, search for concrete implementation evidence in code and tests before concluding status
- Classify issues using strict thresholds:
  - **CRITICAL**: required behavior is missing, directly contradicted, or no credible implementation evidence exists
  - **WARNING**: implementation exists but may diverge from the requirement, scenario coverage is incomplete, or artifact/code drift is likely
  - **SUGGESTION**: minor pattern or clarity issues that do not block archive
- Map every issue to the most specific requirement and, when possible, the task that claimed completion
- Cite file paths and line ranges for both supporting evidence and missing evidence
- Only escalate to **CRITICAL** when the confidence is high enough to justify automatic task write-back
- Follow a step-by-step objective verification loop:
  1. **Locate**: identify candidate files from requirement keywords and git evidence
  2. **Read**: inspect actual final file contents, not just search hits or diffs
  3. **Analyze**: compare implementation details against requirement intent and scenarios
  4. **Cite**: record concrete file paths and line ranges as evidence
  5. **Judge**: assign PASS / WARNING / CRITICAL based on evidence strength
  6. **Explain**: state exactly what is missing, divergent, or still uncertain
- Evidence standards:
  - PASS requires clear, cited evidence from final file contents
  - WARNING is appropriate when implementation likely exists but confidence is not high enough for PASS
  - CRITICAL requires a thorough search with no credible implementation evidence
  - Always cite file:line evidence for both positive and negative findings
`.trim();

/**
 * Fragment: Verify write-back rules
 * Used in: verify-change, archive-change
 */
export const VERIFY_WRITEBACK_RULES = `
**Verify Write-back Rules**:
- Only **CRITICAL** issues may mutate \`tasks.md\`
- For each CRITICAL issue tied to a completed task, change the matching task checkbox from \`[x]\` to \`[ ]\`
- Never unmark tasks for WARNING or SUGGESTION issues
- Append or update a \`## Remediation\` section in \`tasks.md\` when fixes are needed
- Format each remediation item as \`- [ ] [code_fix]\` or \`- [ ] [artifact_fix]\` followed by the requirement, issue summary, and concrete next action
- Use \`[code_fix]\` when code or tests must change to satisfy the requirement
- Use \`[artifact_fix]\` when the correct fix is to update spec/design/tasks to match reality
- Avoid duplicate remediation entries across repeated verify/archive runs; update existing entries when the same issue is found again
`.trim();

/**
 * Fragment: Verify state machine diagram
 * Used in: apply-change, archive-change, verify-change
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
 * Used in: apply-change, archive-change, verify-change
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
 * Used in: apply-change, verify-change
 */
export const VERIFY_ERROR_RECOVERY_GUIDE = `
**Verify CLI Error Recovery Guide**:
- If the CLI says \`Invalid JSON input\`: re-check that \`--input\` is a JSON string, not a file path; \`issues\` must be an array and \`evidenceFiles\` must be an array of strings
- If the CLI says \`status must be NO_OPTIMIZATION_NEEDED, OPTIMIZATION_PROPOSED, ABORTED_UNSAFE, or SKIPPED\`: fix the \`--input.status\` value and confirm whether \`optimization.status\` already has \`affectedFileHashes\`
- If the CLI says \`result must be PASS, PASS_WITH_WARNINGS, or FAIL_NEEDS_REMEDIATION\`: fix the \`--input.result\` value and keep \`issues\` as an array when provided
- If the CLI says \`尚未提交优化结果，请先调用 phase2 --type=optimization\`: call \`phase2 --type=optimization\` before retrying verification
- If the CLI says \`FILES_REQUIRED\`: add \`--files "<affected-files>"\` with the space-separated list of files the optimizer subagent declared as affected, then retry the same command
`.trim();

/**
 * Fragment: Fast path for simple changes
 * Used in: apply-change, archive-change, verify-change
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
 * Fragment: Sync opsx-delta to project.opsx.yaml
 * Used in: sync-specs, archive-change, bulk-archive-change
 */
export const OPSX_SYNC_DELTA = `
**Sync OPSX delta** (if \`opsx-delta.yaml\` exists):
- Check for \`openspec/changes/<name>/opsx-delta.yaml\`
- If exists, merge into the three OPSX files:
  - Apply ADDED nodes (domains, capabilities) to \`project.opsx.yaml\`
  - Apply ADDED relations to \`project.opsx.relations.yaml\`
  - Apply MODIFIED nodes (update existing entries)
  - Apply REMOVED nodes (delete from respective files)
  - Validate referential integrity after merge
  - Use atomic write pattern (temp file + rename) for all three files
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
 * Fragment: Check for opsx-delta before archiving
 * Used in: archive-change, bulk-archive-change
 */
export const OPSX_ARCHIVE_CHECK = `
**OPSX delta sync check**:
- If \`openspec/changes/<name>/opsx-delta.yaml\` exists
- Verify it has been synced to \`openspec/project.opsx.yaml\`
- If not synced, prompt user: "OPSX delta not synced. Run /opsx:sync first?"
`.trim();

/**
 * Fragment: Artifact list including opsx-delta
 * Used in: propose, ff-change, new-change
 */
export const OPSX_ARTIFACT_LIST = `
- opsx-delta.yaml (project OPSX delta, generated after specs are clear)
`.trim();

/**
 * Fragment: Path constants reference
 * Used in: All templates that reference OPSX paths
 */
export const OPSX_PATH_REFERENCE = `
**OPSX Path Constants** (from \`src/utils/opsx-utils.ts\`):
- Structure: \`openspec/project.opsx.yaml\`
- Relations: \`openspec/project.opsx.relations.yaml\`
- Code map: \`openspec/project.opsx.code-map.yaml\`
- Delta: \`openspec/changes/<name>/opsx-delta.yaml\`
`.trim();

/**
 * Fragment: Apply proseLanguage only to natural-language prose
 * Used in: propose, continue-change, apply-change, ff-change
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
