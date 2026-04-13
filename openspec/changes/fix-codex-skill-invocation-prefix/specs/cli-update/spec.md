## ADDED Requirements

### Requirement: 工具感知的更新提示
`openspec update` SHALL 使用已刷新 workflow surface 的实际调用语法来展示 onboarding 与 restart guidance。

#### Scenario: 刷新 Codex skills 时显示精确的 skill 调用名
- **WHEN** `openspec update` 刷新或新配置了受管的 Codex workflow skills
- **THEN** 所有 getting-started 或 onboarding guidance SHALL 使用精确的受管 Codex skill 调用名，例如 `$openspec-propose`、`$openspec-new-change`、`$openspec-continue-change` 与 `$openspec-apply-change`
- **AND** 显示给用户的 Codex 引用 SHALL 使用 workflow 的 `skillDirName`，而不是 command slug
- **AND** SHALL NOT tell the user to run `/opsx:*`

#### Scenario: skills-only 重启提示避免 slash-command 文案
- **WHEN** `openspec update` 完成时仅刷新了 skills-only workflow surface
- **THEN** 所有 restart guidance SHALL 描述为刷新的 skills 或 workflow files 生效
- **AND** SHALL NOT mention slash commands taking effect

#### Scenario: command-backed onboarding 保持 command 语法
- **WHEN** `openspec update` 为 command-backed workflow surface 输出 onboarding guidance
- **THEN** 这些 guidance SHALL 对被引用的 workflow 入口继续使用该工具原本的 command 语法
