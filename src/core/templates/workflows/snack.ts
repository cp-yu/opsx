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
6. 先确定 capability 列表，再生成 \`proposal.md\`。
   - Run \`openspec instructions proposal --change "<name>" --json\`.
   - Use the returned \`template\`, \`instruction\`, \`outputPath\`, and \`configProjection\`; do not invent non-template sections.
   - Determine the \`## Capabilities\` list before specs generation and reuse the same list as specs input.
   - Prefer code-map reverse lookup; files without code-map coverage may use git diff inference but MUST be marked \`[REVIEW NEEDED]\`.
   - Preserve the template headings including \`## Why\`, \`## What Changes\`, \`## Capabilities\`, and \`## Impact\`.
7. Generate delta specs in \`specs/<capability>/spec.md\` from the artifact instruction.
   - Run \`openspec instructions specs --change "<name>" --json\`.
   - Use the returned \`template\`, \`instruction\`, \`outputPath\`, and \`configProjection\`; do not invent non-template sections.
   - Follow the returned \`instruction\` for ADDED/MODIFIED selection, spec directory naming, and MODIFIED requirement title matching.
   - Reuse an existing \`openspec/specs/<capability>/\` directory when the instruction says it applies; otherwise use the proposal capability name.
   - New concerns use \`## ADDED Requirements\`; changed existing behavior uses \`## MODIFIED Requirements\` with the exact existing Requirement title.
   - Requirement text MUST contain SHALL/MUST language and at least one \`#### Scenario:\` block with WHEN/THEN style.
   - Mark uncertain inferences with \`[REVIEW NEEDED]\`.
8. Generate simplified \`design.md\` from the artifact instruction.
   - Run \`openspec instructions design --change "<name>" --json\`.
   - Use the returned \`template\`, \`instruction\`, \`outputPath\`, and \`configProjection\`; do not invent non-template sections.
   - Preserve the full template skeleton: Context, Goals / Non-Goals, Decisions, and Risks / Trade-offs.
   - Mark inferred content with \`[INFERRED FROM CODE]\`; mark unresolved risks or trade-offs with \`[REVIEW NEEDED]\`.
9. OPSX delta heuristic — generate \`opsx-delta.yaml\` ONLY when git diff shows new/deleted exports or new files; otherwise skip and log "未检测到架构级变更，跳过 OPSX delta 生成".
   ${OPSX_GENERATE_DELTA}
10. Do NOT generate \`tasks.md\` (code is already implemented).
11. Run \`openspec validate "<name>" --type change --json\` after all generated artifacts are written.
   - If validation returns ERROR or WARNING, run one repair pass using the relevant artifact \`instruction\` rules, then run \`openspec validate "<name>" --type change --json\` once more.
   - Treat the second validation result as final evidence.
   - 输出 validate result：通过则提示已自检通过；仍有 ERROR/WARNING 则逐条列出并提示用户审查。
12. Finish with the output hints below, including the validate result.

## Output Hints

After artifacts are generated, output:

**快速路径（跳过 verify）：**
  • 继续开发: \`openspec sync "<change-name>" --no-verify\`
  • 快速归档: \`openspec archive "<change-name>" --no-verify\`

**修正路径：**
⚠️ 生成的 specs 基于代码推断，建议审查标记 [REVIEW NEEDED] 的内容
- 修正分支 1：审查 change → 手动编辑 specs → sync → archive
- 修正分支 2：审查 change → 修改代码 → 再次 \`/opsx:snack\` → 继续迭代

## Artifact Contract

${ARTIFACT_DOC_LANGUAGE_CONTRACT}

Keep generated specs coarse and behavior-focused; preserve template headings, canonical IDs, schema keys, BDD keywords, paths, commands, and code identifiers.`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}
