---
capabilities:
  - cap.ai.explore-brainstorming
---

## MODIFIED Requirements

### Requirement: Explore 通过 referenceFiles 暴露 superpowers 行为引导

`openspec-explore` SHALL 通过 `referenceFiles` 暴露 Superpowers 风格的行为引导手册，作为主 instructions 的权威行为展开版。reference 内容 SHALL 以原始 Superpowers `brainstorming` skill 的设计前置纪律为行为来源，并适配 OpenSpec explore 的只读边界和 `openspec-propose` 路由。

reference 内容 SHALL 覆盖：实现前 hard gate、项目上下文探索、just-in-time visual companion 判断、一次一问、2-3 方案对比、分段设计确认、conversation-only `Design Summary`、Design Summary 自检、用户审查 gate、以及进入 `openspec-propose` 的交接。reference 内容 SHALL 将 Superpowers 的写 design doc、commit、user review、writing-plans 交接语义映射到 OpenSpec 的 conversation-only `Design Summary` 和 `openspec-propose` workflow，不得暗示 explore 可直接创建或更新制品。

reference 内容 SHALL 与只读边界、sweeper 委托、Design Summary 路由机制保持一致：不得包含暗示 explore 可直接创建或更新制品的措辞，所有制品生成 SHALL 以工具中立的 `openspec-propose` workflow 名称表达路由。reference SHALL NOT 包含 `/opsx:` 或 `$openspec-` 等工具特定调用语法；reference SHALL NOT 重复 sweeper 委托协议或 Future Capture Target 路由表（这些归主 instructions 与既有 requirement）。reference MAY 概述 brainstorming checklist，但 MUST NOT 复制主 instructions 的 OPSX/sweeper 机制内容。

reference 文件 SHALL 声明为 `references/explore-supperpowers-style.md` 并物化到 `openspec/references/openspec-explore-supperpowers-style.md`，满足 `skill-template-length-check` 的 ≤500 行限制。主 SKILL.md instructions SHALL 保留入口、只读边界、Impact Sweeps、Brainstorming Checklist，并通过 Required References 指向该物化 reference；主 instructions SHALL NOT 重新构建 Superpowers 行为内容。

#### Scenario: explore 声明 supperpowers-style reference

- **WHEN** `getExploreSkillTemplate()` 生成 explore skill
- **THEN** 返回对象 SHALL 包含 `referenceFiles` 数组
- **AND** 该数组 SHALL 包含一项 `{ path: 'references/explore-supperpowers-style.md', ... }`
- **AND** 该 reference 内容 SHALL 覆盖 Superpowers hard gate、context exploration、just-in-time visual companion、one-question discipline、2-3 approaches、section-by-section design approval、Design Summary self-review、user review gate、openspec-propose handoff

#### Scenario: reference 内容路由到 propose 而非直接写入

- **WHEN** reference 内容涉及制品生成或更新
- **THEN** SHALL 使用 `openspec-propose` 逻辑 workflow 名称路由
- **AND** SHALL NOT 包含"Want me to create a proposal"、"I can create a change proposal"、"Updated design.md"、"write design doc"、"commit the design document"、"invoke writing-plans" 等暗示 explore 直接写入制品或进入实现计划的表述

#### Scenario: reference 保留 Superpowers 设计前置纪律

- **WHEN** agent 读取 `openspec/references/openspec-explore-supperpowers-style.md`
- **THEN** reference SHALL 明确在设计确认完成前不得实现
- **AND** SHALL 明确简单变更仍需要设计确认，但设计可以按复杂度缩短
- **AND** SHALL 明确用户审查通过 `Design Summary` 后才能路由到 `openspec-propose`

#### Scenario: reference 不重复主 instructions 机制

- **WHEN** 生成 reference 内容
- **THEN** SHALL NOT 包含 sweeper 委托协议或 Future Capture Target 路由表
- **AND** SHALL 聚焦 Superpowers brainstorming 行为纪律及其 OpenSpec 适配

#### Scenario: 主 instructions 保持精简并指向 reference

- **WHEN** 生成 explore 主 SKILL.md instructions
- **THEN** 主 instructions SHALL 保留只读边界、Impact Sweeps、Brainstorming Checklist
- **AND** SHALL 包含指向 `openspec/references/openspec-explore-supperpowers-style.md` 的 Required References 引用
- **AND** SHALL 将该 reference 声明为 Superpowers 行为引导的权威来源，不在主 instructions 中重新构建该行为内容
- **AND** 主 SKILL.md SHALL 满足 ≤200 行限制
