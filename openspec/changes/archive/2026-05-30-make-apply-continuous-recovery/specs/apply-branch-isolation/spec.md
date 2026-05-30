## MODIFIED Requirements

### Requirement: Apply 必须检测当前分支

Apply 阶段 SHALL 在开始实现前检测当前 git 分支，并 SHALL 使用 `openspec/config.yaml` 中的 `apply.defaultIsolation` 决定是否需要交互式选择。

#### Scenario: 检测当前分支

- **WHEN** 用户调用 `/opsx:apply`
- **THEN** 系统执行 `git branch --show-current` 获取当前分支名
- **THEN** 系统判断是否在 main 或 master 分支

#### Scenario: 在 main/master 分支且配置为 ask 时询问

- **WHEN** 当前分支是 main 或 master
- **AND** `apply.defaultIsolation` 为 `ask` 或未配置
- **THEN** 系统显示警告："建议在 feature 分支上工作。Apply 阶段会频繁 commit，直接在 main 分支工作可能污染历史。"
- **THEN** 系统询问用户选择隔离方式

#### Scenario: 在 main/master 分支且配置默认隔离方式时直接执行

- **WHEN** 当前分支是 main 或 master
- **AND** `apply.defaultIsolation` 为 `branch`、`worktree` 或 `none`
- **THEN** 系统 SHALL 不询问用户
- **AND** 系统 SHALL 直接执行配置指定的隔离方式
- **AND** 系统 SHALL 将结果写入 `.apply-isolation.json`

#### Scenario: 在 feature 分支时直接继续

- **WHEN** 当前分支不是 main 或 master
- **THEN** 系统显示信息："当前在分支 <branch-name>，继续实现。"
- **THEN** 系统直接进入实现阶段
