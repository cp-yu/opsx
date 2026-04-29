### 1. `prompt/fragments-new.md` — 新增 OPTIMIZATION_PROTOCOL_SUBAGENT

**TypeScript 源代码**（放置于 `src/core/templates/fragments/opsx-fragments.ts`）：

```ts
/**
 * Fragment: Clean-context optimization protocol for Phase 2
 *
 * This fragment defines the contract for the Phase 2 optimizer subagent.
 * It should be added to src/core/templates/fragments/opsx-fragments.ts
 * and exported alongside the existing CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT.
 *
 * Valid optimization.status enum values:
+ *   PENDING        - Initial placeholder, persisted before P2 starts; indicates incomplete run
 *   SKIPPED        - Phase 2 not executed (config disabled, CLI flag, dirty worktree, or CRITICAL issues)
 *   NOT_APPLICABLE - Tool does not support subagent execution
 *   NOT_NEEDED     - Subagent found no optimization opportunities
 *   IMPROVED       - Optimization applied and verified successfully
 *   DEGRADED       - Behavior retry budget exhausted, baseline preserved
 *   ABORTED_UNSAFE - Fatal error during optimization (timeout, format/match exhaustion, checkpoint failure)
 *
 * Usage in verify-change.ts:
 *   import { OPTIMIZATION_PROTOCOL_SUBAGENT } from '../fragments/opsx-fragments.js';
 *
 * Tools supporting subagents (Claude Code, Codex) will pass this as the
 * second protocol parameter. Non-subagent tools skip Phase 2 entirely.
 */
export const OPTIMIZATION_PROTOCOL_SUBAGENT = `
**Phase 2 Optimization Protocol**:

Spawn a second clean-context optimizer subagent. This subagent is separate from the Phase 1 reviewer and MUST treat the implementation conversation history as unavailable and non-authoritative.

**Mission**: Your goal is to make the code better while maintaining absolute safety. Every change you propose must be correct, reversible, and worth making.

**Pre-conditions (verified by the main agent before spawning)**:
- \`openspec/config.yaml\` \`optimization.enabled\` is \`true\` (default when absent)
- CLI \`--skip-optimization\` flag is NOT present
- Worktree is clean (no uncommitted changes)
- A \`git stash push -u -m "verify-phase2-checkpoint"\` checkpoint has been created
- The stash stack-top hash has been recorded for precise recovery

**Inputs to pass to the optimizer subagent**:
- Final Phase 1 baseline code files that are candidates for optimization
- Delta specs from \`specs/\`
- \`design.md\` when it exists (skip if absent; do not fabricate design context)
- The FULL content of every implementation file identified during Phase 1 evidence gathering (the same files listed in \`verificationContext.evidenceFiles\` from the Phase 1 \`.verify-result.json\`)
- A short Phase 1 baseline summary: top-level result, warnings to preserve, and the rule that behavior MUST NOT change
- Do NOT pass the prior \`.verify-result.json\` to the optimizer subagent — the optimizer must form its own independent judgment

**Optimizer goal**:
- Propose small, defensible improvements that reduce complexity, duplication, or obvious maintenance risk
- Prefer local refactors over broad rewrites
- Return no changes when confidence is low or the code is already good enough

**Diagnosis dimensions**:
- Code quality: readability, maintainability, function length, nesting depth, duplication
- Design patterns: SOLID principles, pattern appropriateness, architectural alignment
- Efficiency: algorithmic complexity, I/O in loops, performance hotspots

**Required output contract**:
Return exactly one of:

1. The single token \`NO_OPTIMIZATION_NEEDED\`
2. One or more Search/Replace blocks followed by exactly one JSON score footer

Each Search/Replace block MUST use this exact format:
\`\`\`text
<<FILE relative/posix/path.ts
<<SEARCH
<old text>
>>>SEARCH
<<REPLACE
<new text>
>>>REPLACE
>>>END
\`\`\`

After the last block, append exactly one JSON object:
\`\`\`json
{"score": 0, "summary": "one sentence", "strategy": "short label"}
\`\`\`

**Matching contract** (applied by the main agent, stated here so the subagent can self-validate):
- SEARCH text is first matched exactly against the target file content
- If exact match fails, whitespace normalization is applied: normalize line endings (CRLF → LF), strip trailing whitespace, normalize indentation consistently
- The final match count MUST be exactly 1 — 0 matches or >1 matches both cause the block to fail validation

**Output constraints**:
- Every block MUST include an explicit relative POSIX file path
- Target files MUST already exist and already be tracked
- Only modify code files that were passed as inputs
- Do NOT rename, create, delete, or move files
- Do NOT emit unified diff
- Do NOT emit prose-only advice without blocks
- Keep each SEARCH body minimal but uniquely identifying — include enough context lines (2-3 lines before and after) to ensure uniqueness
- Preserve public interfaces, requirement behavior, error semantics, and test intent
- If a safe optimization requires uncertain behavioral changes or broad cross-file coordination, return \`NO_OPTIMIZATION_NEEDED\`

**Scoring contract**:
- \`score\` is an integer from 0 to 100 describing expected post-change code quality
- \`summary\` is a one-sentence justification
- \`strategy\` names the primary optimization idea

**Important**:
- Base every proposal ONLY on the explicit inputs provided
- Favor boring, reversible changes over clever rewrites
- If uncertain, return \`NO_OPTIMIZATION_NEEDED\`

**Record in verify result**:
- \`optimization.executionMode: 'clean-context-optimizer'\`
`.trim();
```

---

### 2. `prompt/fragments-new.md` — 集成说明

此 fragment 应在 `src/core/templates/fragments/opsx-fragments.ts` 中与现有的 `CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT` 并列导出。

修改 `.claude/verify-change.ts` 和 `.codex/verify-change.ts`：
```ts
// 旧
import { CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT } from '../../fragments/opsx-fragments.js';
// 新
import {
  CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT,
  OPTIMIZATION_PROTOCOL_SUBAGENT,
} from '../../fragments/opsx-fragments.js';
```

`verify-change.ts` 中 `buildVerifyInstructions()` 签名需接受两个 protocol 参数：
```ts
function buildVerifyInstructions(
  text: VerifyTemplateText,
  cleanContextProtocol: string,
  optimizationProtocol?: string  // 新增第二个参数
): string {
```
