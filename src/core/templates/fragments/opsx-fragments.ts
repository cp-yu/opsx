/**
 * Shared OPSX instruction fragments for workflow templates
 *
 * These fragments reduce duplication across workflow templates and ensure
 * consistent OPSX integration patterns.
 */

/**
 * Fragment: Read project.opsx.yaml for context
 * Used in: apply-change, explore
 */
export const OPSX_READ_CONTEXT = `
Before reading other context files, check whether \`openspec/project.opsx.yaml\` exists.
- If it exists, read it first for domains → capabilities structure
- Check \`openspec/project.opsx.code-map.yaml\` for code location references
- Check \`openspec/specs/\` for behavior documentation
- Treat it as navigation context, not as a replacement for change artifacts
`.trim();

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
- Before creating or updating any OpenSpec artifact, read \`openspec/config.yaml\` if it exists
- If it defines \`docLanguage\`, use it only for natural-language prose you write in the artifact body
- Follow the existing template structure exactly; do not invent a different layout because the prose language changes
- Keep template headings, IDs, schema keys, relation types, BDD keywords, file paths, commands, and code identifiers in their canonical form
- If \`docLanguage\` is missing, keep the default writing behavior for prose
`.trim();
