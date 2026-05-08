## ADDED Requirements

### Requirement: 内部 skill 模板注册
系统 SHALL 在 `src/core/shared/skill-generation.ts` 中提供 `INTERNAL_SKILL_TEMPLATES` 常量数组，包含 `openspec-reviewer` 和 `openspec-optimizer` 两个模板函数引用，独立于 `WorkflowManifestRegistry`。

`getSkillTemplates()` SHALL 合并 workflow surface 技能和内部技能两个来源。`getCommandTemplates()` SHALL 仅使用 workflow surface，MUST NOT 包含内部技能。

内部 skill 模板的 `SkillTemplate.metadata` SHALL 包含 `type: 'subagent'` 标记。

#### Scenario: Init 时安装 core preset 包含内部 skill
- **WHEN** 用户执行 `openspec init` 选择 core preset
- **AND** 目标 AI 工具具有 skillsDir（如 Claude Code、Codex、Pi）
- **THEN** 系统 SHALL 安装所有 core workflow skills + `openspec-reviewer` + `openspec-optimizer`
- **AND** 每个内部 skill SHALL 写入到 `{skillsDir}/skills/{skillDirName}/SKILL.md`

#### Scenario: Update 时刷新内部 skill
- **WHEN** 用户执行 `openspec update`
- **THEN** 系统 SHALL 重新生成并写入两个内部 skill 文件
- **AND** SHALL 覆盖已有文件（作为 managed 文件）

### Requirement: 内部 skill 不产 slash command
内部 skill 条目 SHALL NOT 注册到 `WorkflowManifestRegistry`。命令生成管线（`getCommandTemplates()` 和 `getCommandContents()`）SHALL 跳过内部 skill 条目。

`WorkflowManifestEntry` 的 `getCommandTemplate` 字段 SHALL 改为 optional（`getCommandTemplate?: () => CommandTemplate`），以支持将来的 skill-only workflow 条目。

#### Scenario: 列出 commands 不包含内部 skill
- **WHEN** 系统生成全部可用 command 列表
- **THEN** 列表 SHALL NOT 包含 `openspec-reviewer` 或 `openspec-optimizer`
- **AND** 这些 skill 不存在对应的斜杠命令

#### Scenario: Skill-only workflow entry 不阻断 command 生成
- **WHEN** manifest 中存在 `getCommandTemplate` 为 undefined 的 entry
- **THEN** command 生成管线 SHALL 跳过该 entry
- **AND** SHALL NOT 抛出异常

### Requirement: 安装路径使用 path.join() 构建
内部 skill 文件路径 SHALL 使用 `path.join()` 构建：
```
path.join(projectPath, tool.skillsDir, 'skills', skillDirName, 'SKILL.md')
```

Skill 目录名 SHALL 定义为显式常量（如 `'openspec-reviewer'`、`'openspec-optimizer'`），MUST NOT 通过字符串模式匹配或正则表达式推断。

#### Scenario: 路径构建跨平台一致
- **WHEN** 在 Windows 上构建 skill 路径
- **AND** tool.skillsDir 为 `.claude`，skillDirName 为 `openspec-reviewer`
- **THEN** 结果 SHALL 为 `.claude\\skills\\openspec-reviewer\\SKILL.md`（Windows 反斜杠）
- **AND** SHALL 使用 `path.join()` 而非硬编码正斜杠

### Requirement: 内部 skill 使用现有 SkillTemplate 接口
内部 skill SHALL 使用与 workflow skill 相同的 `SkillTemplate` 接口和 `generateSkillContent()` 函数生成 YAML frontmatter + Markdown body。不做类型层面的特殊处理。

#### Scenario: 生成与 workflow skill 格式一致的 SKILL.md
- **WHEN** 系统生成 `openspec-reviewer` skill 文件内容
- **THEN** 文件 SHALL 以 YAML frontmatter 开头（name、description、license、compatibility、metadata）
- **AND** 后接 Markdown body（角色、硬约束、输入合约...）
- **AND** 格式 SHALL 与 workflow skill 文件完全一致