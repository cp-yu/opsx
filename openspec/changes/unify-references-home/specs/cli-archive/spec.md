# cli-archive Delta

## MODIFIED Requirements

### Requirement: Archive CLI 输出 git handoff 提醒

`openspec archive` 在完成 verify、sync 与 move-to-archive 后 SHALL 输出后续 git 工作由 agent 自动继续的责任归属提醒，不再读取或区分任何 handoff 模式配置。

#### Scenario: 归档完成后提醒 agent 接管

- **WHEN** `openspec archive <change>` 完成归档
- **THEN** CLI SHALL 输出归档已完成
- **AND** SHALL 提醒后续 git 提交流程由 agent 自动继续处理
- **AND** SHALL NOT 输出任何推荐 commit message
- **AND** SHALL NOT 读取 `git.autoCommit` 配置
