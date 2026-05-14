# ai-workflow-templates Specification (Delta)

## ADDED Requirements

### Requirement: Verify template 包含 coordinator 角色和 mode label

verify-change template（`buildVerifyIntro`）SHALL 在编号步骤开始前包含显式 coordinator role declaration 和 mode label reference table。

role declaration SHALL 将 coordinator、reviewer subagent、optimizer subagent 和 CLI 定义为职责互不重叠的独立角色。

mode label table SHALL 列出 `verify-prompt-orchestration` capability 中定义的全部 10 个 mode label 及其对应 phase 和 trigger。

#### Scenario: Verify prompt 组装时包含角色声明

- **WHEN** 使用 `SUBAGENT_VERIFY_EXECUTION_MODEL` 调用 `createVerifyChangeSkillTemplateForExecutionModel`
- **THEN** 生成的 skill instructions SHALL 以 coordinator role declaration 开头
- **AND** SHALL 包含 mode label reference table
- **AND** 现有 `"Verify that an implementation matches..."` 文本 SHALL 跟在这些新增内容之后

#### Scenario: Reread mode 同样接收角色和 mode label

- **WHEN** 使用 `REREAD_VERIFY_EXECUTION_MODEL` 调用 `createVerifyChangeSkillTemplateForExecutionModel`
- **THEN** 生成的 skill instructions SHALL 同样包含 coordinator role 和 mode label table
- **AND** reread-specific clean-context protocol SHALL 保持不变

### Requirement: Verify template 对 subagent 使用明确 delegation 指令

`buildSubagentVerifyInstructions` function SHALL 将 Step 5 中的 prose description `"Spawn a clean-context reviewer subagent"` 替换为明确的 subagent delegation instructions。

delegation instructions SHALL 指定：

- 调用 clean-context reviewer subagent
- invoke `openspec-reviewer`
- 传入显式 evidence bundle 结构
- 等待完整 reviewer payload

`buildPhase2Step` function SHALL 将 `"Phase 2 Optimization Protocol"` 中的 prose description 替换为 optimizer subagent 的明确 delegation instructions。

#### Scenario: Reviewer subagent step 具有明确 delegation 指令

- **WHEN** subagent-orchestrated verify prompt 到达 Step 5
- **THEN** prompt SHALL 明确要求调用 clean-context reviewer subagent
- **AND** prompt SHALL instruct reviewer to invoke `openspec-reviewer`
- **AND** prompt SHALL 包含 evidence bundle 字段列表
- **AND** SHALL NOT 只包含 `"Spawn a clean-context reviewer subagent"` 这类 prose

#### Scenario: Optimizer subagent step 具有明确 delegation 指令

- **WHEN** verify prompt 到达 Phase 2 optimization step
- **THEN** prompt SHALL 明确要求调用 clean-context optimizer subagent
- **AND** prompt SHALL instruct optimizer to invoke `openspec-optimizer`
- **AND** SHALL 将 failedDirections 作为具名输入字段传入

#### Scenario: Verify template 不包含工具 API 语法

- **WHEN** verify prompt 被组装
- **THEN** prompt SHALL NOT 包含 `Agent({`
- **AND** prompt SHALL NOT 包含 `TaskOutput({`
- **AND** prompt SHALL NOT 包含 `AskUserQuestion`

### Requirement: Phase 2 checkpoint state machine 使用表格格式

`buildPhase2Step` function SHALL 将 checkpoint state machine description 从连续 prose paragraph 重构为 Markdown table，映射 state、trigger 和 git operation。

`VERIFY_STATE_MACHINE_DIAGRAM` fragment SHALL 放在 Phase 2 section 开头，位于 checkpoint state machine table 之前。

`Hard rules` bullet list SHALL 跟在表格之后，列出不可协商的安全约束。

#### Scenario: Checkpoint state 以表格展示

- **WHEN** verify prompt 到达 Phase 2 checkpoint section
- **THEN** 四个 state（CREATED、BASELINE_RESTORED_FOR_RETRY、TERMINAL_ACCEPTED、TERMINAL_RESTORED）SHALL 出现在表格中
- **AND** 每一行 SHALL 显示 state name、trigger condition 和 git operation
- **AND** 表格前 SHALL 出现 `[Mode: Checkpoint]` label

### Requirement: Verify fragment 提取到 opsx-fragments.ts

coordinator role declaration text 和 subagent timeout/waiting rules SHALL 提取为 `src/core/templates/fragments/opsx-fragments.ts` 中的 exported constants。

新增 constants SHALL 为：

- `VERIFY_COORDINATOR_ROLE`: 包含 4-role table 和 core constraint 的完整 role declaration block
- `VERIFY_SUBAGENT_TIMEOUT_RULES`: 工具无关 timeout/waiting constraints block

这些 fragments SHALL 由 `verify-change.ts` import，并在 `buildVerifyIntro`、`buildSubagentVerifyInstructions` 和 `buildPhase2Step` 的适当组装点注入。

#### Scenario: Fragment 可 import 并可注入

- **WHEN** `verify-change.ts` 需要 coordinator role text
- **THEN** 它 SHALL 从 `opsx-fragments.js` import `VERIFY_COORDINATOR_ROLE`
- **AND** SHALL 不经修改地注入 assembled prompt string
- **AND** SHALL NOT inline duplicate role text

#### Scenario: Timeout rules 注入到所有 subagent spawn 位置

- **WHEN** verify prompt 包含 subagent spawn step
- **THEN** assembled prompt SHALL 包含来自 `VERIFY_SUBAGENT_TIMEOUT_RULES` 的 timeout/waiting rules
- **AND** SHALL 出现在 subagent delegation instructions 之后
