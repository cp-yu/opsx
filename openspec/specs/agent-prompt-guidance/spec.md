# agent-prompt-guidance Specification

## Purpose
此规约记录变更 unify-apply-verify 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 共享 verify gate 指引片段

系统 SHALL 在 `src/core/templates/fragments/opsx-fragments.ts` 中提供共享的 verify gate 指引常量，供 archive、verify、apply 三个 skill 模板复用。指引片段 SHALL 包含以下三个组件：

1. **状态机流程图** (`VERIFY_STATE_MACHINE_DIAGRAM`)：ASCII 图展示 Phase 1 → Phase 2 optimization → Phase 2 verification → 终态的完整流转，标注所有中间状态和终态
2. **JSON schema 速查表** (`VERIFY_CLI_JSON_SCHEMA_REFERENCE`)：Markdown 表格列出 phase1/phase2 所有 CLI 调用及其 `--input` JSON 格式
3. **错误恢复决策树** (`VERIFY_ERROR_RECOVERY_GUIDE`)：决策树文本指导 Agent 在 CLI 返回各类错误时如何恢复

#### Scenario: 模板引用共享片段

- **WHEN** archive、verify 或 apply 模板需要输出 verify CLI 调用指引
- **THEN** 模板 SHALL 引用 `opsx-fragments.ts` 中导出的共享常量
- **AND** SHALL NOT 在各模板中各自内联 CLI 调用格式

#### Scenario: 状态机图覆盖所有状态转换

- **WHEN** `VERIFY_STATE_MACHINE_DIAGRAM` 常量被渲染到模板中
- **THEN** 流程图 SHALL 展示以下完整转换路径：
  - Phase 1 PASS → `PENDING_VERIFICATION`（无 affectedFileHashes）
  - `PENDING_VERIFICATION` → `NOT_NEEDED`（NO_OPTIMIZATION_NEEDED）
  - `PENDING_VERIFICATION` → `SKIPPED`（config 禁用或 --skip-optimization）
  - `PENDING_VERIFICATION` → `PENDING_VERIFICATION`（有 affectedFileHashes，OPPORTUNITY_PROPOSED）
  - `PENDING_VERIFICATION`（有 hashes）→ `IMPROVED`（verification PASS）
  - `PENDING_VERIFICATION`（有 hashes）→ `DEGRADED`（verification 重试耗尽）
- **AND** 标注 archive gate 仅接受的终态：`SKIPPED | NOT_NEEDED | IMPROVED | DEGRADED`
- **AND** 标注 archive gate 拒绝的状态：`PENDING_VERIFICATION | ABORTED_UNSAFE`

#### Scenario: OPTIMIZATION_PROPOSED 行 参数

- **WHEN** `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 常量被渲染到模板中
- **THEN** `OPTIMIZATION_PROPOSED` 条目的 CLI call 列 SHALL 包含 `--files "<affected-files>"` 参数
- **AND** 该参数 SHALL 位于 `--type=optimization` 之后、`--input` 之前

#### Scenario: JSON schema 速查表覆盖所有 CLI 调用

- **WHEN** `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 常量被渲染到模板中
- **THEN** 速查表 SHALL 包含以下条目及其 `--input` JSON 格式：
  - `phase1`：`{"result":"PASS","issues":[],"evidenceFiles":[...],"executionMode":"..."}`
  - `phase2 --type=optimization`（NO_OPTIMIZATION_NEEDED）：`{"status":"NO_OPTIMIZATION_NEEDED","summary":"..."}`
  - `phase2 --type=optimization --files`（OPTIMIZATION_PROPOSED）：`{"status":"OPTIMIZATION_PROPOSED","summary":"..."}`
  - `phase2 --type=optimization`（SKIPPED）：`{"status":"SKIPPED"}`
  - `phase2 --type=verification`（PASS）：`{"result":"PASS","issues":[]}`
  - `phase2 --type=verification`（FAIL）：`{"result":"FAIL_NEEDS_REMEDIATION","issues":[...],"behaviorRetryCounter":N}`

### Requirement: Archive 模板 PENDING_VERIFICATION 恢复路径

archive skill 模板 SHALL 在 Step 2（Unified Full Verify Gate）检测到 `PENDING_VERIFICATION` 时，提供具体的恢复指引而非仅输出 STOP。

#### Scenario: PENDING_VERIFICATION 无 affectedFileHashes

- **WHEN** `openspec verify status` 报告 `optimization.status = PENDING_VERIFICATION`
- **AND** `.verify-result.json` 中 `optimization.affectedFileHashes` 不存在或为空
- **THEN** 模板 SHALL 指导 Agent 执行 Phase 2 优化分析
- **AND** 若无优化空间，SHALL 调用 `openspec verify phase2 "<name>" --type=optimization --input '{"status":"NO_OPTIMIZATION_NEEDED"}' --json`
- **AND** 调用后 `optimization.status` 变为 `NOT_NEEDED`，archive 门禁通过

