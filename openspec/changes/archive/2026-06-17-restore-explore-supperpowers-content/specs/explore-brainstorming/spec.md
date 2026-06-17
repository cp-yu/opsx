## ADDED Requirements

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
