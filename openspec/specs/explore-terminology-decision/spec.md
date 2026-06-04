# explore-terminology-decision Specification

## Purpose
此规约记录变更 sweeper-terminology-awareness 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 四态判断逻辑

Master agent SHALL 根据 `terminologyObservations` 执行四态判断，决定是否向用户提示术语不一致。

#### Scenario: 情况 1 - 用户输入与 specs 术语不匹配（必提）

- **WHEN** `terminologyObservations.foundInSpecs` 包含至少一个术语
- **AND** 用户输入 `userInput` 不等于任何 `foundInSpecs[].term`
- **THEN** master agent SHALL 向用户提问
- **AND** 问题格式 SHALL 为："你使用了'{userInput}'，相关 specs 中发现：\n  - '{term1}'（{count1} 处，见 {specs1}）\n  - '{term2}'（{count2} 处，见 {specs2}）\n是否指同一概念？"
- **AND** SHALL 最多列举每个术语的前 2 个 spec 名称

#### Scenario: 情况 2 - Specs 内部术语不一致（提示）

- **WHEN** `terminologyObservations.foundInSpecs.length > 1`
- **AND** 用户输入 `userInput` 等于其中某个 `foundInSpecs[].term`
- **THEN** master agent SHALL 向用户提问
- **AND** 问题格式 SHALL 为："检测到术语不一致：\n  - '{term1}'（{count1} 处）\n  - '{term2}'（{count2} 处）\n建议选择统一术语"

#### Scenario: 情况 3 - 完全一致（静默通过）

- **WHEN** `terminologyObservations.foundInSpecs.length === 1`
- **AND** `foundInSpecs[0].term === terminologyObservations.userInput`
- **THEN** master agent SHALL NOT 提问
- **AND** SHALL 继续正常 explore 流程

#### Scenario: 情况 4 - 未发现相关术语（静默通过）

- **WHEN** `terminologyObservations.foundInSpecs.length === 0`
- **THEN** master agent SHALL NOT 提问
- **AND** SHALL 将其视为新概念，不干扰 explore 流程

### Requirement: 字段缺失时的降级行为

当 `terminologyObservations` 字段缺失时，master agent SHALL 跳过术语一致性检查。

#### Scenario: 旧版本 sweeper 报告无术语字段

- **WHEN** sweeper JSON 报告不包含 `terminologyObservations` 字段
- **THEN** master agent SHALL 直接跳过四态判断逻辑
- **AND** SHALL 按现有流程处理 `affectedCapabilities`、`mustCheck`、`questions`

#### Scenario: 术语提取失败时的降级

- **WHEN** sweeper 因错误省略了 `terminologyObservations` 字段
- **THEN** master agent SHALL 将其视为"无术语观察结果"
- **AND** SHALL NOT 因字段缺失而报错或警告用户

### Requirement: 提问时机

术语一致性提问 SHALL 在 sweeper 报告生成后、用户回答影响面评估问题之前进行。

#### Scenario: 术语问题优先于影响面问题

- **WHEN** sweeper 报告包含 `terminologyObservations` 和 `questions` 两个字段
- **AND** 四态判断触发提问
- **THEN** master agent SHALL 先提出术语一致性问题
- **AND** 等待用户回答后，再提出 `questions` 中的影响面评估问题

#### Scenario: 术语问题与影响面问题分离

- **WHEN** 生成术语一致性提问
- **THEN** 该问题 SHALL 作为独立问题展示
- **AND** SHALL NOT 与 sweeper 报告中的 `questions` 数组混合

### Requirement: 提问格式规范

术语一致性提问 SHALL 使用清晰的中文格式，避免技术术语和 JSON 结构暴露给用户。

#### Scenario: 问题格式用户友好

- **WHEN** 向用户提出术语不一致问题
- **THEN** SHALL 使用自然语言格式
- **AND** SHALL NOT 包含 JSON 键名（如 `terminologyObservations`、`foundInSpecs`）
- **AND** SHALL NOT 暴露内部实现细节（如"sweeper subagent"、"四态判断"）

#### Scenario: Spec 名称显示策略

- **WHEN** 某个术语在超过 2 个 specs 中使用
- **THEN** SHALL 显示前 2 个 spec 名称
- **AND** SHALL 追加"等"字表示还有更多
- **AND** 示例："见 apply-change-workflow、cli-archive 等"

### Requirement: 用户回答处理

Master agent SHALL 接受用户的术语决策，不强制统一术语。

#### Scenario: 用户确认术语指同一概念

- **WHEN** 用户回答"是，指同一概念"
- **THEN** master agent SHALL 记录用户的决策
- **AND** MAY 在后续 propose 阶段使用该信息
- **AND** SHALL 继续 explore 流程

#### Scenario: 用户选择统一术语

- **WHEN** 用户回答"我将统一为'工作流'"
- **THEN** master agent SHALL 记录用户选择的规范术语
- **AND** MAY 在生成 specs 时优先使用该术语
- **AND** SHALL 继续 explore 流程

#### Scenario: 用户拒绝统一术语

- **WHEN** 用户回答"这些是不同概念，不需要统一"
- **THEN** master agent SHALL 接受用户判断
- **AND** SHALL 不再提示该组术语的不一致
- **AND** SHALL 继续 explore 流程

### Requirement: 中英文术语混用处理

当 specs 中混用中英文术语时，master agent SHALL 在提问中清晰区分不同语言的表达。

#### Scenario: 中英文术语并列显示

- **WHEN** `foundInSpecs` 包含"工作流"(中文) 和 "workflow"(英文)
- **THEN** 提问 SHALL 保持两种术语的原始形式
- **AND** SHALL 并列显示："'工作流'（15 处）和 'workflow'（8 处）"
- **AND** SHALL NOT 尝试翻译或合并两种表达

### Requirement: 长术语列表截断

当 `foundInSpecs` 包含超过 5 个术语时，master agent SHALL 截断列表，仅显示前 5 个。

#### Scenario: 超过 5 个术语时截断

- **WHEN** `foundInSpecs.length > 5`
- **THEN** 提问 SHALL 仅显示前 5 个术语（按 count 降序）
- **AND** SHALL 追加"等 {total} 种表达"
- **AND** 示例："检测到术语不一致：\n  - '工作流'（15 处）\n  - 'workflow'（8 处）\n  - '流程'（3 处）\n  - '工作流程'（2 处）\n  - 'process'（1 处）\n等 8 种表达"

