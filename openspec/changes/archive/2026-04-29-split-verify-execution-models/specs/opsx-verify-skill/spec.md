## MODIFIED Requirements

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
