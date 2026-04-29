## archive-change.ts 修改：优化结果处理

### 修改位置

`src/core/templates/workflows/archive-change.ts`，Step 2 "Unified Full Verify Gate"。

### 修改内容

#### 2.1 读取 verify result 时新增 optimization 字段

在 Step 2 读取 `.verify-result.json` 的说明中：

```diff
- Build the verify result path with `path.join(changeDir, '.verify-result.json')`.
- Read `result`, `timestamp`, `issues`, `tasksFileHash`, and `verificationContext`.
+ Build the verify result path with `path.join(changeDir, '.verify-result.json')`.
+ Read `result`, `timestamp`, `issues`, `tasksFileHash`, `verificationContext`, and optional `optimization`.
```

#### 2.2 freshness 判定不变

`VERIFY_FRESHNESS_RULES` fragment 中的 freshness 判定标准保持不变。optimization 字段的存在与否不影响 FRESH/STALE 判定：

```
**Verify Result Freshness Rules**:

A verify result is considered **FRESH** if ALL of the following hold:
- `.verify-result.json` exists in the change directory
- `tasksFileHash` matches the hash of the current `tasks.md` contents
- `verificationContext.evidenceFingerprint` matches the current workspace fingerprint
- `verificationContext.contractVersion` is `"1.0"`
- `result` is `PASS` or `PASS_WITH_WARNINGS`

A verify result is considered **STALE** if ANY of the following hold:
- `tasksFileHash` does not match the current `tasks.md`
- `verificationContext.evidenceFiles` is missing or the file list changed
- `verificationContext.evidenceFingerprint` does not match the recomputed fingerprint
- `verificationContext.gitHeadCommit` does not match the current HEAD (if recorded)
- `verificationContext.contractVersion` is missing or not `"1.0"`
- `result` is not `PASS` or `PASS_WITH_WARNINGS`
```

> optimization 字段不参与 freshness 判定。缺失 optimization 的旧版 verify result 仍然可以被判定为 FRESH。

#### 2.3 freshness 通过后新增 optimization 状态检查

在 freshness 确认通过、`result` 为 `PASS` 或 `PASS_WITH_WARNINGS` 之后，添加以下 optimization 门禁检查：

```
**Optimization Status Check** (performed after freshness is confirmed):

Read the `optimization` object from `.verify-result.json` if it exists.

If `optimization` is **present**:
  - If `optimization.status === "PENDING"`:
      Warn:
      "Warning: Optimization was in progress but did not complete.
       Consider re-running `/opsx:verify` before archiving."
      Do NOT block archive — Phase 1 canonical result may be valid.
      (Treat as if optimization is absent for remaining logic and skip the display below.)
  - Display the optimization status in the archive summary:
    "Optimization: <status> (score: <score>/100)"

  - If `optimization.status === "SKIPPED"`:
      Display: "Optimization: skipped. Check verify output for the specific reason."

  - If `optimization.status === "NOT_APPLICABLE"`:
      Display: "Optimization: not applicable (tool does not support subagents)"
      (Treat identically to SKIPPED for logic purposes)

  - If `optimization.status === "NOT_NEEDED"`:
      Display: "Optimization: no improvements identified (code quality already high)"

  - If `optimization.status === "IMPROVED"`:
      Display: "Optimization: code was improved during verify (score: <score>/100)"

  - If `optimization.status === "DEGRADED"`:
      Inform:
      "Note: Phase 2 optimization was degraded (optimization attempts exhausted).
       Phase 1 canonical result is preserved.
       Best score: <score>/100.
       The top-level result may have been widened from PASS to PASS_WITH_WARNINGS."
      Do NOT block archive — Phase 1 canonical result is preserved and valid

  - If `optimization.status === "ABORTED_UNSAFE"`:
      Warn:
      "Warning: Phase 2 optimization was aborted during previous verify.
       Consider re-running `/opsx:verify` to attempt optimization before archiving."
      Do NOT block archive — Phase 1 canonical result is preserved and valid

If `optimization` is **absent** (pre-existing verify result from older version):
  - Proceed without warning
  - This is backward-compatible with verify results generated before Phase 2 was introduced
  - Do NOT treat missing optimization as an error or freshness issue
```

#### 2.4 Step 7 显示摘要中增加 optimization 行

在 archive 成功输出模板中，在 `**Verify Gate:**` 行之后添加：

```
**Optimization:** <status> (score: <score>/100)
```

如果 optimization 对象不存在，则显示：
```
**Optimization:** Not available
```

### 设计理由

1. **不阻断 archive** — 只有 Phase 1 canonical result 决定归档资格。optimization 是锦上添花，不是门禁条件。
2. **向后兼容** — 旧版 verify result 缺失 optimization 字段时静默处理，不做任何警告。
3. **透明告知** — 在 archive 输出中显示优化状态，包括 DEGRADED 可能导致的 PASS 到 PASS_WITH_WARNINGS 扩展。
4. **完整覆盖** — 处理全部六种状态（SKIPPED、NOT_APPLICABLE、NOT_NEEDED、IMPROVED、DEGRADED、ABORTED_UNSAFE）。
