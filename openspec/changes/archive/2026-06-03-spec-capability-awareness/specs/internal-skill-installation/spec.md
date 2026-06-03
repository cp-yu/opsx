## MODIFIED Requirements

### Requirement: 内部 skill 模板注册
系统 SHALL 在 `src/core/shared/skill-generation.ts` 中提供 `INTERNAL_SKILL_TEMPLATES` 常量数组，包含仍被 workflow 引用的内部 skill 模板函数引用。该数组 SHALL include `openspec-reviewer` and `openspec-optimizer`, MAY include other active non-coding internal skills such as `openspec-impact-sweeper`, and SHALL NOT include `openspec-implementer`.

`getSkillTemplates()` SHALL 合并 workflow surface 技能和内部技能两个来源。`getCommandTemplates()` SHALL 仅使用 workflow surface，MUST NOT 包含内部技能。

内部 skill 模板的 `SkillTemplate.metadata` SHALL 包含 `type: 'subagent'` 标记 when the skill is used as a subagent.

#### Scenario: Impact sweeper skill 指令包含 spec frontmatter 扫描

- **WHEN** `openspec-impact-sweeper` skill 模板的 Evidence Protocol 被加载
- **THEN** 指令 SHALL 包含步骤要求扫描 `openspec/specs/*/spec.md` 的 YAML frontmatter
- **AND** SHALL 指示从 frontmatter 构建 cap→spec 映射
- **AND** SHALL 指示将受影响 cap 的关联 specs 写入报告的 `mustCheck` 字段

#### Scenario: Init 时安装 core preset 包含内部 skill
- **WHEN** 用户执行 `openspec init` 选择 core preset
- **AND** 目标 AI 工具具有 skillsDir（如 Claude Code、Codex、Pi）
- **THEN** 系统 SHALL 安装所有 core workflow skills + active internal skills
- **AND** 每个内部 skill SHALL 写入到 `path.join(projectPath, tool.skillsDir, 'skills', skillDirName, 'SKILL.md')`
- **AND** installed internal skill directory names SHALL NOT include `openspec-implementer`

#### Scenario: Update 时刷新内部 skill
- **WHEN** 用户执行 `openspec update`
- **THEN** 系统 SHALL 重新生成并写入 active internal skill files
- **AND** SHALL 覆盖已有 managed files
- **AND** SHALL NOT regenerate `openspec-implementer`

#### Scenario: 内部 skill 列表显式排除 implementer
- **WHEN** `getSkillTemplates()` builds the internal skill set
- **THEN** the explicit internal skill list SHALL NOT contain `openspec-implementer`
- **AND** the implementation SHALL NOT remove it through directory scanning, glob filtering, or regex matching
