## MODIFIED Requirements

### Requirement: Slash Command Updates

`update` 命令 SHALL 为已配置工具刷新现有的 slash command 文件而不创建新文件，同时排除受支持 OpenSpec 表面为 skills-only 的工具。

#### Scenario: 更新 Antigravity 的斜杠命令
- **WHEN** `.agent/workflows/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 刷新每个文件中由 OpenSpec 管理的部分，使 workflow 文案与其他工具保持一致，同时保留现有仅含 `description` 的 frontmatter
- **AND** 在 update 期间跳过创建任何缺失的 workflow 文件，与 Windsurf 及其他 IDE 的行为保持一致

#### Scenario: 更新 Claude Code 的斜杠命令
- **WHEN** `.claude/commands/openspec/` 中存在 `proposal.md`、`apply.md` 和 `archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 CodeBuddy Code 的斜杠命令
- **WHEN** `.codebuddy/commands/openspec/` 中存在 `proposal.md`、`apply.md` 和 `archive.md`
- **THEN** 使用共享的 CodeBuddy 模板刷新每个文件，该模板包含 `description` 与 `argument-hint` 字段的 YAML frontmatter
- **AND** 对 `argument-hint` 参数使用方括号格式，例如 `[change-id]`
- **AND** 保留 OpenSpec managed markers 之外的所有用户自定义内容

#### Scenario: 更新 Cline 的斜杠命令
- **WHEN** `.clinerules/workflows/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 包含 Cline 特有的 Markdown heading frontmatter
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 Continue 的斜杠命令
- **WHEN** `.continue/prompts/` 中存在 `openspec-proposal.prompt`、`openspec-apply.prompt` 和 `openspec-archive.prompt`
- **THEN** 使用共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 Crush 的斜杠命令
- **WHEN** `.crush/commands/` 中存在 `openspec/proposal.md`、`openspec/apply.md` 和 `openspec/archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 包含带 OpenSpec category 和 tags 的 Crush 专用 frontmatter
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 Cursor 的斜杠命令
- **WHEN** `.cursor/commands/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 Factory Droid 的斜杠命令
- **WHEN** `.factory/commands/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用共享的 Factory 模板刷新每个文件，该模板包含 `description` 与 `argument-hint` 字段的 YAML frontmatter
- **AND** 确保模板正文保留 `$ARGUMENTS` 占位符，使用户输入继续传递给 droid
- **AND** 仅更新 OpenSpec managed markers 内的内容，不触碰未受管备注
- **AND** 在 update 期间跳过创建缺失文件

#### Scenario: 更新 OpenCode 的斜杠命令
- **WHEN** `.opencode/command/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令
- **AND** 确保 archive command 在 frontmatter 中包含 `$ARGUMENTS` 占位符，以接收 change ID 参数

#### Scenario: 更新 Windsurf 的斜杠命令
- **WHEN** `.windsurf/workflows/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用包裹在 OpenSpec markers 中的共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令
- **AND** 跳过创建缺失文件，因为 update 命令只刷新已经存在的文件

#### Scenario: 更新 Kilo Code 的斜杠命令
- **WHEN** `.kilocode/workflows/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用包裹在 OpenSpec markers 中的共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令
- **AND** 跳过创建缺失文件，因为 update 命令只刷新已经存在的文件

#### Scenario: 更新 Codex 时保持仅使用 skills
- **WHEN** 用户在配置为使用 Codex 的项目中运行 `openspec update`
- **THEN** 在 `.codex/skills/` 下存在受管 skills 时刷新它们
- **AND** SHALL NOT 刷新、创建或要求任何 Codex command 或 prompt 文件
- **AND** SHALL 将缺失的 Codex command 文件视为预期行为，而不是“跳过刷新”的条件

#### Scenario: 更新 GitHub Copilot 的斜杠命令
- **WHEN** `.github/prompts/` 中存在 `openspec-proposal.prompt.md`、`openspec-apply.prompt.md` 和 `openspec-archive.prompt.md`
- **THEN** 在保留 YAML frontmatter 的同时使用共享模板刷新每个文件
- **AND** 仅更新 markers 之间由 OpenSpec 管理的代码块
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 Gemini CLI 的斜杠命令
- **WHEN** `.gemini/commands/openspec/` 中存在 `proposal.toml`、`apply.toml` 和 `archive.toml`
- **THEN** 使用共享的 proposal/apply/archive 模板刷新每个文件的正文
- **AND** 仅替换 `prompt = """` 代码块内 `<!-- OPENSPEC:START -->` 与 `<!-- OPENSPEC:END -->` markers 之间的内容，以保持 TOML 外层结构如 `description`、`prompt` 不变
- **AND** 在 update 期间跳过创建缺失的 `.toml` 文件，只刷新原本就存在的 Gemini commands

#### Scenario: 更新 iFlow CLI 的斜杠命令
- **WHEN** `.iflow/commands/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 保留包含 `name`、`id`、`category`、`description` 字段的 YAML frontmatter
- **AND** 仅更新 markers 之间由 OpenSpec 管理的代码块
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 缺失斜杠命令文件
- **WHEN** 某个工具缺少 slash command 文件
- **THEN** 在 update 期间不创建新文件