#### Scenario: PENDING_VERIFICATION 有 affectedFileHashes

- **WHEN** `openspec verify status` 报告 `optimization.status = PENDING_VERIFICATION`
- **AND** `.verify-result.json` 中 `optimization.affectedFileHashes` 存在且非空
- **THEN** 模板 SHALL 指导 Agent 先完成 verification 调用
- **AND** SHALL 调用 `openspec verify phase2 "<name>" --type=verification --input '{"result":"PASS","issues":[]}' --json`
- **AND** 调用后 `optimization.status` 变为 `IMPROVED` 或 `DEGRADED`，archive 门禁通过

#### Scenario: ABORTED_UNSAFE 保持 STOP

- **WHEN** `openspec verify status` 报告 `optimization.status = ABORTED_UNSAFE`
- **THEN** 模板 SHALL 保持 STOP 行为
- **AND** SHALL 不提供自动恢复路径（需要人工介入）

### Requirement: Verify 模板 CLI 错误恢复指南

verify skill 模板的 `buildCanonicalPhase1Step` 和 `buildPhase2Step` SHALL 包含显式的 CLI 错误恢复指南，指导 Agent 在 CLI 返回非零退出码时如何诊断和恢复。

#### Scenario: phase2 --type=optimization 返回 FILES_REQUIRED 错误

- **WHEN** Agent 调用 `openspec verify phase2 --type=optimization` 且 `--input.status` 为 `OPTIMIZATION_PROPOSED`
- **AND** CLI 返回 `{"ok": false, "reason": "FILES_REQUIRED"}`
- **THEN** `VERIFY_ERROR_RECOVERY_GUIDE` SHALL 包含一条恢复指引
- **AND** 该指引 SHALL 指导 Agent 补充 `--files` 参数，传入 optimizer 声明的受影响文件路径列表

#### Scenario: 保留原有错误恢复条目

- **WHEN** `VERIFY_ERROR_RECOVERY_GUIDE` 常量被渲染到模板中
- **THEN** SHALL 保留以下已有恢复条目：
  - `Invalid JSON input` → 检查 `--input` 是否为合法 JSON
  - `status must be ...` → 检查 `--input.status` 值
  - `result must be ...` → 检查 `--input.result` 值
  - `尚未提交优化结果` → 先调用 `--type=optimization`

### Requirement: 简单变更快速路径识别

三个 skill 模板（archive/verify/apply）SHALL 包含 Phase 2 强制委托指引。`VERIFY_SIMPLE_CHANGE_FAST_PATH` 常量 SHALL 重写为强制委托语义：master agent MUST 始终 spawn optimizer subagent，由 optimizer subagent 决定是否存在优化机会。

#### Scenario: optimizer subagent 返回无优化机会

- **WHEN** Agent 进入 Phase 2 优化阶段
- **AND** optimizer subagent 分析后返回 "No optimization opportunities found"
- **THEN** master agent SHALL 调用 `openspec verify phase2 "<name>" --type=optimization --input '{"status":"NO_OPTIMIZATION_NEEDED","summary":"<optimizer结论>"}' --json`
- **AND** summary 字段 SHALL 包含 optimizer subagent 的实际结论文本

#### Scenario: master agent 不得自行判断跳过

- **WHEN** Agent 进入 Phase 2 优化阶段
- **AND** `optimization.enabled` 为 `true`
- **AND** 未传入 `--skip-optimization`
- **THEN** master agent MUST NOT 自行调用 `NO_OPTIMIZATION_NEEDED` 而不 spawn optimizer subagent
- **AND** 唯一允许跳过 optimizer subagent 的条件为 `--skip-optimization` flag 或 `optimization.enabled: false`

#### Scenario: 所有 change 类型均强制调用 optimizer

- **WHEN** Phase 1 返回 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `optimization.enabled` 为 `true`
- **THEN** 系统 SHALL 始终 spawn optimizer subagent，无论 change 类型（包括纯删除、重命名）
- **AND** optimizer subagent 对简单 change 快速返回 "No optimization opportunities found"

### Requirement: apply 工作流 Phase 2 命令模板

`apply-change.ts` 中 Phase 2 TIMING CONSTRAINT 步骤的命令模板 SHALL 在 `OPTIMIZATION_PROPOSED` 调用中包含 `--files` 参数，确保 agent 按模板构造命令时不会触发 `FILES_REQUIRED` 错误。

#### Scenario: apply 模板命令

- **WHEN** apply-change 模板渲染 Phase 2 TIMING CONSTRAINT 步骤
- **THEN** 步骤 1 的命令模板 SHALL 为 `openspec verify phase2 "<change-name>" --type=optimization --files "<affected-files>" --input '<json>'`
- **AND** `<affected-files>` 占位符 SHALL 在上下文中说明来源为 optimizer subagent 声明的文件列表

