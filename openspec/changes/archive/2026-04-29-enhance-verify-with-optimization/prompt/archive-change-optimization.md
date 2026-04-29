## archive-change.ts 优化门禁语义校正

这份草稿的目的不是发明新分支，而是把 archive 对 verify 结果的消费规则说清楚，避免把 freshness 和 archive compatibility 混为一谈。

### 正确规则

- freshness 只回答一件事：这份 `.verify-result.json` 是否仍然对应当前工作区证据。
- archive compatibility 额外回答第二件事：这份 fresh 结果是否可以安全作为归档门禁复用。
- `optimization` 字段不参与 freshness 哈希输入，但会影响 archive compatibility。

### Step 2 应有的判断顺序

1. 读取 `.verify-result.json`，包含可选 `optimization`。
2. 按 `VERIFY_FRESHNESS_RULES` 判定 fresh 或 stale。
3. 如果结果是 stale 或 missing：
   - 执行 full verify。
4. 如果结果是 fresh：
   - 再判断是否 archive-compatible。

### archive-compatible 判定

#### 可直接复用

以下状态在顶层 `result` 为 `PASS` 或 `PASS_WITH_WARNINGS` 时可直接复用：

- `optimization.status = "SKIPPED"`
- `optimization.status = "NOT_NEEDED"`
- `optimization.status = "IMPROVED"`
- `optimization.status = "DEGRADED"`
- 缺失 `optimization` 的 legacy verify result

#### 不可直接复用

以下状态即使 freshness 通过，也不得直接归档：

- `optimization.status = "ABORTED_UNSAFE"`

此时 archive 必须报告：

> Verify result is fresh, but optimization recovery state is unsafe.

并执行以下动作：

- 不复用这份 verify result
- 不继续 archive
- 要求用户先完成工作区恢复，或重新执行 full verify

### 需要明确删除的旧说法

以下叙述是错误的，必须从 prompt 中排除：

- “`ABORTED_UNSAFE` 只是优化没完成，但 canonical result 仍然有效，所以 archive 可以继续”
- “只要 fresh 就一定 archive-compatible”
- “optimization 只是展示信息，不影响归档门禁”

### 输出摘要也要跟着修正

archive 成功时应表达为：

- Fresh and archive-compatible verify result accepted

而不是模糊地只说：

- Fresh verify result accepted
