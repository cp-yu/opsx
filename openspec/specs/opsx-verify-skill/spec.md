# opsx-verify-skill Specification

## Purpose
Define `/opsx:verify` behavior for assessing implementation completeness, correctness, and coherence against change artifacts.
## Requirements
### Requirement: Verify Skill Invocation
The system SHALL 提供 `/opsx:verify` skill，并使用能够最小化实现上下文偏见的执行方式来校验实现与 change artifacts 的一致性。

#### Scenario: 提供 change name 执行 verify
- **WHEN** agent 执行 `/opsx:verify <change-name>`
- **THEN** the agent 针对该特定 change 校验实现
- **AND** 产出 verification report

#### Scenario: 未提供 change name 执行 verify
- **WHEN** agent 在未提供 change name 的情况下执行 `/opsx:verify`
- **THEN** the agent 提示用户从可用 changes 中选择
- **AND** 仅展示那些已经拥有实现任务的 changes

#### Scenario: Change 不包含 tasks
- **WHEN** 选中的 change 没有 `tasks.md` 或 tasks 为空
- **THEN** the agent 报告“没有可供 verify 的任务”
- **AND** 建议运行 `/opsx:continue` 创建任务

#### Scenario: 工具支持 clean-context subagent 验证 (Claude Code, Codex)
- **WHEN** 当前 AI 工具支持 clean-context subagent execution (Claude Code, Codex)
- **THEN** `/opsx:verify` SHALL 使用专用的 subagent-orchestrated verify 模板骨架
- **AND** 顶层 agent SHALL 先收集显式输入：change artifacts、git evidence output、final file contents
- **AND** 顶层 agent SHALL spawn a clean-context reviewer subagent to execute Phase 1 verification
- **AND** 顶层 agent SHALL NOT 直接执行 completeness、correctness 或 coherence judgment
- **AND** reviewer subagent SHALL NOT have access to implementation conversation history
- **AND** write-back 与 verify result persistence MAY 由顶层 agent 在接收结构化 reviewer output 后执行
- **AND** 若 reviewer subagent 无法启动、超时或返回不可消费的 payload，`/opsx:verify` SHALL fail closed，而不是静默降级到 current-agent-reread
- **AND** SHALL record `executionMode: 'subagent-orchestrated'` in verify result

#### Scenario: 工具不支持 clean-context subagent 验证
- **WHEN** 当前 AI 工具不支持 clean-context subagent execution
- **THEN** `/opsx:verify` SHALL 在当前 agent 中执行 with explicit re-read protocol
- **AND** the agent SHALL 在做出任何验证判断前，从磁盘重新读取所有输入：change artifacts、git evidence、final file contents
- **AND** SHALL 将实现对话视为非权威背景上下文
- **AND** SHALL record `executionMode: 'current-agent-reread'` in verify result
- **AND** 具体实现见 `prompts.md` 中的 `CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD`

### Requirement: Completeness Verification
The agent SHALL verify that all required work has been completed, including work whose deliverable is the absence of code.

#### Scenario: Task completion check
- **WHEN** verifying completeness
- **THEN** the agent reads tasks.md
- **AND** counts tasks marked `- [x]` (complete) vs `- [ ]` (incomplete)
- **AND** reports completion status with specific incomplete tasks listed

#### Scenario: Spec coverage check
- **WHEN** verifying completeness
- **AND** delta specs exist in `openspec/changes/<name>/specs/`
- **THEN** the agent extracts all requirements from delta specs
- **AND** 按锚定类型核查：ADDED/MODIFIED requirement 在 codebase 中搜索实现证据；REMOVED requirement 搜索残留引用并确认缺失
- **AND** reports which requirements appear to have implementation vs which are missing
- **AND** 对 REMOVED requirement 报告缺失确认结果，发现残留 = 未完成

#### Scenario: All tasks complete
- **WHEN** all tasks are marked complete
- **THEN** report "Tasks: N/N complete"
- **AND** mark completeness dimension as passed

#### Scenario: Incomplete tasks found
- **WHEN** some tasks are incomplete
- **THEN** report "Tasks: X/N complete"
- **AND** list each incomplete task
- **AND** mark as CRITICAL issue
- **AND** suggest: "Complete remaining tasks or mark as done if already implemented"

#### Scenario: Delete 声明核对

- **WHEN** verifying completeness
- **AND** 某 task 的 `Files` 包含 `Delete:` 条目
- **THEN** the agent SHALL 在 `git diff <originalBranch>...HEAD` 中逐项确认声明的文件已删除
- **AND** 声明已删除但文件仍存在时 SHALL mark as CRITICAL issue

