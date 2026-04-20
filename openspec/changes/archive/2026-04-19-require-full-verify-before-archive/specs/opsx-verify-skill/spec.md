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
- **THEN** `/opsx:verify` SHALL spawn a clean-context reviewer subagent to execute verification
- **AND** 该 reviewer subagent SHALL 接收显式输入：change artifacts、git evidence output、final file contents
- **AND** 该 reviewer subagent SHALL NOT have access to implementation conversation history
- **AND** SHALL record `executionMode: 'clean-context-reviewer'` in verify result
- **AND** 具体实现见 `prompts.md` 中的 `CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT`

#### Scenario: 工具不支持 clean-context subagent 验证
- **WHEN** 当前 AI 工具不支持 clean-context subagent execution
- **THEN** `/opsx:verify` SHALL 在当前 agent 中执行 with explicit re-read protocol
- **AND** the agent SHALL 在做出任何验证判断前，从磁盘重新读取所有输入：change artifacts、git evidence、final file contents
- **AND** SHALL 将实现对话视为非权威背景上下文
- **AND** SHALL record `executionMode: 'current-agent-reread'` in verify result
- **AND** 具体实现见 `prompts.md` 中的 `CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD`

### Requirement: Correctness Verification
The agent SHALL 通过将 change 意图与仓库最终状态做对照来验证实现是否符合规格，并将 git 证据仅用作发现线索而非事实来源。

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
- **AND** 给出”Implement requirement X”及所需修改方向
- **AND** 说明搜索过程和为何判定为缺失
