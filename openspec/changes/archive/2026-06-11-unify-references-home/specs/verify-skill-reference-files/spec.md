# verify-skill-reference-files Delta

## MODIFIED Requirements

### Requirement: verify skill 包含 Phase 2 checkpoint reference

openspec-verify-change skill 的 SkillTemplate MUST 包含 `referenceFiles` 字段，其中包含完整的 Phase 2 checkpoint 协议文档。主 instructions MUST 明确引用该 reference 文档在 `openspec/references/` 下的受管路径。

#### Scenario: referenceFiles 包含 checkpoint 协议

- **WHEN** 调用 `getVerifyChangeSkillTemplate()`
- **THEN** 返回的 SkillTemplate MUST 包含 `referenceFiles` 数组
- **AND** 数组 MUST 包含一个 reference，其物化目标为 `openspec/references/openspec-phase2-checkpoint-protocol.md`
- **AND** reference 的 `content` MUST 包含完整的 checkpoint 状态机表格
- **AND** content MUST 包含字符串 `"git stash push -u -m \"verify-phase2-checkpoint\""`

#### Scenario: 主指令引用 checkpoint 协议

- **WHEN** 读取 verify skill 的 `instructions` 字段
- **THEN** instructions MUST 包含 "## Required References" 章节
- **AND** 该章节 MUST 列出 `openspec/references/openspec-phase2-checkpoint-protocol.md`
- **AND** Phase 2 相关步骤 MUST 提示按该 reference 文件执行 checkpoint protocol

### Requirement: 测试覆盖

skill template 测试 MUST 验证 verify skill 包含正确的 referenceFiles 和 checkpoint 协议内容。

#### Scenario: 快照测试捕获 referenceFiles 变化

- **WHEN** 运行 `test/core/templates/skill-templates-parity.test.ts`
- **THEN** 测试 MUST 包含 `getVerifyChangeSkillTemplate` 的哈希验证
- **AND** 任何 referenceFiles 内容变化 MUST 导致哈希不匹配
- **AND** 测试失败时 MUST 提示更新预期哈希值

#### Scenario: 生成的 reference 落盘到共享 references home

- **WHEN** 通过 workflow 安装管线生成 skill 文件
- **THEN** `.claude/skills/openspec-verify-change/` 目录 MUST 包含 `SKILL.md`
- **AND** MUST NOT 包含 `references/` 子目录
- **AND** `openspec/references/openspec-phase2-checkpoint-protocol.md` MUST 存在
- **AND** 该文件内容 MUST 与 `PHASE2_CHECKPOINT_PROTOCOL_REFERENCE` 常量一致
- **AND** `SKILL.md` MUST 引用 `openspec/references/openspec-phase2-checkpoint-protocol.md`
