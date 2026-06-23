# verify-prompt-orchestration Specification

## Purpose
此规约记录变更 optimize-verify-prompts 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
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

### Requirement: 阶段模式标签

verify 工作流提示词 SHALL 使用 mode label 标记主要阶段切换，以提示认知上下文切换。

以下 mode label SHALL 放置在对应步骤：

| Mode Label | 阶段 | 触发点 |
|------------|-------|---------|
| `[Mode: Setup]` | 选择 change、加载 artifact、early-stop 检查 | Steps 1-3.5 |
| `[Mode: Evidence]` | 收集 git evidence 和 final file contents | Step 4 |
| `[Mode: Delegate Review]` | 启动 reviewer subagent 并等待结构化 payload | Step 5 |
| `[Mode: Validate Payload]` | 验证 reviewer payload 结构和证据引用 | Step 6 |
| `[Mode: Writeback]` | 将 writeBackPlan 应用到 tasks.md | Step 7 |
| `[Mode: Record]` | 通过 CLI 持久化 canonical Phase 1 result | Step 8/10 |
| `[Mode: Checkpoint]` | Phase 2 安全保护的 git stash 生命周期 | Phase 2 entry |
| `[Mode: Optimize]` | 启动 optimizer subagent 并应用 Search/Replace 块 | Phase 2 optimization |
| `[Mode: Speculative Verify]` | 不触碰 canonical result 的 P1_SPECULATIVE_FENCE re-verify | Step 10/12 |
| `[Mode: Seal]` | 最终验证和 seal hash | Step 11/13 |

Mode label SHALL NOT 应用于 checkpoint 子状态（CREATED、BASELINE_RESTORED_FOR_RETRY、TERMINAL_ACCEPTED、TERMINAL_RESTORED）；这些只是单一 `[Mode: Checkpoint]` 认知模式内的实现分支。

#### Scenario: 主要阶段切换带有 mode label

- **WHEN** verify 工作流从 evidence collection 切换到 reviewer delegation
- **THEN** step header SHALL 包含 `[Mode: Delegate Review]`
- **AND** mode label SHALL 作为 step number 的前缀

#### Scenario: Checkpoint 子状态不单独使用 mode label

- **WHEN** verify 工作流处于 Phase 2 checkpoint management
- **THEN** 单个 stash 状态（CREATED、BASELINE_RESTORED_FOR_RETRY 等）SHALL NOT 获得独立 mode label
- **AND** SHALL 在 `[Mode: Checkpoint]` section 内描述

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
- **AND** SHALL 指定 `context: "fresh"` 确保 subagent 不继承对话历史
- **AND** SHALL NOT 传入 finalFileContents、changeArtifacts 或 gitEvidence 的完整文本
- **AND** SHALL 声明 reviewer 拥有 Read + Bash 工具能力

#### Scenario: Master 委派 optimizer 时只传定位信息
- **WHEN** verify coordinator 进入 `[Mode: Optimize]`
- **THEN** coordinator SHALL 传入 changeName、changeDir、projectRoot 三个字符串
- **AND** SHALL 指定 `context: "fresh"` 确保 subagent 不继承对话历史
- **AND** SHALL NOT 传入 phase1Summary、finalFileContents 或 config 的完整内容
- **AND** SHALL 声明 optimizer 拥有 Read + Bash 工具能力

### Requirement: Subagent 超时和等待规则

verify 工作流提示词 SHALL 为所有 subagent delegation 包含显式 timeout 和 waiting rules。

timeout rules SHALL 指定工具无关约束：

- 表达 10 分钟等待预算
- 等待完整 subagent 结果
- 如果 10 分钟内未完成，继续 polling 或继续等待；SHALL NOT kill subagent
- 如果等待时间过长，询问用户继续等待还是终止
- 未经用户确认，绝不终止 subagent
- top-level agent MUST 在进入下一步前接收完整 subagent payload

#### Scenario: Reviewer subagent 超过默认 timeout

- **WHEN** reviewer subagent 在 30 秒内没有返回
- **THEN** coordinator SHALL NOT 将其视为失败
- **AND** SHALL 继续等待或 polling
- **AND** SHALL NOT 在收到结果前进入 payload validation

#### Scenario: Subagent 等待时间过长

- **WHEN** coordinator 等待某个 subagent 超过 10 分钟
- **THEN** coordinator SHALL 询问用户是否继续等待或终止
- **AND** SHALL NOT 在未经用户确认时 kill subagent

### Requirement: Checkpoint 状态机块格式

Phase 2 prompt SHALL 将 checkpoint state machine description 从连续段落重构为表格格式，并追加 hard rules 列表。

表格 SHALL 将每个 checkpoint state 映射到 trigger condition 和对应 git operation：

| 状态 | 触发条件 | Git 操作 |
|-------|---------|---------------|
| CREATED | 执行任何 optimization edits 之前 | `git stash push -u -m "verify-phase2-checkpoint"` |
| BASELINE_RESTORED_FOR_RETRY | reverify 失败后的 retry | `git stash apply <ref>`（保留 checkpoint） |
| TERMINAL_ACCEPTED | optimization 被接受 | `git stash drop <ref>`（消耗 checkpoint） |
| TERMINAL_RESTORED | rollback | `git stash pop <ref>`（恢复并消耗 checkpoint） |

Hard rules SHALL 以 bullet list 形式跟在表格之后。

#### Scenario: Agent 查找 checkpoint state trigger

- **WHEN** coordinator 需要确定 BASELINE_RESTORED_FOR_RETRY 状态对应的 git operation
- **THEN** 表格 SHALL 直接显示：触发条件 = `reverify 失败后的 retry`，Git 操作 = `git stash apply <ref>`
- **AND** SHALL 注明该操作保留而不是消耗 checkpoint

### Requirement: 语言一致性

verify 工作流中新增或修改的 prompt text SHALL 全部使用英文，与现有 template language 保持一致。

Mode label SHALL 使用英文格式 `[Mode: ...]`，例如 `[Mode: Evidence]`、`[Mode: Delegate Review]`。

Severity philosophy 表述 SHALL 从"prefer lower tier"改为"escalate when uncertain"，删除降级偏见的措辞。

#### Scenario: Mode label 使用英文

- **WHEN** verify prompt 被组装
- **THEN** 所有 mode label SHALL 以 `[Mode: <EnglishLabel>]` 形式出现
- **AND** SHALL NOT 使用 `[模式：证据]` 这类中文 mode label

#### Scenario: 删除"prefer lower tier"表述

- **WHEN** reviewer.ts 子代理 contract 被渲染
- **THEN** SHALL NOT 包含 "when uncertain, prefer SUGGESTION over WARNING and WARNING over CRITICAL" 表述
- **AND** SHALL 替换为 "when uncertain, escalate to CRITICAL to enforce the 'clean slate' principle"

