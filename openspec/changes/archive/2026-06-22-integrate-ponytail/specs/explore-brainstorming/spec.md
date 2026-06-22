## MODIFIED Requirements

### Requirement: 2-3 方案对比

系统 SHALL 提出 2-3 个不同的技术方案，并对比权衡。系统 SHALL 融入 ponytail-lite 意识：在方案对比时，若 ponytail 6-rung ladder 判断某方案可进一步精简，用一行指出替代方案。

#### Scenario: 方案对比呈现

- **WHEN** 系统理解了需求，准备提出技术方案
- **THEN** 系统提出 2-3 个方案
- **THEN** 每个方案包含：方案描述、优势、劣势、适用场景
- **THEN** 系统推荐其中一个方案并说明理由

#### Scenario: 用户选择方案

- **WHEN** 用户选择了某个方案或提出修改
- **THEN** 系统基于选定方案继续设计

#### Scenario: 方案对比时加入 ponytail 视角

- **WHEN** 系统呈现 2-3 个技术方案，且 ponytail ladder 判断某方案存在不必要的抽象、新依赖或已有平台能力可覆盖的实现
- **THEN** 系统 SHALL 用一行指出 ponytailladder 建议（如：「ponytail 说：这个抽象现在不需要，直接调 stdlib 够用。要换成这个吗？」）
- **AND** 系统 SHALL 等待用户确认后才调整方案
- **AND** 若无 ponytailladder 可简化项，系统 SHALL 自然跳过

### Requirement: 分段设计呈现

系统 SHALL 将设计分段呈现，每段后询问用户是否正确。系统 SHALL 在单方案讨论中发现过度规格化时，用一行指出 ponytailladder 简化方式。

#### Scenario: 逐段确认

- **WHEN** 系统准备呈现完整设计
- **THEN** 系统先呈现架构方案，询问"这个方向对吗？"
- **THEN** 用户确认后，呈现核心组件，询问"组件划分合理吗？"
- **THEN** 用户确认后，呈现数据流，询问"数据流清晰吗？"
- **THEN** 依次呈现技术栈、测试策略、风险和权衡

#### Scenario: 用户要求修改

- **WHEN** 用户在某一段提出修改意见
- **THEN** 系统修改该段内容
- **THEN** 重新呈现修改后的内容，等待确认
- **THEN** 确认后继续下一段

#### Scenario: 单方案中发现过度规格化

- **WHEN** 系统在讨论单个设计决策（如数据模型、API 设计、组件层次），且 ponytailladder 发现该设计引入了不必要的抽象、新依赖或已有平台能力可覆盖的实现
- **THEN** 系统 SHALL 用一行指出简化方式
- **AND** 系统在 ponytailladder 无特别发现时自然跳过，不强制输出
