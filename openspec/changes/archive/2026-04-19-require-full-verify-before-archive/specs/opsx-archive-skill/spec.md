## MODIFIED Requirements

### Requirement: Task Completion Check

The skill SHALL 在归档前检查 `tasks.md` 的任务完成状态，并执行强制性的完整验证门禁。

#### Scenario: 统一 verify gate - 复用 fresh verify result

- **WHEN** agent 执行 `/opsx:archive`（无论 `core` 或 `expanded` mode）
- **AND** change 目录中存在 `.verify-result.json`
- **AND** verify result 经 freshness 判定仍然 fresh（见 verify-writeback spec）
- **AND** result 为 `PASS` 或 `PASS_WITH_WARNINGS`
- **THEN** the skill SHALL 复用该 verify result 作为 archive gate
- **AND** 在不重新执行 verify 的前提下继续剩余归档检查
- **AND** 告知用户："Fresh verify result found (${result}). Proceeding with archive..."

#### Scenario: 统一 verify gate - 缺失或 stale 时执行 full verify

- **WHEN** agent 执行 `/opsx:archive`（无论 `core` 或 `expanded` mode）
- **AND** `.verify-result.json` 缺失或经 freshness 判定为 stale
- **THEN** the skill SHALL 在归档前执行一次 full verify
- **AND** 该 full verify SHALL 使用与 `/opsx:verify` 相同的验证合同（见 opsx-verify-skill spec）
- **AND** 告知用户："No verify result found" 或 "Verify result is stale. Executing full verify before archive..."
- **AND** 仅当 verify 返回 `PASS` 或 `PASS_WITH_WARNINGS` 时才继续归档

#### Scenario: 统一 verify gate - 无 core/expanded 分支差异

- **WHEN** agent 执行 `/opsx:archive`
- **THEN** the skill SHALL 使用统一的 verify gate 逻辑
- **AND** SHALL NOT 因 `core` 或 `expanded` mode 而有不同的验证深度或门禁标准
- **AND** SHALL NOT 保留任何 lightweight inline conformance check 路径
- **AND** 具体实现见 `prompts.md` 中 archive-change.ts Step 2

#### Scenario: 验证门禁 hard-block on FAIL_NEEDS_REMEDIATION

- **WHEN** archive 读取或执行 verify 后得到 result 为 `FAIL_NEEDS_REMEDIATION`
- **THEN** the skill SHALL 强制阻断 archive（HARD-BLOCK）
- **AND** SHALL 保持该 change 继续处于 active 状态（不移动到 archive/）
- **AND** SHALL 显示 CRITICAL issues 列表
- **AND** SHALL 指示用户："Verification failed. Fix CRITICAL issues and re-run `/opsx:verify` or `/opsx:apply`"
- **AND** SHALL NOT 提供任何 skip 或 continue 选项

#### Scenario: 存在未完成任务

- **WHEN** agent 读取 `tasks.md`
- **AND** 发现未完成任务（标记为 `- [ ]`）
- **THEN** 展示 warning，说明未完成任务数量
- **AND** 提示用户确认是否继续
- **AND** 用户确认后才继续

#### Scenario: 所有任务均已完成

- **WHEN** agent 读取 `tasks.md`
- **AND** 所有任务均已完成（标记为 `- [x]`）
- **THEN** 在没有 task warning 的情况下继续

#### Scenario: 不存在 tasks 文件

- **WHEN** `tasks.md` 不存在
- **THEN** 在没有 task warning 的情况下继续
