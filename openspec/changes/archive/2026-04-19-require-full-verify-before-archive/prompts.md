# Prompt Modifications for require-full-verify-before-archive

本文档定义了实现 require-full-verify-before-archive change 所需的提示词修改。

## 1. 新增 Fragments (opsx-fragments.ts)

### 1.1 GIT_EVIDENCE_PROTOCOL

```typescript
export const GIT_EVIDENCE_PROTOCOL = `
**Git Evidence Usage Protocol**:
- Use \`git status\` and \`git diff\` to discover candidate files and suspicious gaps
- Git diff hunks are investigation clues, NOT sufficient proof of requirement satisfaction
- Final judgment MUST be based on actual file contents after all changes
- If diff looks correct but final file still diverges from spec, report the divergence
- If requirement is satisfied but not visible in diff (e.g., in existing files), still mark as covered

**Evidence Priority Order**:
1. Change artifacts (proposal, specs, design, tasks) - define what should be implemented
2. Git evidence (status, diff, log) - guide where to look for implementation
3. Final file contents - authoritative source for verification judgment
4. Test files and results - verify scenario coverage
`.trim();
```

### 1.2 CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT (Claude Code/Codex)

```typescript
export const CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT = `
**Clean-Context Verification Protocol**:

Spawn a clean-context reviewer subagent to perform verification.

**Inputs to pass to reviewer subagent:**
- Change artifacts: proposal.md, specs/, design.md, tasks.md
- Git evidence: output of \`git status\`, \`git diff\`, \`git log -5 --oneline\`
- Final file contents: candidate implementation files identified from git diff

**Reviewer subagent instructions:**
- You are a clean-context reviewer verifying implementation against change artifacts
- You have NO access to implementation conversation history
- Base all judgments on the explicit inputs provided
- For each requirement, cite specific file paths and line ranges as evidence
- Follow the step-by-step verification protocol below

**Record in verify result:**
- \`executionMode: 'clean-context-reviewer'\`
`.trim();
```

### 1.3 CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD (其他工具)

```typescript
export const CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD = `
**Clean-Context Verification Protocol**:

Execute verification in current agent with explicit re-read protocol.

**Before making ANY verification judgment:**
1. Re-read all change artifacts from disk:
   - proposal.md, specs/, design.md, tasks.md
2. Re-run git commands:
   - \`git status\`, \`git diff\`, \`git log -5 --oneline\`
3. Re-read final file contents:
   - Candidate implementation files identified from git diff

**Important:**
- Treat implementation conversation as non-authoritative background context
- Base all judgments ONLY on freshly-read evidence
- Follow the step-by-step verification protocol below

**Record in verify result:**
- \`executionMode: 'current-agent-reread'\`
`.trim();
```

### 1.4 VERIFY_FRESHNESS_RULES

```typescript
export const VERIFY_FRESHNESS_RULES = `
**Verify Result Freshness Rules**:

A verify result is considered **FRESH** if ALL of the following hold:
- \`.verify-result.json\` exists in change directory
- \`tasksFileHash\` matches hash of current \`tasks.md\` contents
- \`verificationContext.evidenceFingerprint\` matches current workspace state
- \`verificationContext.contractVersion\` is "1.0" (current version)
- \`result\` is \`PASS\` or \`PASS_WITH_WARNINGS\` (NOT \`FAIL_NEEDS_REMEDIATION\`)

A verify result is considered **STALE** if ANY of the following:
- \`tasksFileHash\` does not match current \`tasks.md\`
- \`verificationContext.evidenceFiles\` list has changed (files added/removed)
- \`verificationContext.evidenceFingerprint\` does not match recomputed fingerprint
- \`verificationContext.gitHeadCommit\` does not match current HEAD (if recorded)
- \`verificationContext.contractVersion\` is missing or not "1.0"

**When verify result is STALE or MISSING:**
- Archive MUST execute full verify before continuing
- Do NOT attempt to use or repair stale verify results

**Fingerprint Computation**:
- Sort \`evidenceFiles\` list alphabetically
- For each file: get path + modification time + size
- Hash the concatenated string (SHA-256 or equivalent)
- Use cross-platform path handling (\`path.normalize\`, \`path.resolve\`)
`.trim();
```

### 1.5 更新 CONFORMANCE_CHECK_RULES

在现有 `CONFORMANCE_CHECK_RULES` 后追加：

```typescript
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

