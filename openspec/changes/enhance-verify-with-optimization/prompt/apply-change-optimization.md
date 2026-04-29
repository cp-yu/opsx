## apply-change.ts 修改：优化结果消费

### 修改位置

`src/core/templates/workflows/apply-change.ts`，Step 4 (read context files) 和 Step 5 (show current progress)。

### 修改内容

#### 3.1 Step 4 读取 `.verify-result.json` 时新增 optimization

在 Step 4 现有读取 verify result 的逻辑之后，追加：

```
- Build `path.join(changeDir, '.verify-result.json')` and check whether the previous verify result exists
- If the file exists and `result === 'FAIL_NEEDS_REMEDIATION'`:
  - Read the persisted `issues` array
  - Keep only CRITICAL issues as mandatory remediation context
+ - If the file exists, also read the `optimization` object if present
+ - If `optimization` is present:
+   - Note the `optimization.status` for display purposes
+   - Store `optimization.score` for informational reporting
+   - Do NOT read optimization suggestions for remediation
+     - optimization is self-contained within the verify pipeline
+     - the code on disk already reflects the final post-optimization state
+   - The optimization object is read-only informational context for the apply agent
```

#### 3.2 Step 5 展示当前进度时新增 optimization 摘要行

在 Step 5 现有进度展示之后，追加：

```
Display:
  - Schema being used
  - Progress: "N/M tasks complete"
  - Remaining tasks overview
  - Summary of prior CRITICAL verify issues when `.verify-result.json` reports
    `FAIL_NEEDS_REMEDIATION`
  - Summary of open remediation items grouped by `[code_fix]` and `[artifact_fix]`
  - Dynamic instruction from CLI
+  - Optimization status summary from the prior verify: "Optimization: <status>"
+    - If status is `IMPROVED`:
+      "Your code was previously optimized (score: <score>/100).
+       No further optimization needed."
+    - If status is `DEGRADED`:
+      "Previous optimization attempt was rolled back due to regressions.
+       Focus on correctness first."
+    - If status is `ABORTED_UNSAFE`:
+      "Previous optimization was aborted.
+       Code is in its pre-optimization state."
+    - If status is `NOT_APPLICABLE`:
+      "Optimization: not applicable (tool does not support subagents)."
+    - If status is `PENDING`:
+      "Optimization was in progress but did not complete.
+       Consider re-running verify."
+    - If status is `SKIPPED`:
+      "Optimization was skipped. Run verify with --skip-optimization to reproduce,
+       or check verify output for the reason."
+    - If status is `NOT_NEEDED`:
+      "Optimization: no improvements identified. Code quality was already high."
+    - If optimization object is absent:
+      Do not display any optimization line (backward compatible)
```

### 设计理由

1. **optimization 仅供展示，不影响执行** — `apply` 的核心职责仍然是修复 CRITICAL issues。optimization 已在 verify 阶段自行处理（已应用或已回滚），apply 只需展示状态。
2. **禁止 apply 重放优化建议** — `optimization.attempts` 中的建议如果被接受，代码已经修改；如果被回滚，则不该再应用。无论如何，apply 都不应消费这些建议。
3. **避免歧义** — 如果顶层 `result === 'PASS_WITH_WARNINGS'` 且原因仅来自 `optimization.status === 'DEGRADED'`，不要将其当作 canonical failure。仍然按正常 apply 流程处理任务。
4. **完整覆盖** — 处理全部六种状态（SKIPPED、NOT_APPLICABLE、NOT_NEEDED、IMPROVED、DEGRADED、ABORTED_UNSAFE），外加缺失 optimization 的向后兼容路径。
