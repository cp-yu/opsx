---
capabilities:
  - cap.ai.explore-brainstorming
---
# explore-brainstorming Specification

## Purpose
此规约记录变更 merge-superpowers-capabilities 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: Explore 必须执行 brainstorming checklist

Explore 阶段 SHALL 执行 6 步 brainstorming checklist，确保设计前置和需求澄清。

#### Scenario: 完整 brainstorming 流程

- **WHEN** 用户调用 `/opsx:explore <idea>`
- **THEN** 系统按顺序执行以下步骤：
  1. 探索项目上下文（读取相关文件、git 历史）
  2. 提供 visual companion（如果需要）
  3. 一次一问澄清需求
  4. 提出 2-3 个方案并对比权衡
  5. 分段呈现设计并逐段确认
  6. 生成 Design Summary

#### Scenario: 跳过 visual companion

- **WHEN** 用户的需求不涉及视觉内容（如后端 API、数据处理）
- **THEN** 系统跳过步骤 2，直接进入步骤 3

### Requirement: 一次一问的提问纪律

系统 SHALL 每次只问一个问题，等待用户回答后再继续。

#### Scenario: 单个问题等待

- **WHEN** 系统需要澄清多个方面（如技术栈、数据模型、API 设计）
- **THEN** 系统先问第一个问题，等待用户回答
- **THEN** 收到回答后，再问第二个问题

#### Scenario: 优先多选题

- **WHEN** 问题有明确的几个选项（如数据库选择：PostgreSQL / MySQL / SQLite）
- **THEN** 系统以多选题形式提问，而非开放式问题

### Requirement: 2-3 方案对比

系统 SHALL 提出 2-3 个不同的技术方案，并对比权衡。

#### Scenario: 方案对比呈现

- **WHEN** 系统理解了需求，准备提出技术方案
- **THEN** 系统提出 2-3 个方案
- **THEN** 每个方案包含：方案描述、优势、劣势、适用场景
- **THEN** 系统推荐其中一个方案并说明理由

#### Scenario: 用户选择方案

- **WHEN** 用户选择了某个方案或提出修改
- **THEN** 系统基于选定方案继续设计

### Requirement: 分段设计呈现

系统 SHALL 将设计分段呈现，每段后询问用户是否正确。

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

### Requirement: Design Summary 生成

系统 SHALL 在设计确认后生成结构化的 Design Summary。

#### Scenario: Design Summary 格式

- **WHEN** 所有设计段落都确认完成
- **THEN** 系统生成 Design Summary，包含以下部分：
  - 架构方案（选定的方案 + 理由）
  - 核心组件（组件列表 + 职责 + 接口）
  - 数据流（关键数据流描述）
  - 技术栈（具体技术选择）
  - 测试策略（单元测试 + 集成测试覆盖范围）
  - 风险和权衡（已知风险 + 缓解措施）

#### Scenario: Design Summary 存储

- **WHEN** Design Summary 生成完成
- **THEN** 系统将其存储在对话上下文中（不写入文件）
- **THEN** 系统提示用户："设计总结已完成。请审查上述设计。如果确认无误，请调用 `/opsx:propose <change-name>` 生成制品。"

### Requirement: 智能判断是否需要 explore

系统 SHALL 根据用户输入的详细程度判断是否需要 explore。

#### Scenario: 详细输入跳过 explore

- **WHEN** 用户输入包含以下至少 3 项：
  - 明确的技术栈/库
  - 数据模型/接口定义
  - API 端点或函数签名
  - 测试策略
  - 边界条件/错误处理
- **THEN** 系统判定为"详细输入"
- **THEN** 系统跳过 explore，直接进入 propose

#### Scenario: 简单输入强制 explore

- **WHEN** 用户输入 < 100 字且缺少技术细节
- **THEN** 系统判定为"简单输入"
- **THEN** 系统提示："输入过于简单，建议先运行 `/opsx:explore` 澄清需求和设计方案。"

#### Scenario: 多子系统强制 explore

- **WHEN** 用户输入包含 3 个以上并列功能（如"构建电商平台，包含用户管理、商品管理、订单管理、支付集成、库存管理"）
- **THEN** 系统判定为"多子系统"
- **THEN** 系统强制进入 explore，帮助用户拆解子系统

### Requirement: 范围检查和拆解建议

系统 SHALL 在 explore 阶段检查范围，如果过大则建议拆分。

#### Scenario: 范围过大提示

- **WHEN** 用户描述的需求涉及多个独立子系统
- **THEN** 系统在步骤 1（探索项目上下文）后立即提示："这个需求涉及多个独立子系统，建议拆分为多个变更。"
- **THEN** 系统帮助用户识别独立子系统
- **THEN** 系统建议实现顺序

#### Scenario: 拆分后继续

- **WHEN** 用户同意拆分并选择先实现某个子系统
- **THEN** 系统针对该子系统继续 brainstorming 流程
- **THEN** 其他子系统留待后续变更

### Requirement: Explore 捕获边界保持 specs 为可观察行为

Explore 在已有 change 上发现 insight 时 SHALL 先判断 insight 类型，并将其分类为 future capture target。只有可观察行为需求或可观察行为变化的 future capture target 才是 `specs/<capability>/spec.md`。Explore SHALL NOT 在当前 workflow 中更新这些制品。

#### Scenario: 可观察行为进入 specs

- **WHEN** explore 发现新的可观察行为需求或现有可观察行为变化
- **THEN** 系统 SHALL 将 future capture target 分类为 `specs/<capability>/spec.md`
- **AND** 分类文案 SHALL 表明这是 observable behavior，而不是泛化的 "new requirement"
- **AND** SHALL 将该分类纳入 conversation-only `Design Summary`

