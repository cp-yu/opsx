## MODIFIED Requirements

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
