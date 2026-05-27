# openspec-reviewer-skill Specification (Delta)

## MODIFIED Requirements

### Requirement: Reviewer 输入合约
`openspec-reviewer` skill SHALL 定义顶层 agent MUST 传入的轻量定位信息：

| 字段 | 描述 | 必需 |
|---|---|---|
| changeName | change 名称，用于拼接路径 | 是 |
| changeDir | change 目录的绝对路径 | 是 |
| projectRoot | 项目根目录的绝对路径 | 是 |

Reviewer SHALL 自主完成以下信息获取：
- **changeArtifacts**: 从 `changeDir` 读取 proposal.md、specs/*/spec.md、design.md、tasks.md
- **gitEvidence**: 自行执行 `git status`、`git diff`、`git log -5 --oneline`
- **finalFileContents**: 从 `.verify-result.json` 的 `evidenceFiles` 列表或 git evidence 推断候选文件，自行读取
- **priorVerifyResult**: 自行读取 `changeDir/.verify-result.json`（如存在）
- **opsxContext**: 自行读取 `changeDir/opsx-delta.yaml` 和 `projectRoot/openspec/project.opsx.yaml`

如果 `changeName`、`changeDir` 或 `projectRoot` 缺失，reviewer MUST fail closed。

#### Scenario: 所有定位信息完整传入
- **WHEN** 顶层 agent 传入 changeName、changeDir 和 projectRoot
- **THEN** reviewer SHALL 自行读取所有必要文件并继续执行验证协议
- **AND** SHALL NOT 要求 master 传入文件内容

#### Scenario: 缺少定位信息
- **WHEN** changeDir 未传入或路径不存在
- **THEN** reviewer SHALL 返回 FAIL_NEEDS_REMEDIATION 和 CRITICAL issue "Missing required input: changeDir"
- **AND** SHALL 停止，不执行进一步验证

#### Scenario: 首次 verify 无 prior .verify-result.json
- **WHEN** `changeDir/.verify-result.json` 不存在
- **THEN** reviewer SHALL 从 git evidence（`git diff --name-only`）和 change artifacts 中的关键词推断候选实现文件
- **AND** SHALL 自行读取推断出的候选文件
- **AND** SHALL 将 priorVerifyResult 视为 null 继续验证

#### Scenario: 利用 .verify-result.json 作为导航 manifest
- **WHEN** `changeDir/.verify-result.json` 存在且包含 `verificationContext.evidenceFiles`
- **THEN** reviewer SHALL 读取 evidenceFiles 列表中的每个文件作为候选
- **AND** SHALL 结合 git evidence 补充列表中未覆盖的新增文件

### Requirement: Reviewer 角色与硬约束
`openspec-reviewer` skill SHALL 将 subagent 定义为 Phase 1 验证审查者，拥有所有 completeness、correctness、coherence 判定权，且 MUST 遵循以下硬约束：

- MUST NOT 引用或依赖任何实现对话历史——该历史不可用且非权威
- MUST 自主读取文件并基于读取内容做判断
- MUST 为每个判断引用具体文件路径和行范围
- MUST 在判定严重性级别前执行完整的 6 步验证循环
- MUST NOT 修改任何文件——输出为结构化评估而非补丁
- MUST NOT 通过 Bash 执行文件修改操作
- MAY 通过 Bash 执行测试命令和 git 只读命令

#### Scenario: Subagent invoke reviewer skill
- **WHEN** 顶层 agent spawn reviewer subagent 并 invoke `openspec-reviewer` skill
- **THEN** subagent SHALL 加载完整 skill 指令
- **AND** SHALL 使用 Read 和 Bash 工具自主获取验证所需信息
- **AND** SHALL 将其角色认定为拥有所有验证判定权的 clean-context 审查者

#### Scenario: Reviewer 拒绝基于记忆的判断
- **WHEN** reviewer 读取候选文件后某需求未找到实现证据
- **AND** reviewer 自己的训练数据中可能有相关知识
- **THEN** reviewer MUST NOT 基于训练数据推测实现存在
- **AND** SHALL 将缺失的证据报告为 CRITICAL（经彻底搜索后）或证据缺口
