# sweeper-terminology-extraction Specification

## Purpose
此规约记录变更 sweeper-terminology-awareness 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 术语提取触发条件

Impact-sweeper subagent SHALL 在读取 `mustCheck` specs 时自动执行术语提取步骤，无需额外配置或命令行参数。

#### Scenario: Explore 调用 sweeper 时自动提取术语

- **WHEN** master agent 调用 impact-sweeper 并传入用户的 `concept` 输入
- **AND** sweeper 通过 `openspec list --specs --json` 确定 `mustCheck` specs 列表
- **THEN** sweeper SHALL 在读取每个 spec 文件时执行术语提取
- **AND** SHALL 将提取结果汇总到 `terminologyObservations` 字段

### Requirement: 语义相近术语识别

Sweeper SHALL 仅提取与用户输入 `concept` 语义相近的术语，而非全量扫描所有名词。

#### Scenario: 用户输入"流程"时提取相关术语

- **WHEN** 用户 concept 为"流程管理"
- **AND** spec 文件中包含"工作流"、"workflow"、"工作流程"、"拓扑排序"、"制品"等术语
- **THEN** sweeper SHALL 提取"工作流"、"workflow"、"工作流程"（与"流程"语义相近）
- **AND** SHALL NOT 提取"拓扑排序"、"制品"（语义不相近）

#### Scenario: 中英文术语均需识别

- **WHEN** spec 文件中混用中文术语和英文术语
- **AND** 用户 concept 为中文"变更管理"
- **THEN** sweeper SHALL 识别中文"变更"和英文"change"为语义相近
- **AND** SHALL 在 `foundInSpecs` 中分别记录两种表达

### Requirement: 术语统计与分布追踪

Sweeper SHALL 统计每个术语的出现次数，并记录使用该术语的 spec 名称列表。

#### Scenario: 统计术语出现次数

- **WHEN** sweeper 在 3 个 spec 文件中提取到术语
- **AND** "工作流"在 spec A 出现 5 次、spec B 出现 10 次
- **AND** "workflow"在 spec C 出现 8 次
- **THEN** `foundInSpecs` SHALL 包含 `{term: "工作流", count: 15, specs: ["spec-a", "spec-b"]}`
- **AND** SHALL 包含 `{term: "workflow", count: 8, specs: ["spec-c"]}`

#### Scenario: Spec 名称使用 kebab-case 标识符

- **WHEN** spec 文件路径为 `openspec/specs/apply-change-workflow/spec.md`
- **THEN** 在 `terminologyObservations.foundInSpecs[].specs` 中 SHALL 记录为 `"apply-change-workflow"`
- **AND** SHALL NOT 包含路径前缀或文件扩展名

### Requirement: 复合术语处理

Sweeper SHALL 将复合术语（如"工作流程"）视为独立术语，同时识别其组成部分（"工作流"、"流程"）的语义关联。

#### Scenario: 复合术语与组成部分同时识别

- **WHEN** 用户 concept 为"流程"
- **AND** spec 文件包含"工作流程"一词
- **THEN** sweeper SHALL 将"工作流程"提取为独立术语
- **AND** SHALL 识别"工作流程"与用户输入"流程"语义相近
- **AND** SHALL 记录在 `foundInSpecs` 中

### Requirement: Prompt 指令规范

Sweeper skill prompt SHALL 包含明确的术语提取指令，定义提取策略、示例和输出格式。

#### Scenario: Prompt 包含术语提取步骤

- **WHEN** 生成 `openspec-impact-sweeper` skill 文件
- **THEN** prompt SHALL 包含 "Terminology Awareness" 章节
- **AND** SHALL 包含提取策略说明："Identify terms semantically related to user's `concept` input"
- **AND** SHALL 包含示例："if concept is '流程', extract '工作流', 'workflow', '工作流程' etc."
- **AND** SHALL 明确输出格式："Record in `terminologyObservations` field"

#### Scenario: Prompt 强调事实陈述而非判断

- **WHEN** prompt 定义术语提取行为
- **THEN** SHALL 包含："Report facts only, no judgment or recommendations"
- **AND** SHALL NOT 指示 subagent 判断术语是否"正确"或"应该统一"

### Requirement: 术语提取失败时的降级行为

当术语提取过程遇到错误时，sweeper SHALL 降级为不包含 `terminologyObservations` 的报告，而非整体失败。

#### Scenario: 术语提取失败不阻塞报告生成

- **WHEN** sweeper 在术语提取过程中遇到 LLM 错误或超时
- **THEN** sweeper SHALL 生成不含 `terminologyObservations` 字段的 JSON 报告
- **AND** SHALL 包含正常的 `affectedCapabilities`、`mustCheck`、`questions` 字段
- **AND** master agent SHALL 将缺失该字段视为"无术语观察结果"，继续正常流程

