/**
 * Snack workflow template (code-first lightweight sync).
 *
 * Reverse direction of propose/explore/apply: from already-written code back to
 * specs + OPSX delta. Generates proposal, specs, and a simplified design.md;
 * never generates tasks.md because the code is already implemented.
 */
import type { SkillTemplate } from '../types.js';
import {
  ARTIFACT_DOC_LANGUAGE_CONTRACT,
  OPSX_CLI_QUERY_CONTEXT,
  OPSX_GENERATE_DELTA,
  OPSX_SHARED_CONTEXT,
} from '../fragments/opsx-fragments.js';

export function getSnackSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-snack',
    description:
      'Quick code-first sync: generate or update proposal + specs + simplified design from git diff when the code is already written. Use after iterative coding to back-fill specs and OPSX delta without redoing propose→apply. Does not generate tasks.md.',
    instructions: `Synchronize specs and OPSX from already-written code (code-first, reverse of propose/apply).

## Input

- Optional \`<change-name>\` (kebab-case).
- If omitted, run \`openspec list --json\` and reuse the single active change; if multiple or none, ask which change name to target.

## Flow

1. Resolve change name. If \`openspec/changes/<name>/\` does not exist, run \`openspec new change "<name>"\`; otherwise update in place (do not recreate proposal).
2. Load shared OPSX context before generating artifacts.
${OPSX_SHARED_CONTEXT}
3. Analyze the code change with git diff.
   - Run \`git diff --name-only\` (and \`git diff --cached --name-only\` when needed) to list modified files.
   - Run \`git diff\` to inspect symbol-level changes (new/deleted exports, modified signatures).
   - Exclude non-code files (\`.md\`, \`.json\`, \`.yaml\`, lock files) from spec inference.
4. Reverse-map files to capabilities via code-map.
   - Read \`openspec/project.opsx.code-map.yaml\` and map each modified path to its capability/domain node IDs.
   - Files without a code-map entry are [REVIEW NEEDED] candidates for new capabilities.
5. Use CLI-backed OPSX navigation after code-map reverse lookup.
${OPSX_CLI_QUERY_CONTEXT}
6. Generate \`proposal.md\` (lightweight): scope of the code change, affected capabilities, no tasks.
7. Generate delta specs in \`specs/<capability>/spec.md\` using mid-level inference:
   - New code-map capability → \`## ADDED Requirements\` with BDD scenarios inferred from function signatures + conversation context.
   - Modified existing capability → \`## MODIFIED Requirements\` inferring behavior change.
   - Mark uncertain inferences with \`[REVIEW NEEDED]\`.
   - Before writing, run \`openspec list --specs --json\` and reuse existing specs when capabilities overlap (specs without frontmatter return \`capabilities: []\`).
8. Generate simplified \`design.md\`:
   - **Context**: background inferred from git diff.
   - **Decisions**: implementation path marked \`[INFERRED FROM CODE]\`.
   - **Risks / Trade-offs**: items marked \`[REVIEW NEEDED]\`.
   - **Open Questions**: "无（代码已实现）".
9. OPSX delta heuristic — generate \`opsx-delta.yaml\` ONLY when git diff shows new/deleted exports or new files; otherwise skip and log "未检测到架构级变更，跳过 OPSX delta 生成".
   ${OPSX_GENERATE_DELTA}
10. Do NOT generate \`tasks.md\` (code is already implemented).
11. Finish with the output hints below.

## Output Hints

After artifacts are generated, output:

**快速路径（跳过 verify）：**
- 继续开发: \`openspec sync "<change-name>" --no-verify\`
- 快速归档: \`openspec archive "<change-name>" --no-verify\`

**修正路径：**
⚠️ 生成的 specs 基于代码推断，建议审查标记 [REVIEW NEEDED] 的内容
- 审查 change → 手动编辑 specs → sync → archive
- 审查 change → 修改代码 → 再次 \`/opsx:snack\` → 继续迭代

## Artifact Contract

${ARTIFACT_DOC_LANGUAGE_CONTRACT}

Keep generated specs coarse and behavior-focused; preserve template headings, canonical IDs, schema keys, BDD keywords, paths, commands, and code identifiers.`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}
