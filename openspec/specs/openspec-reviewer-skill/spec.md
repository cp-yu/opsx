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
| CRITICAL | 行为缺失、直接矛盾、无可信证据，OR 重构/迁移遗留物（孤儿代码、过时标记、未完成迁移） | 是 | 是 |
| WARNING | 实现存在但 reviewer 缺乏验证工具，OR drift 是装饰性且不影响行为，OR 设计决策偏离已在代码注释中说明 | 否 | 否 |
| SUGGESTION | 纯风格问题（命名、格式化、注释清晰度），轻微模式偏离且不影响可维护性 | 否 | 否 |

**Severity assignment philosophy:**

- **默认立场：严格。** 当声称的工作证据薄弱或缺失时，升级到 CRITICAL。举证责任在于证明完整性，而非证明不完整性。
- **升级到 CRITICAL 的条件：**
  - 任务标记完成但实现证据薄弱/缺失
  - Requirement 存在但实现不确定
  - 代码与 spec 矛盾（而非仅装饰性差异）
  - Scenario 覆盖不完整
  - 重构/迁移留下遗留物（孤儿代码、死 import、过时 TODO、半迁移）
- **降级到 WARNING 的条件：**
  - 实现可能存在但 reviewer 缺乏验证工具（如运行时行为、外部 API 集成）
  - Spec/代码 drift 是装饰性的（变量名、注释措辞）且不影响可观测行为
  - 设计决策偏离在代码注释中显式说明了理由
- **降级到 SUGGESTION 的条件：**
  - 问题纯属风格（命名约定、格式化偏好）
  - 模式偏离轻微且不影响可维护性
- **不确定时如何决策：** 升级到 CRITICAL。误报（block 非问题）可以通过 artifact 修正或用户显式覆盖解决。漏报（让问题溜过）违反"clean slate"原则并累积技术债。

#### Scenario: 实现与 spec 矛盾

- **WHEN** 实现逻辑与 spec 明确矛盾（如 spec 要求失败 3 次锁定，代码检查 2 次）
- **THEN** reviewer SHALL 分配 CRITICAL（非 WARNING）
- **AND** recommendation SHALL 提供两条路径："对齐代码与 spec" 或 "更新 spec 如果实现是故意的"

#### Scenario: 装饰性 drift 降级为 WARNING

- **WHEN** spec 说 "validate input"，代码函数名是 checkInput
- **AND** 行为逻辑完全一致
- **THEN** reviewer SHALL 分配 WARNING（而非 CRITICAL）
- **AND** SHALL 在 summary 中注明这是装饰性差异

#### Scenario: 实现存在于非 diff 文件中
- **WHEN** requirement 由已有代码（非当前 diff 中的文件）满足
- **AND** 最终文件内容确认了此行为
- **THEN** reviewer SHALL 分配 PASS 并引用最终文件证据
- **AND** SHALL 在 gitDiffSummary 中注明由已有代码覆盖

### Requirement: 三个验证维度
`openspec-reviewer` skill SHALL 覆盖四个验证维度及可选的 OPSX 对齐检查，并按 Check 的锚点类型分派判定模式：`Verifies`（普通 requirement）执行存在性判定，`Verifies ... REMOVED Requirement` 执行缺失性判定，`Preserves` 执行等价性判定。

**Completeness（完整性）**: 检查 tasks.md 复选框和 spec requirement 实现证据。每项未完成任务 = CRITICAL，每个未实现 requirement = CRITICAL。`Files` 中 `Delete:` 声明的文件 SHALL 与 `git diff <originalBranch>...HEAD` 逐项核对，声明已删除但文件仍存在 = CRITICAL。

**Correctness（正确性）**: Requirement 到实现映射 + Scenario 覆盖。直接矛盾或证据不足 = CRITICAL，装饰性 drift = WARNING（需明确判断）。Scenario 未覆盖 = CRITICAL。缺失性判定（REMOVED 锚点）：reviewer SHALL 自主搜索符号、文件与 import 路径并引用搜索证据，发现任何残留引用 = CRITICAL。等价性判定（Preserves 锚点）SHALL 双支：行为不变（测试证据）∧ 旧形态消失（缺失断言），新旧实现并存 = CRITICAL。

**Coherence（一致性）**: Design.md 决策遵守情况 + 代码模式一致性。决策违背 = CRITICAL（降级条件：代码注释显式说明理由），模式偏离 = SUGGESTION。

**Cleanliness（清洁性）**: 检测本次变更应清理但未清理的遗留物，以及 diff 中无法归因到任何 task 的规格外改动。孤儿代码 = CRITICAL，过时 TODO = CRITICAL，死 import = CRITICAL，半迁移 = CRITICAL，不可达代码 = WARNING，规格外行为代码 = CRITICAL。

**OPSX Alignment（OPSX 对齐）**（如 opsx-delta.yaml 存在）: 引用完整性和 code-map 完整性。不对齐 = WARNING。

#### Scenario: 仅有 tasks.md 的变更
- **WHEN** 变更仅有 tasks.md 无 delta specs 无 design.md
- **THEN** reviewer SHALL 仅验证任务完成度
- **AND** SHALL 跳过正确性、一致性、清洁性和 OPSX 检查并注明

#### Scenario: 完整制品的变更
- **WHEN** 变更包含所有制品（proposal、specs、design、tasks）
- **THEN** reviewer SHALL 验证所有四个维度 + OPSX 对齐

