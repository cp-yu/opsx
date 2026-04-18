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
- Check \`openspec/project.opsx.code-map.yaml\` for code location references
- Check \`openspec/specs/\` for behavior documentation
- Treat it as navigation context, not as a replacement for change artifacts
`.trim();

/**
 * Backward-compatible alias for older consumers.
 */
export const OPSX_READ_CONTEXT = OPSX_SHARED_CONTEXT;

/**
 * Fragment: Generate opsx-delta.yaml
 * Used in: propose, ff-change
 */
export const OPSX_GENERATE_DELTA = `
**Generate opsx-delta.yaml**:
- Read \`proposal.md\` to extract the capability list
- Read all delta specs in \`openspec/changes/<name>/specs/*/spec.md\`
- Read \`openspec/project.opsx.yaml\` if it exists for current-system context
- Generate \`openspec/changes/<name>/opsx-delta.yaml\` using ADDED / MODIFIED / REMOVED sections
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
- Validate \`opsx-delta.yaml\` against the same dry-run merge contract used by downstream sync/archive prepare:
  - Reuse the semantics of \`prepareChangeSync()\` in \`src/core/change-sync.ts\`
  - Read the current OPSX files, dry-run the delta merge, then check referential integrity and code-map integrity
  - Do NOT run \`openspec sync\` for this check because it mutates project files
  - If \`openspec/project.opsx.yaml\` does not exist, skip this OPSX merge-based validation and report the skip in the final summary
- Run lightweight structure checks for \`proposal.md\`, \`design.md\`, and \`tasks.md\` against the current schema templates, not scattered examples:
  - Read \`openspec instructions proposal --change "<name>" --json\`, \`openspec instructions design --change "<name>" --json\`, and \`openspec instructions tasks --change "<name>" --json\`
  - Check only key required headings and checkbox structure
  - Do NOT invent semantic lint rules beyond the current templates
- If warnings are found, do exactly one repair pass on the generated artifacts, then re-check once
- Final summary MUST separate:
  - fixed warnings
  - remaining warnings
  - skipped checks
- Even with remaining warnings, you MAY still declare the change ready for \`/opsx:apply\`, but disclose the residual issues explicitly
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
 * Fragment: Apply docLanguage only to natural-language prose
 * Used in: propose, continue-change, apply-change, ff-change
 */
export const ARTIFACT_DOC_LANGUAGE_CONTRACT = `
**Document Language Contract**:
- Treat \`openspec/config.yaml\` as the compact source of truth, but consume its compiled prompt projection rather than reinterpreting raw keys ad hoc
- If the compiled projection includes \`docLanguage\`, apply it only to natural-language prose you write in the artifact body
- Follow the existing template structure exactly; do not invent a different layout because the prose language changes
- Keep template headings, IDs, schema keys, relation types, BDD keywords, file paths, commands, and code identifiers in their canonical form
- If no \`docLanguage\` projection is present, keep the default writing behavior for prose
`.trim();
