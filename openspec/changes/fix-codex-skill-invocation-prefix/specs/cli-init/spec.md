## MODIFIED Requirements

### Requirement: Success Output

该命令 SHALL 在初始化成功后提供清晰、可执行的下一步提示，并使用与实际生成 workflow surface 一致的调用语法。

#### Scenario: 为 command-backed surface 显示成功提示

- **WHEN** 初始化成功完成，且至少有一个被创建或刷新的工具暴露了 command-backed workflow surface
- **THEN** 显示分组摘要：
  - `"Created: <tools>"` 用于列出新配置的工具
  - `"Refreshed: <tools>"` 用于列出已存在但本次被刷新的工具
  - 生成的 skills 与 commands 数量
- **AND** 显示 getting started 区块，并使用与该工具 surface 匹配的 command 语法展示当前 workflow 入口，例如 `/opsx:propose "your idea"` 或 `/opsx:new "your idea"`
- **AND** 显示文档与反馈链接

#### Scenario: 为 Codex skills 显示成功提示

- **WHEN** 初始化成功完成，且所有被创建或刷新的 workflow surface 都是 Codex skills
- **THEN** 显示分组摘要：
  - `"Created: <tools>"` 用于列出新配置的工具
  - `"Refreshed: <tools>"` 用于列出已存在但本次被刷新的工具
  - 生成的 skills 数量
- **AND** 显示 getting started 区块，并对当前 workflow 入口使用精确的受管 Codex skill 调用形式，例如 `$openspec-propose "your idea"` 或 `$openspec-new-change "your idea"`
- **AND** 显示给用户的 Codex 调用名 SHALL 使用该 workflow 声明的精确 `skillDirName`
- **AND** SHALL NOT instruct the user to run `/opsx:*`
- **AND** 显示文档与反馈链接

#### Scenario: 为 command-backed surface 显示重启提示

- **WHEN** 初始化成功完成，且 command-backed workflow surface 被创建或刷新
- **THEN** 显示提示，要求用户重启 IDE 以使 slash commands 生效

#### Scenario: 为 skills-only surface 显示重启提示

- **WHEN** 初始化成功完成，且只有 skills-only workflow surface 被创建或刷新
- **THEN** 显示提示，要求用户重启 IDE 或当前会话以使刷新的 skills 生效
- **AND** SHALL NOT say slash commands are required