#### Scenario: Correctness 维度升级 scenario 未覆盖为 CRITICAL

- **WHEN** delta spec 中某 requirement 包含 Scenario 块
- **AND** 代码或测试中未找到该 Scenario 条件的处理证据
- **THEN** reviewer SHALL 判定为 CRITICAL "Scenario not covered"
- **AND** recommendation SHALL 要求添加测试和实现

#### Scenario: Coherence 维度升级设计违背为 CRITICAL

- **WHEN** design.md 说"用 Redis 缓存"
- **AND** 代码使用了 Map
- **AND** 代码中无注释说明理由
- **THEN** reviewer SHALL 判定为 CRITICAL "Design decision violated"
- **AND** recommendation SHALL 要求对齐设计或更新 design.md

#### Scenario: 缺失性判定要求多角度搜索后引用证据

- **WHEN** 某 Check 锚定 `Verifies: ... REMOVED Requirement "<name>"`
- **THEN** reviewer SHALL 对该交付物执行缺失性判定：搜索符号名、文件路径与 import 引用
- **AND** 判定 PASS 时 SHALL 引用搜索命令与空结果作为证据
- **AND** 发现任何残留引用时 SHALL 判定为 CRITICAL 并引用残留位置

#### Scenario: 等价性判定不接受仅测试证据

- **WHEN** 某 Check 锚定 `Preserves:` 且关联测试全部通过
- **AND** 该 Check `Expect:` 点名的旧形态在最终代码中仍然存在
- **THEN** reviewer SHALL 判定为 CRITICAL（新旧实现并存即半迁移）
- **AND** SHALL NOT 仅凭测试通过判定该 Check 完成

#### Scenario: Delete 声明与 git diff 逐项核对

- **WHEN** 某 task 的 `Files` 包含 `Delete:` 条目
- **AND** 该 task 的 Check 已勾选
- **THEN** reviewer SHALL 在 `git diff <originalBranch>...HEAD` 中确认该文件已删除
- **AND** 文件仍存在时 SHALL 判定为 CRITICAL 并将该 Check 列入 writeBackPlan

### Requirement: 结构化输出合约
`openspec-reviewer` skill SHALL 定义 reviewer MUST 返回的精确 JSON 输出 schema，包含以下字段：result（PASS/PASS_WITH_WARNINGS/FAIL_NEEDS_REMEDIATION）、issues（严重性+需求+任务+摘要+建议+证据引用）、summary（完整性/正确性/一致性/清洁性评分）、writeBackPlan（仅 CRITICAL 时存在）、evidenceFiles、gitDiffSummary。

summary 对象 SHALL 包含四个维度对象：completeness、correctness、coherence、cleanliness，cleanliness 结构为：
```json
"cleanliness": {
  "checked": true,
  "orphanedCodeFound": 0,
  "deadImportsFound": 0,
  "staleTodosFound": 0,
  "halfMigrationsFound": 0,
  "unaccountedChangesFound": 0
}
```

`writeBackPlan` 条目 MUST 包含 taskLine、action（unmark/append_remediation）、remediationType（code_fix/artifact_fix）、requirement、summary 和 nextAction。规格外改动发现没有所属 checkbox，其条目的 taskLine SHALL 为 `null` 且 action SHALL 为 `append_remediation`；其余发现的 taskLine SHALL 保持精确 checkbox 文本。

#### Scenario: Reviewer 产出完整评估
- **WHEN** reviewer 完成验证
- **THEN** SHALL 返回符合定义 schema 的单个结构化 JSON 对象
- **AND** SHALL NOT 包含散文式前言或对话性填充

#### Scenario: 无 CRITICAL issue 时 writeBackPlan 为空
- **WHEN** 评估中所有 issue 严重性 ≤ WARNING
- **THEN** writeBackPlan SHALL 为空数组
- **AND** result SHALL 为 PASS 或 PASS_WITH_WARNINGS

#### Scenario: summary 包含 cleanliness 字段

- **WHEN** reviewer 输出 summary 对象
- **THEN** SHALL 在 coherence 之后包含 cleanliness 对象
- **AND** cleanliness.checked SHALL 为 true（如果执行了检查）
- **AND** 各计数器字段 SHALL 反映检测到的问题数量

#### Scenario: 规格外发现的 writeBackPlan 条目

- **WHEN** reviewer 将某个规格外改动判定为 CRITICAL
- **THEN** 对应 writeBackPlan 条目的 taskLine SHALL 为 `null`
- **AND** action SHALL 为 `append_remediation`
- **AND** remediationType SHALL 为 `artifact_fix`（改动合理、补任务呈现）或 `code_fix`（改动不应存在、revert）

### Requirement: 跨工具 skill 路径兼容
`openspec-reviewer` skill 文件 SHALL 通过 `path.join()` 构建安装路径，确保在 Windows、macOS 和 Linux 上的正确性。Skill 指令中引用的文件路径 SHALL 使用相对 POSIX 路径（正斜杠）。

#### Scenario: Windows 上安装 reviewer skill
- **WHEN** 在 Windows 上为 Claude Code 执行 `openspec init`
- **THEN** skill 文件 SHALL 写入到 `.claude/skills/openspec-reviewer/SKILL.md`（路径使用 `path.join()` 构建）