### Requirement: Correctness Verification
The agent SHALL 通过将 change 意图与仓库最终状态做对照来验证实现是否符合规格，并将 git 证据仅用作发现线索而非事实来源。判定模式按 Check 锚点类型分派：`Verifies`（普通 requirement）执行存在性判定，`Verifies ... REMOVED Requirement` 执行缺失性判定，`Preserves` 执行等价性判定。

#### Scenario: requirement 与实现映射
- **WHEN** 验证 correctness
- **THEN** 对 delta specs 中的每个 requirement：
  - 搜索 codebase 中的实现位置
  - 标识相关文件与行号
  - 判断最终文件内容是否满足该 requirement

#### Scenario: scenario 覆盖检查
- **WHEN** 验证 correctness
- **THEN** 对 delta specs 中的每个 scenario：
  - 检查代码是否处理了该 scenario 的条件
  - 检查是否存在覆盖该 scenario 的测试
  - 报告覆盖状态

#### Scenario: Git evidence 作为调查线索
- **WHEN** 验证一个带有本地修改或最近提交的 change
- **THEN** the agent SHALL 使用 git status / diff / log 定位候选文件、声称实现的区域与可疑遗漏
- **AND** SHALL 将 git evidence 视为调查线索，NOT sufficient proof of requirement satisfaction
- **AND** SHALL 遵循证据优先级顺序：change artifacts → git evidence (guide) → final file contents (judge) → tests
- **AND** 具体协议见 `prompts.md` 中的 `GIT_EVIDENCE_PROTOCOL`

#### Scenario: 最终文件内容是权威判断依据
- **WHEN** 某个 git diff 看起来已经满足 requirement
- **AND** 最终文件内容仍然偏离 spec 或 design intent
- **THEN** verification result SHALL 以最终文件内容为准
- **AND** the agent SHALL 报告该偏离，即使 diff 单看似乎合理

#### Scenario: 实现存在但不在 diff 中
- **WHEN** 某个 requirement 在最终文件中已满足
- **AND** 该实现不在 git diff 中可见（例如在已有文件中完成）
- **THEN** verification result SHALL 仍然标记该 requirement 为 covered
- **AND** SHALL cite 具体文件路径和行号作为证据

#### Scenario: Step-by-step objective verification
- **WHEN** 验证任何 requirement
- **THEN** the agent SHALL 遵循以下步骤：
  1. **Locate**: 搜索代码库中与 requirement 相关的关键词，识别候选文件
  2. **Read**: 读取实际文件内容（不仅是搜索结果或 git diffs）
  3. **Analyze**: 将文件内容与 requirement intent 和 scenario conditions 对比
  4. **Cite**: 记录具体文件路径和行号作为证据
  5. **Judge**: 基于证据做出 PASS/WARNING/CRITICAL 判断
  6. **Explain**: 对于非 PASS 判断，解释缺失或偏离之处
- **AND** 具体标准见 `prompts.md` 中的 `CONFORMANCE_CHECK_RULES` 更新

#### Scenario: 实现符合 spec
- **WHEN** 实现满足某个 requirement，且有清晰的文件内容证据
- **THEN** 报告由哪些 files/lines 实现
- **AND** 将该 requirement 标记为 covered (PASS)
- **AND** MUST cite specific file:line references

#### Scenario: 实现偏离 spec
- **WHEN** 实现存在但不完全符合 spec intent，或置信度不足以给 PASS
- **THEN** 将该偏离报告为 WARNING
- **AND** 解释差异点或不确定性
- **AND** 建议更新实现或更新 spec 以匹配现实

#### Scenario: 缺少实现
- **WHEN** 经过彻底搜索后，没有找到某个 requirement 的可信实现证据
- **THEN** 将其报告为 CRITICAL issue
- **AND** 给出"Implement requirement X"及所需修改方向
- **AND** 说明搜索过程和为何判定为缺失

#### Scenario: REMOVED requirement 的缺失性判定
- **WHEN** 验证 correctness
- **AND** 某 Check 锚定 delta spec 的 REMOVED requirement
- **THEN** the agent SHALL 多角度搜索该交付物的残留：符号名、文件路径、import 引用
- **AND** 判定 PASS 时 SHALL 引用搜索命令与空结果作为证据
- **AND** 发现任何残留引用时 SHALL 报告为 CRITICAL issue 并引用残留位置

#### Scenario: Preserves 锚点的双支等价性判定
- **WHEN** 验证 correctness
- **AND** 某 Check 通过 `Preserves:` 锚定主 spec 的 requirement 与 scenario
- **THEN** the agent SHALL 验证两支证据：关联测试通过（行为不变）且 Check `Expect:` 点名的旧形态在最终代码中已消失
- **AND** 旧形态与新实现并存时 SHALL 报告为 CRITICAL issue
- **AND** SHALL NOT 仅凭测试通过判定等价性成立

### Requirement: Coherence Verification
The agent SHALL verify that implementation is sensible and follows design decisions.

