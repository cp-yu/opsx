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
- If it exists, read it first
- Use it to navigate the codebase via domains → capabilities → code_refs
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
  - **spec_refs bidirectional**: Each capability in opsx-delta should reference relevant specs, and vice versa
  - **Referential integrity**: All relation from/to references must exist in the delta or project.opsx.yaml
  - **Code alignment**: Check if capabilities in ADDED/MODIFIED have corresponding code_refs
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
- If exists, merge into \`openspec/project.opsx.yaml\`:
  - Apply ADDED nodes (domains, capabilities, invariants, etc.)
  - Apply MODIFIED nodes (update existing entries)
  - Apply REMOVED nodes (delete from project.opsx.yaml)
  - Validate referential integrity after merge
  - Use atomic write pattern (temp file + rename)
`.trim();

/**
 * Fragment: OPSX-first navigation guidance
 * Used in: explore
 */
export const OPSX_NAVIGATION_GUIDANCE = `
**OPSX-first navigation**:
If \`openspec/project.opsx.yaml\` exists:
- Start with L0 (domains) → L1 (capabilities) → L2 (code_refs) hierarchy
- Use domains to understand system boundaries
- Use capabilities to identify feature areas
- Use code_refs to locate implementation files
- Cross-reference with spec_refs for documentation
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
- Single file: \`openspec/project.opsx.yaml\`
- Sharded dir: \`openspec/project.opsx/\`
- Delta: \`openspec/changes/<name>/opsx-delta.yaml\`
`.trim();
