## MODIFIED Requirements

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

`openspec-reviewer` skill SHALL 覆盖四个验证维度及可选的 OPSX 对齐检查：

**Completeness（完整性）**: 检查 tasks.md 复选框和 spec requirement 实现证据。每项未完成任务 = CRITICAL，每个未实现 requirement = CRITICAL。

**Correctness（正确性）**: Requirement 到实现映射 + Scenario 覆盖。直接矛盾或证据不足 = CRITICAL，装饰性 drift = WARNING（需明确判断）。Scenario 未覆盖 = CRITICAL。

**Coherence（一致性）**: Design.md 决策遵守情况 + 代码模式一致性。决策违背 = CRITICAL（降级条件：代码注释显式说明理由），模式偏离 = SUGGESTION。

**Cleanliness（清洁性）**: 检测本次变更应清理但未清理的遗留物。孤儿代码 = CRITICAL，过时 TODO = CRITICAL，死 import = CRITICAL，半迁移 = CRITICAL，不可达代码 = WARNING。

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

### Requirement: 结构化输出合约

`openspec-reviewer` skill SHALL 定义 reviewer MUST 返回的精确 JSON 输出 schema，包含以下字段：result（PASS/PASS_WITH_WARNINGS/FAIL_NEEDS_REMEDIATION）、issues（严重性+需求+任务+摘要+建议+证据引用）、summary（完整性/正确性/一致性/清洁性评分）、writeBackPlan（仅 CRITICAL 时存在）、evidenceFiles、gitDiffSummary。

summary 对象 SHALL 包含四个维度对象：completeness、correctness、coherence、cleanliness，cleanliness 结构为：
```json
"cleanliness": {
  "checked": true,
  "orphanedCodeFound": 0,
  "deadImportsFound": 0,
  "staleTodosFound": 0,
  "halfMigrationsFound": 0
}
```

`writeBackPlan` 条目 MUST 包含 taskLine、action（unmark/append_remediation）、remediationType（code_fix/artifact_fix）、requirement、summary 和 nextAction。

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
