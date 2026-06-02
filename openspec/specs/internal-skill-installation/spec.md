# internal-skill-installation Specification

## Purpose
此规约记录变更 add-subagent-skills 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 内部 skill 模板注册
系统 SHALL 在 `src/core/shared/skill-generation.ts` 中提供 `INTERNAL_SKILL_TEMPLATES` 常量数组，包含仍被 workflow 引用的内部 skill 模板函数引用。该数组 SHALL include `openspec-reviewer` and `openspec-optimizer`, MAY include other active non-coding internal skills such as `openspec-impact-sweeper`, and SHALL NOT include `openspec-implementer`.

`getSkillTemplates()` SHALL 合并 workflow surface 技能和内部技能两个来源。`getCommandTemplates()` SHALL 仅使用 workflow surface，MUST NOT 包含内部技能。

内部 skill 模板的 `SkillTemplate.metadata` SHALL 包含 `type: 'subagent'` 标记 when the skill is used as a subagent.

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

### Requirement: Managed generated surfaces remove stale implementer residue

系统 SHALL 在 managed skill generation 和 update 路径中移除 active tool surfaces 中由旧版本生成的 stale `openspec-implementer` skill files。删除 SHALL 使用明确的 managed internal skill directory name list，而不是目录扫描、glob filtering 或 regex inference。

#### Scenario: Update removes stale implementer skill by explicit name

- **WHEN** 用户执行 `openspec update`
- **AND** 目标 AI 工具具有 managed skills directory
- **AND** 该 directory 包含旧版本生成的 `openspec-implementer`
- **THEN** 系统 SHALL 通过显式 stale skill directory name 删除该 managed directory
- **AND** 系统 SHALL NOT 删除 reviewer、optimizer、impact-sweeper 或用户自定义 skill directories

#### Scenario: Init does not install stale implementer skill

- **WHEN** 用户执行 `openspec init`
- **AND** 目标 AI 工具具有 skillsDir
- **THEN** 系统 SHALL install active workflow skills and active internal skills only
- **AND** installed internal skill directory names SHALL NOT include `openspec-implementer`

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