#### Scenario: 重构和实现决策进入 design

- **WHEN** explore 形成 refactor rationale、rejected path、implementation strategy 或不再使用旧路径的决策
- **THEN** 系统 SHALL 将 future capture target 分类为 `design.md`
- **AND** SHALL NOT 将这些非行为内容分类到 `specs/<capability>/spec.md`
- **AND** SHALL NOT 在 explore 中更新 `design.md`

#### Scenario: 其他 insight 路由到对应制品

- **WHEN** explore 发现 scope change、new work、verification work、OPSX graph intent change 或 invalidated assumption
- **THEN** scope change SHALL 分类到 `proposal.md`
- **AND** new work 或 verification work SHALL 分类到 `tasks.md`
- **AND** OPSX graph intent change SHALL 分类到 `opsx-delta.yaml`
- **AND** invalidated assumption SHALL 分类到相关制品
- **AND** 制品写入 SHALL 由 `$openspec-propose <change-name>` 或合适的非-explore workflow 执行

### Requirement: Explore 主代理保持只读

Explore main agent SHALL 保持只读。它 SHALL 检查文件、搜索代码、运行只读 OpenSpec 上下文命令、提问、比较方案、解释影响面报告，并生成只存在于对话中的 `Design Summary`；它 SHALL NOT 创建、编辑、删除、格式化、重新生成或 patch 项目文件和 OpenSpec 制品。

#### Scenario: Explore 不写入制品

- **WHEN** 用户调用 `openspec-explore`
- **AND** 对话已形成确定的设计方向
- **THEN** main explore agent SHALL 将结果保留在对话状态中
- **AND** SHALL 生成只存在于对话中的 `Design Summary`
- **AND** SHALL 在需要生成制品时指示用户调用 `$openspec-propose <change-name>`

#### Scenario: Impact sweeper 是 explore 唯一写例外

- **WHEN** explore 需要影响面发现
- **THEN** main explore agent SHALL spawn 一个子代理，并指示该子代理读取并执行 `openspec-impact-sweeper` skill
- **AND** SHALL NOT 将 `openspec-impact-sweeper` 作为 `subagent_type` 传给 Agent 工具，因其是 skill 而非注册 agent type
- **AND** 只有运行该 skill 的子代理 MAY 在 `openspec/sweeper/` 下写入 JSON report
- **AND** main explore agent SHALL 只读取并解释该 report

### Requirement: 设计确认不是写入授权

Explore SHALL 将用户选择方案、确认设计段落，或说出 "可以"、"就这样"、"选 2"、"拆成多个文件" 等表达，仅视为设计方向确认。

#### Scenario: 用户确认方案

- **WHEN** explore 呈现多个设计方案
- **AND** 用户选择一个方案或确认该段设计
- **THEN** main explore agent SHALL 基于该设计方向继续 explore flow
- **AND** SHALL NOT 将该确认视为修改文件或制品的授权

### Requirement: Explore 通过 referenceFiles 暴露 superpowers 行为引导

`openspec-explore` SHALL 通过 `referenceFiles` 暴示 superpowers 风格的行为引导手册，作为主 instructions 精简清单的展开版。reference 内容 SHALL 至少涵盖四个纯行为主题：对话姿态（The Stance）、动作空间（What You Might Do，含 ASCII 图表模板）、入口点行为示例（Handling Different Entry Points）、收束总结模板（What We Figured Out）。

reference 内容 SHALL 与只读边界、sweeper 委托、Design Summary 路由机制保持一致：不得包含暗示 explore 可直接创建或更新制品的措辞，所有制品生成 SHALL 路由到 `$openspec-propose <change-name>`。reference SHALL NOT 重复 sweeper 委托协议、brainstorming checklist 流程或 Future Capture Target 路由表（这些归主 instructions 与既有 requirement）。

reference 文件 SHALL 声明为 `references/explore-supperpowers-style.md` 并物化到 `openspec/references/openspec-explore-supperpowers-style.md`，满足 `skill-template-length-check` 的 ≤500 行限制。主 SKILL.md instructions SHALL 保留入口、只读边界、Impact Sweeps、Brainstorming Checklist，并指向该 reference。

#### Scenario: explore 声明 supperpowers-style reference

- **WHEN** `getExploreSkillTemplate()` 生成 explore skill
- **THEN** 返回对象 SHALL 包含 `referenceFiles` 数组
- **AND** 该数组 SHALL 包含一项 `{ path: 'references/explore-supperpowers-style.md', ... }`
- **AND** 该 reference 内容 SHALL 覆盖 The Stance、What You Might Do、Handling Different Entry Points、What We Figured Out 四个主题

#### Scenario: reference 内容路由到 propose 而非直接写入

- **WHEN** reference 内容涉及制品生成或更新
- **THEN** SHALL 使用"调用 `$openspec-propose <change-name>`"路由措辞
- **AND** SHALL NOT 包含"Want me to create a proposal"、"I can create a change proposal"、"Updated design.md" 等暗示 explore 直接写入制品的表述

#### Scenario: reference 不重复既有机制

- **WHEN** 生成 reference 内容
- **THEN** SHALL NOT 包含 sweeper 委托协议、brainstorming checklist 编号流程或 Future Capture Target 路由表
- **AND** SHALL 聚焦纯行为与可视化引导

#### Scenario: 主 instructions 保持精简并指向 reference

- **WHEN** 生成 explore 主 SKILL.md instructions
- **THEN** 主 instructions SHALL 保留只读边界、Impact Sweeps、Brainstorming Checklist
- **AND** SHALL 包含指向 `explore-supperpowers-style` reference 的引用
- **AND** 主 SKILL.md SHALL 满足 ≤200 行限制

