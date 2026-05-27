# verify-prompt-orchestration Specification (Delta)

## MODIFIED Requirements

### Requirement: Explicit subagent delegation instructions

verify 工作流提示词 SHALL 提供明确的 subagent delegation 指令，用于启动 reviewer 和 optimizer subagent。

提示词 SHALL NOT 写入任何工具专属 API 调用语法。提示词 SHALL 只描述工作流意图、subagent 角色、skill invoke、输入信息和等待规则。

reviewer subagent delegation 指令 SHALL 包含：

- 调用 clean-context reviewer subagent，赋予 Read 和 Bash 工具能力
- instruct subagent to invoke `openspec-reviewer`
- 传入轻量定位信息：`changeName`、`changeDir`、`projectRoot`
- 声明 subagent 将自主读取文件、执行 git 命令和按需跑测试
- 要求 top-level agent 等待完整 reviewer payload 后再进入 payload validation
- 要求 top-level agent MUST NOT substitute its own completeness/correctness/coherence verdict

optimizer subagent delegation 指令 SHALL 包含：

- 调用 clean-context optimizer subagent，赋予 Read 和 Bash 工具能力
- instruct subagent to invoke `openspec-optimizer`
- 传入轻量定位信息：`changeName`、`changeDir`、`projectRoot`
- 声明 subagent 将自主从 `.verify-result.json` 读取 Phase 1 结果和 evidence 列表
- 要求 optimizer 只返回 Search/Replace blocks 或 `No optimization opportunities found`
- 要求 top-level agent 等待完整 optimizer payload 后再应用块或记录 NO_OPTIMIZATION_NEEDED

#### Scenario: Master 委派 reviewer 时只传定位信息
- **WHEN** verify coordinator 进入 `[Mode: Delegate Review]`
- **THEN** coordinator SHALL 传入 changeName、changeDir、projectRoot 三个字符串
- **AND** SHALL NOT 传入 finalFileContents、changeArtifacts 或 gitEvidence 的完整文本
- **AND** SHALL 声明 reviewer 拥有 Read + Bash 工具能力

#### Scenario: Master 委派 optimizer 时只传定位信息
- **WHEN** verify coordinator 进入 `[Mode: Optimize]`
- **THEN** coordinator SHALL 传入 changeName、changeDir、projectRoot 三个字符串
- **AND** SHALL NOT 传入 phase1Summary、finalFileContents 或 config 的完整内容
- **AND** SHALL 声明 optimizer 拥有 Read + Bash 工具能力

### Requirement: Coordinator 角色声明

verify 工作流提示词 SHALL 以显式 coordinator 角色声明开头，将 top-level agent 定义为 verification coordinator，而不是 verification judge。

角色声明 SHALL 定义四个互相独立的角色及其边界：

| 角色 | 职责 |
|------|----------------|
| Coordinator (top-level agent) | 确定 change 目录、传递定位信息给 subagent、验证 payload 结构、执行确定性写回、管理 git checkpoint、通过 CLI 持久化结果 |
| Reviewer Subagent | 自主读取文件和执行测试，负责全部 completeness、correctness、coherence 裁决 |
| Optimizer Subagent | 自主读取文件，提出保持行为不变的 Search/Replace 块；绝不直接修改文件 |
| CLI | 确定性持久化、hash 计算、seal 验证 |

角色声明 SHALL 显式包含约束：`You MUST NOT substitute your own completeness/correctness/coherence judgments for the reviewer's.`

Coordinator 的 `[Mode: Evidence]` 步骤 SHALL 简化为：确定 changeDir 和 projectRoot 路径，不再读取候选文件内容。

#### Scenario: Agent 理解自身是 coordinator 而不是 judge
- **WHEN** top-level agent 加载 verify prompt
- **THEN** 第一个内容块 SHALL 声明 coordinator 角色
- **AND** SHALL 列出四个角色及其更新后的职责（coordinator 不再收集 evidence）
- **AND** SHALL 显式禁止 coordinator 自行作出裁决

#### Scenario: Evidence 步骤不再读取文件内容
- **WHEN** coordinator 进入 `[Mode: Evidence]`
- **THEN** coordinator SHALL 仅确定 changeDir 和 projectRoot 路径
- **AND** SHALL NOT 读取候选实现文件的内容
- **AND** SHALL NOT 执行 git diff 或 git status（由 subagent 自行执行）
