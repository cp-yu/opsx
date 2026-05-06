## ADDED Requirements

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

#### Scenario: JSON schema 速查表覆盖所有 CLI 调用

- **WHEN** `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 常量被渲染到模板中
- **THEN** 速查表 SHALL 包含以下条目及其 `--input` JSON 格式：
  - `phase1`：`{"result":"PASS","issues":[],"evidenceFiles":[...],"executionMode":"..."}`
  - `phase2 --type=optimization`（NO_OPTIMIZATION_NEEDED）：`{"status":"NO_OPTIMIZATION_NEEDED"}`
  - `phase2 --type=optimization`（OPTIMIZATION_PROPOSED）：`{"status":"OPTIMIZATION_PROPOSED","summary":"..."}`
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

#### Scenario: phase1 返回 JSON 解析错误

- **WHEN** Agent 调用 `openspec verify phase1` 返回 `Invalid JSON input` 错误
- **THEN** 模板 SHALL 指导 Agent 检查 `--input` 参数是否为合法的 JSON 字符串（非文件路径）
- **AND** SHALL 提醒 `issues` 必须为数组、`evidenceFiles` 必须为字符串数组

#### Scenario: phase2 --type=optimization 返回 status 错误

- **WHEN** Agent 调用 `openspec verify phase2 --type=optimization` 返回 `status must be NO_OPTIMIZATION_NEEDED, OPTIMIZATION_PROPOSED, ABORTED_UNSAFE, or SKIPPED`
- **THEN** 模板 SHALL 指导 Agent 检查 `--input` 中 `status` 值是否在允许列表中
- **AND** SHALL 提醒检查当前 `optimization.status`：若有 `affectedFileHashes` 则必须先调用 `--type=verification`

#### Scenario: phase2 --type=verification 返回 result 错误

- **WHEN** Agent 调用 `openspec verify phase2 --type=verification` 返回 `result must be PASS, PASS_WITH_WARNINGS, or FAIL_NEEDS_REMEDIATION`
- **THEN** 模板 SHALL 指导 Agent 检查 `--input` 中 `result` 值
- **AND** SHALL 提醒 `issues` 字段可选但若提供必须为数组

#### Scenario: phase2 --type=verification 返回 OPTIMIZATION_REQUIRED

- **WHEN** Agent 调用 `openspec verify phase2 --type=verification`
- **AND** CLI 返回 `尚未提交优化结果，请先调用 phase2 --type=optimization`
- **THEN** 模板 SHALL 指导 Agent 先完成 `--type=optimization` 调用再重试
- **AND** SHALL 说明正确的调用顺序：先 optimization 再 verification

### Requirement: 简单变更快速路径识别

三个 skill 模板（archive/verify/apply）SHALL 包含简单变更快速路径指引，对于纯删除、重命名等无优化空间的变更，Agent 可直接走 `NO_OPTIMIZATION_NEEDED` 路径。

#### Scenario: 识别简单变更跳过优化分析

- **WHEN** Agent 进入 Phase 2 优化阶段
- **AND** 变更仅涉及参数移除、文件删除、重命名等不改变逻辑的操作
- **THEN** 模板 SHALL 指导 Agent 可直接调用 `openspec verify phase2 "<name>" --type=optimization --input '{"status":"NO_OPTIMIZATION_NEEDED"}' --json`
- **AND** SHALL NOT 要求 Agent 对简单变更启动完整的优化 subagent 分析
