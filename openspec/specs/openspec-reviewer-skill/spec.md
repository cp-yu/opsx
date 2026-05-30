# openspec-reviewer-skill Specification

## Purpose
此规约记录变更 add-subagent-skills 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
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

### Requirement: Reviewer 输入合约

`openspec-reviewer` skill SHALL 定义顶层 agent MUST 传入的轻量定位信息：

| 字段 | 描述 | 必需 |
|---|---|---|
| changeName | change 名称，用于拼接路径 | 是 |
| changeDir | change 目录的绝对路径 | 是 |
| projectRoot | 项目根目录的绝对路径 | 是 |

Reviewer SHALL 自主完成以下信息获取：
- **changeArtifacts**: 从 `changeDir` 读取 proposal.md、specs/*/spec.md、design.md、tasks.md
- **scopeFiles**: 通过 `git diff <originalBranch>...HEAD --name-only` 拿到 feature 分支整体变更文件列表，仅作为定位锚点；`originalBranch` 优先从 `path.join(changeDir, '.apply-isolation.json').originalBranch` 读取，缺失时回退到 `git symbolic-ref refs/remotes/origin/HEAD --short` 解析的远程默认分支
- **finalFileContents**: 对 scopeFiles、`.verify-result.json` 中的 `verificationContext.evidenceFiles` 与 OPSX `code-map` 推断的候选文件，SHALL 通过 Read 读取最终磁盘内容作为唯一权威证据
- **priorVerifyResult**: 自行读取 `changeDir/.verify-result.json`（如存在）
- **opsxContext**: 自行读取 `changeDir/opsx-delta.yaml` 和 `projectRoot/openspec/project.opsx.yaml`

Reviewer MUST NOT 把 `git diff` 的内容级输出（hunks、行变更）作为判断证据；diff 内容只反映过渡 commit 状态，最终态需要 Read 文件内容确认。

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
- **THEN** reviewer SHALL 通过 `git diff <originalBranch>...HEAD --name-only` 与 change artifacts 关键词推断候选实现文件
- **AND** SHALL Read 推断出的候选文件最终内容
- **AND** SHALL 将 priorVerifyResult 视为 null 继续验证

#### Scenario: 利用 .verify-result.json 作为导航 manifest

- **WHEN** `changeDir/.verify-result.json` 存在且包含 `verificationContext.evidenceFiles`
- **THEN** reviewer SHALL Read evidenceFiles 列表中的每个文件最终内容作为候选
- **AND** SHALL 结合 `git diff <originalBranch>...HEAD --name-only` 的结果补充列表中未覆盖的新增文件

#### Scenario: 不依赖 diff 内容判断行为

- **WHEN** reviewer 评估某 requirement 是否实现
- **THEN** SHALL 仅以 Read 到的最终文件内容作为证据
- **AND** SHALL NOT 引用 `git diff` hunk 或某次 commit 的局部变化作为判断依据

#### Scenario: originalBranch 不可解析时降级

- **WHEN** `.apply-isolation.json` 缺失且 `git symbolic-ref refs/remotes/origin/HEAD` 失败
- **THEN** reviewer SHALL 回退到 `git ls-files --modified --others --exclude-standard` 与 `evidenceFiles` 联合作为 scope
- **AND** SHALL 在 `gitDiffSummary` 中以 WARNING 形式注明 scope 推断退化

### Requirement: 6 步验证协议

`openspec-reviewer` skill SHALL 为每个 delta spec requirement 定义并强制执行 6 步客观验证循环：

1. **Locate** — 从 requirement 关键词与 `git diff <originalBranch>...HEAD --name-only` 输出识别候选文件
2. **Read** — 通过 Read 工具检查候选文件的最终磁盘内容，不依赖搜索结果或 diff 内容
3. **Analyze** — 将实现细节与 requirement 意图和所有 Scenario: 块进行比较
4. **Cite** — 记录具体文件路径和行范围作为证据
5. **Judge** — 基于证据强度分配 PASS、WARNING 或 CRITICAL
6. **Explain** — 对于非 PASS，准确说明缺失、偏离或不确定的内容

#### Scenario: 需求被实现证据清晰满足

- **WHEN** finalFileContents 中某文件清晰实现了 requirement 行为
- **AND** 所有关联 Scenario 条件均已覆盖
- **THEN** reviewer SHALL 分配 PASS
- **AND** SHALL 引用文件路径和行范围作为证据

#### Scenario: 搜索后未找到可信证据

- **WHEN** 经过对 scope 内候选文件的彻底 Read
- **AND** 未找到 requirement 行为的可信实现证据
- **THEN** reviewer SHALL 分配 CRITICAL
- **AND** SHALL 说明搜索过程和为何判定为缺失

### Requirement: 严重性阈值与证据标准
`openspec-reviewer` skill SHALL 定义以下严重性分类和证据标准：

| 严重性 | 触发条件 | 阻塞归档 | 触发写回 |
|---|---|---|---|
| CRITICAL | 行为缺失、直接矛盾、无可信证据 | 是 | 是 |
| WARNING | 实现可能存在但信心不足、场景覆盖不完整、制品/代码漂移 | 否 | 否 |
| SUGGESTION | 轻微模式或清晰度问题 | 否 | 否 |

- 仅当信心高到足以证明自动任务写回时才升级为 CRITICAL
- 在两级之间不确定时，优先选择较低级别（SUGGESTION 优于 WARNING，WARNING 优于 CRITICAL）

#### Scenario: 实现偏离但非矛盾
- **WHEN** 实现存在但可能偏离 requirement 意图
- **THEN** reviewer SHALL 分配 WARNING（非 CRITICAL）
- **AND** SHALL 解释差异并建议更新实现或更新 spec

#### Scenario: 实现存在于非 diff 文件中
- **WHEN** requirement 由已有代码（非当前 diff 中的文件）满足
- **AND** 最终文件内容确认了此行为
- **THEN** reviewer SHALL 分配 PASS 并引用最终文件证据
- **AND** SHALL 在 gitDiffSummary 中注明由已有代码覆盖

### Requirement: 三个验证维度
`openspec-reviewer` skill SHALL 覆盖三个验证维度及可选的 OPSX 对齐检查：

**Completeness（完整性）**: 检查 tasks.md 复选框和 spec requirement 实现证据。每项未完成任务 = CRITICAL，每个未实现 requirement = CRITICAL。

**Correctness（正确性）**: Requirement 到实现映射 + Scenario 覆盖。偏离 = WARNING，覆盖不完整 = WARNING。

**Coherence（一致性）**: Design.md 决策遵守情况 + 代码模式一致性。决策违背 = WARNING，模式偏离 = SUGGESTION。

**OPSX Alignment（OPSX 对齐）**（如 opsx-delta.yaml 存在）: 引用完整性和 code-map 完整性。不对齐 = WARNING。

#### Scenario: 仅有 tasks.md 的变更
- **WHEN** 变更仅有 tasks.md 无 delta specs 无 design.md
- **THEN** reviewer SHALL 仅验证任务完成度
- **AND** SHALL 跳过正确性、一致性和 OPSX 检查并注明

#### Scenario: 完整制品的变更
- **WHEN** 变更包含所有制品（proposal、specs、design、tasks）
- **THEN** reviewer SHALL 验证所有三个维度 + OPSX 对齐

### Requirement: 结构化输出合约
`openspec-reviewer` skill SHALL 定义 reviewer MUST 返回的精确 JSON 输出 schema，包含以下字段：result（PASS/PASS_WITH_WARNINGS/FAIL_NEEDS_REMEDIATION）、issues（严重性+需求+任务+摘要+建议+证据引用）、summary（完整性/正确性/一致性评分）、writeBackPlan（仅 CRITICAL 时存在）、evidenceFiles、gitDiffSummary。

`writeBackPlan` 条目 MUST 包含 taskLine、action（unmark/append_remediation）、remediationType（code_fix/artifact_fix）、requirement、summary 和 nextAction。

#### Scenario: Reviewer 产出完整评估
- **WHEN** reviewer 完成验证
- **THEN** SHALL 返回符合定义 schema 的单个结构化 JSON 对象
- **AND** SHALL NOT 包含散文式前言或对话性填充

#### Scenario: 无 CRITICAL issue 时 writeBackPlan 为空
- **WHEN** 评估中所有 issue 严重性 ≤ WARNING
- **THEN** writeBackPlan SHALL 为空数组
- **AND** result SHALL 为 PASS 或 PASS_WITH_WARNINGS

### Requirement: 跨工具 skill 路径兼容
`openspec-reviewer` skill 文件 SHALL 通过 `path.join()` 构建安装路径，确保在 Windows、macOS 和 Linux 上的正确性。Skill 指令中引用的文件路径 SHALL 使用相对 POSIX 路径（正斜杠）。

#### Scenario: Windows 上安装 reviewer skill
- **WHEN** 在 Windows 上为 Claude Code 执行 `openspec init`
- **THEN** skill 文件 SHALL 写入到 `.claude/skills/openspec-reviewer/SKILL.md`（路径使用 `path.join()` 构建）

