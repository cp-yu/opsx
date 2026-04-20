## ADDED Requirements

### Requirement: bootstrap init SHALL require explicit restart intent for retained workspaces

`openspec bootstrap init` SHALL keep normal initialization and retained-workspace restart as separate user intents. A retained workspace SHALL NOT be overwritten, moved, or reset unless the user passes an explicit restart option.

#### Scenario: init rejects retained workspace without restart

- **GIVEN** `openspec/bootstrap/` 已存在
- **WHEN** 用户执行 `openspec bootstrap init --mode refresh` 且未传 `--restart`
- **THEN** 命令 SHALL fail fast
- **AND** 错误信息 SHALL 说明当前 retained workspace 已存在
- **AND** 若 workspace 已完成，错误信息 SHALL 指向 `openspec bootstrap init --mode refresh --restart`
- **AND** SHALL NOT 把删除 `openspec/bootstrap/` 作为默认修复路径

#### Scenario: init restart starts a new run from completed workspace

- **GIVEN** `openspec/bootstrap/` 已存在
- **AND** workspace lifecycle state 表明上一轮 promote 已完成
- **WHEN** 用户执行 `openspec bootstrap init --mode refresh --restart`
- **THEN** 命令 SHALL 创建下一轮 refresh workspace
- **AND** 成功输出 SHALL 明确这是 restart，而不是 resume
- **AND** 成功输出 SHALL 包含旧 workspace 的历史快照路径

#### Scenario: init restart refuses in-progress workspace

- **GIVEN** `openspec/bootstrap/` 已存在
- **AND** workspace lifecycle state 表明当前 run 尚未完成
- **WHEN** 用户执行 `openspec bootstrap init --mode refresh --restart`
- **THEN** 命令 SHALL fail fast
- **AND** 错误信息 SHALL 指向 `openspec bootstrap status` 或当前 phase instructions
- **AND** SHALL NOT 自动移动或覆盖 in-progress workspace