**Step-by-Step Objective Verification**:
1. **Locate**: Search codebase for keywords related to the requirement to identify candidate files
2. **Read**: Read the actual file contents (not just search results or git diffs)
3. **Analyze**: Compare file contents against requirement intent and scenario conditions
4. **Cite**: Record specific file paths and line ranges as evidence
5. **Judge**: Make PASS/WARNING/CRITICAL determination based on evidence
6. **Explain**: For non-PASS judgments, explain what is missing or divergent

**Evidence Standards**:
- PASS requires clear, cited evidence from final file contents
- WARNING when implementation exists but confidence is not high enough for PASS
- CRITICAL when no credible implementation evidence exists after thorough search
- Always cite file:line references for both positive and negative findings
`.trim();
```

---

## 2. verify-change.ts 修改

### 2.1 插入 Step 1.5 (Clean-Context Verification)

**位置**：在 Step 1 (Get change name) 之后，Step 2 (Get apply instructions) 之前

**Claude Code/Codex 版本** (`.claude/` 和 `.codex/` 文件夹):

```markdown
1.5. **Clean-Context Verification Setup**

${CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT}
```

**其他工具版本** (默认模板):

```markdown
1.5. **Clean-Context Verification Setup**

${CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD}
```

### 2.2 在 Step 6 (Verify Correctness) 之前插入 Git Evidence Protocol

**位置**：在 Step 5 (Verify Completeness) 之后，Step 6 (Verify Correctness) 之前

**所有工具版本**:

```markdown
5.5. **Git Evidence Investigation**

${GIT_EVIDENCE_PROTOCOL}

Use git commands to guide your investigation:
- Run \`git status\` to see modified/added/deleted files
- Run \`git diff\` to see what changed
- Run \`git log -5 --oneline\` to see recent commits

Use this information to identify candidate files for verification, but remember:
- Git evidence guides WHERE to look
- Final file contents determine WHAT to judge
```

### 2.3 修改 Step 10 (Persist Verification Result)

**位置**：替换现有 Step 10

**所有工具版本**:

```markdown
10. **Persist Verification Result**

Build verify result path: \`path.join(changeDir, '.verify-result.json')\`

Write JSON object with:
- \`timestamp\`: ISO 8601 completion time
- \`result\`: \`PASS\` / \`PASS_WITH_WARNINGS\` / \`FAIL_NEEDS_REMEDIATION\`
- \`issues\`: full issue list with severity, requirement, task linkage, recommendations
- \`tasksFileHash\`: hash of current \`tasks.md\` after any write-back
- \`verificationContext\`:
  - \`contractVersion\`: "1.0"
  - \`executionMode\`: 'clean-context-reviewer' or 'current-agent-reread' (based on Step 1.5)
  - \`evidenceFiles\`: list of files examined during verification (relative POSIX paths, sorted)
  - \`evidenceFingerprint\`: hash of sorted evidence file paths + modification times + sizes
  - \`gitHeadCommit\`: current HEAD commit SHA (if in git repo, optional)
  - \`gitDiffSummary\`: output of \`git diff --stat\` (if changes exist, optional)

**Fingerprint Computation**:
- Sort \`evidenceFiles\` list alphabetically
- For each file: get \`path + mtime + size\`
- Concatenate and hash with SHA-256

Use cross-platform path handling (\`path.join\`, \`path.resolve\`) for all file paths.

Persist even when verification fails so archive/apply can consume diagnostics.
```

---

## 3. archive-change.ts 修改

### 3.1 完全重写 Step 2 (Unified Full Verify Gate)

**位置**：替换现有 Step 2

**所有工具版本**:

