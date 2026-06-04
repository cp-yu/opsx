# sweeper-terminology-reporting Specification

## Purpose
此规约记录变更 sweeper-terminology-awareness 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: terminologyObservations 字段结构

Sweeper JSON 报告 SHALL 包含可选的 `terminologyObservations` 字段，结构包含 `userInput` 和 `foundInSpecs` 两个子字段。

#### Scenario: 字段结构符合 TypeScript 接口定义

- **WHEN** sweeper 生成包含术语观察结果的 JSON 报告
- **THEN** `terminologyObservations` 字段 SHALL 符合以下结构：
  ```typescript
  terminologyObservations?: {
    userInput: string;
    foundInSpecs: Array<{
      term: string;
      specs: string[];
      count: number;
    }>;
  }
  ```
- **AND** `userInput` SHALL 包含用户原始输入的 concept
- **AND** `foundInSpecs` 数组 SHALL 按 `count` 降序排列

#### Scenario: 未发现相关术语时字段为空数组

- **WHEN** sweeper 在所有 `mustCheck` specs 中未提取到与 concept 语义相近的术语
- **THEN** `terminologyObservations.foundInSpecs` SHALL 为空数组 `[]`
- **AND** `terminologyObservations.userInput` SHALL 仍然包含用户输入

### Requirement: 向后兼容性保证

`terminologyObservations` 字段 MUST 为可选字段，旧版本 master agent 忽略该字段时不影响现有功能。

#### Scenario: 旧版本 master agent 忽略新字段

- **WHEN** 新版本 sweeper 生成包含 `terminologyObservations` 的 JSON 报告
- **AND** master agent 为旧版本（不处理该字段）
- **THEN** master agent SHALL 正常解析 `affectedCapabilities`、`mustCheck`、`questions` 等现有字段
- **AND** SHALL 不因新字段存在而报错或异常

#### Scenario: 新版本 master agent 兼容旧 sweeper 报告

- **WHEN** 旧版本 sweeper 生成不含 `terminologyObservations` 的 JSON 报告
- **AND** master agent 为新版本（期望处理该字段）
- **THEN** master agent SHALL 将缺失字段视为"无术语观察结果"
- **AND** SHALL 跳过术语一致性判断逻辑
- **AND** SHALL 继续正常的 explore 流程

### Requirement: foundInSpecs 数组排序规则

`foundInSpecs` 数组 SHALL 按术语出现次数降序排列，帮助 master agent 识别主流用法。

#### Scenario: 按 count 降序排列术语

- **WHEN** sweeper 提取到 3 个术语："工作流"(15次)、"workflow"(8次)、"流程"(3次)
- **THEN** `foundInSpecs` 数组顺序 SHALL 为：
  1. `{term: "工作流", count: 15, specs: [...]}`
  2. `{term: "workflow", count: 8, specs: [...]}`
  3. `{term: "流程", count: 3, specs: [...]}`

### Requirement: specs 数组去重与排序

每个 `foundInSpecs` 条目中的 `specs` 数组 SHALL 去重并按字母顺序排列。

#### Scenario: Spec 名称去重

- **WHEN** 术语"工作流"在 spec A 中出现 5 次、在 spec B 中出现 10 次
- **THEN** `specs` 数组 SHALL 为 `["spec-a", "spec-b"]`（每个 spec 仅出现一次）
- **AND** SHALL 按字母顺序排列

#### Scenario: Spec 名称使用 kebab-case

- **WHEN** spec 文件路径包含驼峰命名或大写字母
- **THEN** `specs` 数组中的名称 SHALL 使用 kebab-case 标识符
- **AND** SHALL 与 `openspec list --specs --json` 返回的名称格式一致

### Requirement: 字段省略规则

当术语提取步骤未执行或失败时，sweeper SHALL 完全省略 `terminologyObservations` 字段，而非返回 `null` 或空对象。

#### Scenario: 提取失败时省略整个字段

- **WHEN** 术语提取过程遇到错误
- **THEN** 生成的 JSON 报告 SHALL NOT 包含 `terminologyObservations` 键
- **AND** JSON 解析器 SHALL 将其视为 undefined

#### Scenario: 与空数组的区别

- **WHEN** 术语提取成功但未发现相关术语
- **THEN** 报告 SHALL 包含 `terminologyObservations: {userInput: "...", foundInSpecs: []}`
- **AND** 当提取失败时，报告 SHALL 完全不包含 `terminologyObservations` 字段

### Requirement: JSON Schema 扩展文档

TypeScript 接口定义 SHALL 包含 JSDoc 注释，说明字段用途和示例。

#### Scenario: JSDoc 注释完整性

- **WHEN** 在代码库中定义 sweeper 报告的 TypeScript 接口
- **THEN** `terminologyObservations` 字段 SHALL 包含 JSDoc 注释
- **AND** 注释 SHALL 说明："术语观察结果，用于检测用户输入与 specs 中术语的一致性"
- **AND** SHALL 包含示例 JSON 结构

