## MODIFIED Requirements

### Requirement: AI Tool Configuration

该命令 SHALL 通过可搜索的多选交互为 AI 编码助手配置 skills 与 slash commands，同时尊重仅支持 skills 的工具。

#### Scenario: 提示选择 AI 工具

- **WHEN** 以交互模式运行
- **THEN** 显示带有 OpenSpec logo 的动画欢迎界面
- **AND** 提供展示所有可用工具的可搜索多选列表
- **AND** 用 `(configured ✓)` 标记已经配置过的工具
- **AND** 默认选中已配置工具，便于刷新
- **AND** 将已配置工具排序到列表前部
- **AND** 允许用户通过输入内容进行筛选搜索

#### Scenario: 选择要配置的工具

- **WHEN** 用户选择工具并确认
- **THEN** 为每个声明了 `skillsDir` 的已选工具在 `.<tool>/skills/` 目录下生成 skills
- **AND** 仅为仍支持 adapter-backed command generation 的已选工具生成 slash commands
- **AND** SHALL NOT 生成任何 Codex command 或 prompt 文件
- **AND** SHALL 将 Codex skills 视为 Codex 唯一生成的 workflow 承载面
- **AND** 使用默认 schema 设置创建 `openspec/config.yaml`

### Requirement: Slash Command Generation SHALL derive bootstrap artifacts from explicit command slug mapping

该命令 SHALL 基于显式的 workflow-to-command-slug 映射为所选 AI 工具生成 opsx slash command 文件，但仅适用于支持 adapter-backed command 制品的工具。

#### Scenario: 为 command-backed 工具生成斜杠命令

- **WHEN** 某个已选工具支持 adapter-backed command generation
- **THEN** 使用该工具的 command adapter 为当前 profile 包含的所有 workflow 创建 slash command 文件
- **AND** 当选择 `bootstrap-opsx` workflow 时，生成的命令集合 SHALL 包含 `/opsx:bootstrap`
- **AND** command 制品路径 SHALL 从显式 workflow-to-command-slug 映射推导，而不是假设 workflow ID 等于文件 basename
- **AND** 使用工具特定的路径约定，例如 Claude 的 `.claude/commands/opsx/`
- **AND** 包含工具特定的 frontmatter 格式

#### Scenario: Codex 使用 skills 而不是斜杠命令文件

- **WHEN** 在初始化过程中选择了 Codex
- **THEN** 系统 SHALL 在 `.codex/skills/` 下生成 workflow skills
- **AND** 系统 SHALL NOT 在项目内或全局 Codex prompt 目录下创建任何 command 制品
- **AND** 最终的 Codex workflow surface SHALL 仅由受管 skills 表示

#### Scenario: Bootstrap 命令路径具备跨平台安全性

- **WHEN** 在任意受支持操作系统上生成 bootstrap command 制品
- **THEN** 路径 SHALL 使用跨平台安全的路径工具构造
- **AND** 路径敏感的验证 SHALL 使用具备路径感知能力的断言，而不是硬编码分隔符

#### Scenario: Core 模式排除独立 sync 命令

- **WHEN** 初始化时选择了 command-backed 工具
- **AND** 当前 mode 为 `core`
- **THEN** 生成的 slash commands SHALL 仅包含 core preset 中的 workflows
- **AND** 生成的命令集合 SHALL NOT 包含 `/opsx:sync`

#### Scenario: Expanded 模式包含独立 sync 命令

- **WHEN** 初始化时选择了 command-backed 工具
- **AND** 当前 mode 为 `expanded`
- **THEN** 生成的 slash commands SHALL 包含 expanded workflow 集合
- **AND** 生成的命令集合 SHALL 包含 `/opsx:sync`

#### Scenario: Init 模式选择以确定性方式驱动 workflow 输出

- **WHEN** 初始化以显式 mode 选择运行
- **THEN** 最终生成的 workflow surface SHALL 与所选 mode 精确匹配
- **AND** 对同一组已选工具重复以相同 mode 初始化时，生成的制品集合 SHALL 收敛为相同结果