```markdown
2. **Unified Full Verify Gate**

Build \`.verify-result.json\` path: \`path.join(changeDir, '.verify-result.json')\`

${VERIFY_FRESHNESS_RULES}

**Check verify result freshness:**

If \`.verify-result.json\` does NOT exist:
- Inform user: "No verify result found. Executing full verify before archive..."
- Execute full verify (see Step 2.5 below)

If \`.verify-result.json\` exists:
- Read \`result\`, \`timestamp\`, \`issues\`, \`tasksFileHash\`, \`verificationContext\`
- Check freshness:
  - Hash current \`tasks.md\` and compare to \`tasksFileHash\`
  - Recompute \`evidenceFingerprint\` from current workspace and compare
  - Check \`verificationContext.contractVersion\` is "1.0"
  - Check \`verificationContext.gitHeadCommit\` matches current HEAD (if recorded)
- If ANY freshness check fails:
  - Inform user: "Verify result is stale. Re-executing full verify before archive..."
  - Execute full verify (see Step 2.5 below)
- If \`result === 'FAIL_NEEDS_REMEDIATION'\`:
  - HARD-BLOCK archive
  - Display CRITICAL issues from \`issues\` array
  - Instruct user: "Verification failed. Fix CRITICAL issues and re-run \`/opsx:verify\` or \`/opsx:apply\`"
  - Preserve active change directory (do NOT move to archive)
  - STOP here
- If \`result === 'PASS'\` or \`'PASS_WITH_WARNINGS'\` and all freshness checks pass:
  - Inform user: "Fresh verify result found (${result}). Proceeding with archive..."
  - Continue to Step 3

**Step 2.5: Execute Full Verify**

When verify result is missing or stale, execute the same verify contract as \`/opsx:verify\`:
- Follow all steps from verify-change.ts template:
  - Step 1.5: Clean-Context Verification Setup
  - Step 5: Verify Completeness
  - Step 5.5: Git Evidence Investigation
  - Step 6: Verify Correctness (with ${CONFORMANCE_CHECK_RULES})
  - Step 7: Verify Coherence
  - Step 10: Persist Verification Result
- After verify completes, check result:
  - If \`FAIL_NEEDS_REMEDIATION\`: HARD-BLOCK archive (as above)
  - If \`PASS\` or \`PASS_WITH_WARNINGS\`: continue to Step 3

**Important:**
- This is the ONLY verify gate for archive
- There is NO lightweight inline conformance check
- There is NO soft-prompt or skip option
- Both \`core\` and \`expanded\` modes use this same gate
```

### 3.2 删除 Step 4.5 (Core Mode Inline Conformance Check)

**位置**：删除现有 Step 4.5 及其所有内容

**原因**：Step 2 已经执行了 full verify，不再需要 lightweight inline check

---

## 4. 工具特定文件组织

### 4.1 文件结构

```
src/core/templates/workflows/
├── verify-change.ts          # 默认版本 (使用 REREAD protocol)
├── archive-change.ts         # 默认版本 (统一 verify gate)
├── .claude/
│   ├── verify-change.ts      # Claude Code 版本 (使用 SUBAGENT protocol)
│   └── archive-change.ts     # Claude Code 版本 (同默认，因为只是消费 verify result)
└── .codex/
    ├── verify-change.ts      # Codex 版本 (使用 SUBAGENT protocol)
    └── archive-change.ts     # Codex 版本 (同默认)
```

### 4.2 差异说明

**verify-change.ts 差异**:
- Claude Code/Codex: Step 1.5 使用 `CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT`
- 其他工具: Step 1.5 使用 `CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD`

**archive-change.ts 差异**:
- 所有工具版本相同（因为 archive 只是消费 verify result，不执行 verify 逻辑）
- 但 Step 2.5 中"Execute Full Verify"会引用对应工具的 verify-change.ts

---

## 5. 验证检查清单

实施完成后，确保：

- [ ] `opsx-fragments.ts` 包含 4 个新 fragments
- [ ] `CONFORMANCE_CHECK_RULES` 已更新为包含 Step-by-Step Objective Verification
- [ ] `verify-change.ts` 有 Step 1.5 (Clean-Context) 和 Step 5.5 (Git Evidence)
- [ ] `verify-change.ts` Step 10 写入完整的 `verificationContext`
- [ ] `archive-change.ts` Step 2 是统一的 verify gate
- [ ] `archive-change.ts` 删除了 Step 4.5 (lightweight check)
- [ ] `.claude/verify-change.ts` 使用 SUBAGENT protocol
- [ ] `.codex/verify-change.ts` 使用 SUBAGENT protocol
- [ ] 默认 `verify-change.ts` 使用 REREAD protocol
- [ ] 所有路径处理使用 `path.join()` / `path.resolve()`
- [ ] `contractVersion` 设为 "1.0"