#### Scenario: Design.md adherence check
- **WHEN** verifying coherence
- **AND** design.md exists for the change
- **THEN** extract key decisions from design.md
- **AND** verify implementation follows those decisions
- **AND** report any deviations

#### Scenario: No design.md
- **WHEN** verifying coherence
- **AND** no design.md exists
- **THEN** skip design adherence check
- **AND** note "No design.md to verify against"

#### Scenario: Design decision followed
- **WHEN** implementation follows a design decision
- **THEN** report as confirmed
- **AND** cite evidence from code

#### Scenario: Design decision violated
- **WHEN** implementation contradicts a design decision
- **THEN** report as WARNING
- **AND** explain the contradiction
- **AND** suggest: either update implementation or update design.md

#### Scenario: Code pattern consistency
- **WHEN** verifying coherence
- **THEN** check if new code follows existing project patterns
- **AND** flag any significant deviations as suggestions

### Requirement: Verification Report Format

The agent SHALL produce a structured, prioritized report with exit code semantics, now including optimization phase results.

#### Scenario: Report summary with optimization

- **WHEN** verification completes
- **THEN** display summary scorecard:
  ```text
  ## Verification Report: <change-name>

  ### Summary
  | Dimension    | Status   |
  |--------------|----------|
  | Completeness | X/Y      |
  | Correctness  | X/Y      |
  | Coherence    | Followed |
  | Optimization | <status> |
  ```
- **AND** the optimization row shows the Phase 2 outcome（`SKIPPED`、`NOT_NEEDED`、`IMPROVED`、`DEGRADED`、`ABORTED_UNSAFE`）

#### Scenario: All checks pass with optimization

- **WHEN** no issues found across all dimensions
- **AND** Phase 2 completed with `IMPROVED`
- **THEN** display: `All checks passed. Code optimized. Ready for archive.`
- **AND** persist result as `PASS`

#### Scenario: Degraded Pass with warnings

- **WHEN** Phase 2 reached `DEGRADED` after 3 failed behavior attempts
- **THEN** display: `Phase 1 PASS. 3 optimization attempts safely reverted.`
- **AND** persist result as `PASS_WITH_WARNINGS`

### Requirement: Verify Write-back
The agent SHALL write back high-confidence CRITICAL verification failures into `tasks.md`.

#### Scenario: CRITICAL issue unmarks completed task
- **WHEN** verify finds a CRITICAL issue that maps to a task currently marked `- [x]`
- **THEN** the agent SHALL change that task entry to `- [ ]`
- **AND** SHALL explain the requirement and reason in the remediation output

#### Scenario: WARNING issue does not unmark task
- **WHEN** verify finds only WARNING or SUGGESTION issues for a completed task
- **THEN** the agent SHALL keep the task marked complete
- **AND** SHALL report the issue without mutating `tasks.md`

#### Scenario: Remediation section appended
- **WHEN** verify finds one or more fixable issues
- **THEN** the agent SHALL append or refresh a `## Remediation` section in `tasks.md`
- **AND** SHALL write each remediation item as a checkbox tagged `[code_fix]` or `[artifact_fix]`
- **AND** SHALL avoid duplicating the same remediation item across repeated runs

### Requirement: Verify Result Persistence

The agent SHALL persist verification results including optimization data for downstream apply/archive flows.

#### Scenario: Verify result file written with optimization

- **WHEN** verify completes
- **THEN** the agent SHALL write `openspec/changes/<name>/.verify-result.json`
- **AND** the file SHALL include `timestamp`、`result`、`issues`、`tasksFileHash`、`verificationContext`、**`optimization`**
- **AND** `optimization` SHALL contain `status`、`score`、`attempts`、`baseline`、`final`

#### Scenario: optimization 对象不改变顶层 result 语义

- **WHEN** Phase 1 result is `PASS` and optimization.status is `DEGRADED`
- **THEN** `.verify-result.json` 顶层 `result` SHALL be `PASS_WITH_WARNINGS`
- **AND** 详细优化状态仅在 `optimization.status` 中记录

### Requirement: Flexible Artifact Handling
The agent SHALL gracefully handle changes with varying artifact completeness.

#### Scenario: Minimal change (tasks only)
- **WHEN** change has only tasks.md
- **THEN** verify task completion only
- **AND** skip spec and design checks
- **AND** note which checks were skipped

#### Scenario: Change with specs but no design
- **WHEN** change has tasks.md and delta specs but no design.md
- **THEN** verify completeness and correctness
- **AND** skip design adherence
- **AND** still check code coherence against project patterns

#### Scenario: Full change (all artifacts)
- **WHEN** change has proposal, design, specs, and tasks
- **THEN** perform all verification checks
- **AND** cross-reference artifacts for consistency

