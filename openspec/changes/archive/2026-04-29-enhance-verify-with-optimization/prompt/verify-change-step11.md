## verify-change.ts Step 11 语义校正

这份草稿被保留用于历史追踪，但其 checkpoint 终局语义必须与当前主模板一致，以下内容覆盖旧版说明。

### 核心原则

- `git stash apply <checkpointRef>` 只用于中间恢复，不消费 checkpoint。
- `git stash pop <checkpointRef>` 只用于终局恢复，前提是确认不再继续重试。
- `git stash drop <checkpointRef>` 只用于两类场景：
  - 成功接受优化结果，进入终局接受态。
  - 使用等价的“恢复成功后再 drop”序列完成终局恢复。
- 任何仍需要输出手工恢复说明的分支，都不得先执行 `git stash drop <checkpointRef>`。

### 显式状态机

- `CREATED`
  - 触发条件：`git stash push -u -m "verify-phase2-checkpoint"` 成功。
- `BASELINE_RESTORED_FOR_RETRY`
  - 触发条件：`git stash apply <checkpointRef>` 成功恢复 Phase 1 baseline，checkpoint 继续保留给后续重试。
- `TERMINAL_ACCEPTED`
  - 触发条件：优化结果通过 speculative re-verify，随后执行 `git stash drop <checkpointRef>` 清理 checkpoint。
- `TERMINAL_RESTORED`
  - 触发条件：终局放弃优化并成功恢复 baseline，优先执行 `git stash pop <checkpointRef>`，或执行等价的“恢复成功后再 drop”序列。

### 正确的终局行为

#### 1. 优化成功

- speculative re-verify 返回 `PASS` 或 `PASS_WITH_WARNINGS`
- 接受优化后的工作区
- 执行 `git stash drop <checkpointRef>`
- `optimization.status = "IMPROVED"`

#### 2. 单次失败后继续重试

- speculative re-verify 返回 `FAIL_NEEDS_REMEDIATION`
- 执行：
  ```bash
  git reset --hard HEAD
  git clean -fd
  git stash apply <checkpointRef>
  ```
- 保留 checkpoint，继续下一轮优化尝试
- 绝不在这个阶段执行 `git stash pop` 或 `git stash drop`

#### 3. 行为失败次数耗尽，安全降级退出

- 达到 `maxBehaviorFailures = 3`
- 先丢弃 speculative edits
- 再做终局恢复，优先：
  ```bash
  git reset --hard HEAD
  git clean -fd
  git stash pop <checkpointRef>
  ```
- 恢复成功后：
  - `optimization.status = "DEGRADED"`
  - 顶层 `result = "PASS_WITH_WARNINGS"`
  - 输出 `Phase 1 PASS. 3 optimization attempts safely reverted.`

#### 4. 恢复闭环失败

- 任一终局恢复路径失败时：
  - 保留原始 stash entry
  - `optimization.status = "ABORTED_UNSAFE"`
  - 输出跨平台恢复命令：
    ```bash
    git reset --hard HEAD
    git clean -fd
    git stash apply <checkpointRef>
    ```
  - 明确说明 canonical Phase 1 judgment 仅可用于诊断，当前工作区不应视为已安全恢复

### 明确废止的旧语义

以下做法全部作废，不得再用于 prompt 生成：

- 先 `git stash drop`，再输出依赖同一 stash 的恢复命令
- 在中间重试阶段使用 `git stash pop`
- 因 format/match 超限或 subagent 超时就无条件提前清理 checkpoint
- 将 `ABORTED_UNSAFE` 描述为“checkpoint 已清理完成，只是优化没成功”
