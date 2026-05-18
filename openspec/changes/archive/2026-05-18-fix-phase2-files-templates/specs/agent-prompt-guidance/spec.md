## MODIFIED Requirements

### Requirement: 共享 verify gate 指引片段

系统 SHALL 在 `src/core/templates/fragments/opsx-fragments.ts` 中提供共享的 verify gate 指引常量，供 archive、verify、apply 三个 skill 模板复用。指引片段 SHALL 包含以下三个组件：

1. **状态机流程图** (`VERIFY_STATE_MACHINE_DIAGRAM`)：ASCII 图展示 Phase 1 → Phase 2 optimization → Phase 2 verification → 终态的完整流转，标注所有中间状态和终态
2. **JSON schema 速查表** (`VERIFY_CLI_JSON_SCHEMA_REFERENCE`)：Markdown 表格列出 phase1/phase2 所有 CLI 调用及其 `--input` JSON 格式
3. **错误恢复决策树** (`VERIFY_ERROR_RECOVERY_GUIDE`)：决策树文本指导 Agent 在 CLI 返回各类错误时如何恢复

#### Scenario: OPTIMIZATION_PROPOSED 行包含 --files 参数

- **WHEN** `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 常量被渲染到模板中
- **THEN** `OPTIMIZATION_PROPOSED` 条目的 CLI call 列 SHALL 包含 `--files "<affected-files>"` 参数
- **AND** 该参数 SHALL 位于 `--type=optimization` 之后、`--input` 之前

#### Scenario: 速查表覆盖所有 CLI 调用（保留原有覆盖范围）

- **WHEN** `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 常量被渲染到模板中
- **THEN** 速查表 SHALL 包含以下条目及其 `--input` JSON 格式：
  - `phase1`：`{"result":"PASS","issues":[],"evidenceFiles":[...],"executionMode":"..."}`
  - `phase2 --type=optimization`（NO_OPTIMIZATION_NEEDED）：`{"status":"NO_OPTIMIZATION_NEEDED","summary":"..."}`
  - `phase2 --type=optimization --files`（OPTIMIZATION_PROPOSED）：`{"status":"OPTIMIZATION_PROPOSED","summary":"..."}`
  - `phase2 --type=optimization`（SKIPPED）：`{"status":"SKIPPED"}`
  - `phase2 --type=verification`（PASS）：`{"result":"PASS","issues":[]}`
  - `phase2 --type=verification`（FAIL）：`{"result":"FAIL_NEEDS_REMEDIATION","issues":[...],"behaviorRetryCounter":N}`

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

## ADDED Requirements

### Requirement: apply 工作流 Phase 2 命令模板包含 --files

`apply-change.ts` 中 Phase 2 TIMING CONSTRAINT 步骤的命令模板 SHALL 在 `OPTIMIZATION_PROPOSED` 调用中包含 `--files` 参数，确保 agent 按模板构造命令时不会触发 `FILES_REQUIRED` 错误。

#### Scenario: apply 模板命令包含 --files

- **WHEN** apply-change 模板渲染 Phase 2 TIMING CONSTRAINT 步骤
- **THEN** 步骤 1 的命令模板 SHALL 为 `openspec verify phase2 "<change-name>" --type=optimization --files "<affected-files>" --input '<json>'`
- **AND** `<affected-files>` 占位符 SHALL 在上下文中说明来源为 optimizer subagent 声明的文件列表
