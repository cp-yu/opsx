## ADDED Requirements

### Requirement: Refresh restart SHALL preserve retained workspace audit history

当用户对已完成的 retained workspace 显式执行 restart 以开启新的 refresh run 时，系统 SHALL 在创建新工作目录前保留上一轮 workspace 作为审计历史。

#### Scenario: completed retained workspace is snapshotted before restart

- **GIVEN** 仓库 baseline 为 `formal-opsx`
- **AND** 当前 `openspec/bootstrap/` 是已完成 promote 的 retained workspace
- **WHEN** 用户执行 `openspec bootstrap init --mode refresh --restart`
- **THEN** 系统 SHALL 先将现有 workspace 移动到 OpenSpec 管理的显式历史目录
- **AND** SHALL 再创建新的 `openspec/bootstrap/` 作为下一轮 refresh run 的工作目录
- **AND** SHALL 在成功输出中提供历史快照路径与新 workspace 路径

#### Scenario: restart path handling remains cross-platform

- **WHEN** 系统为 retained workspace 计算历史快照路径并执行目录移动
- **THEN** 实现 SHALL 使用 `path.join()`、`path.resolve()` 或等价的 Node 路径 API
- **AND** SHALL NOT 依赖手写分隔符拼接
- **AND** SHALL 通过显式目录常量或显式文件列表追踪受管理产物，而不是通过模式匹配推断

### Requirement: Refresh restart SHALL carry forward only stable input state

restart 为下一轮 refresh run 初始化新 workspace 时，SHALL 仅继承对后续扫描和审查仍然有效的稳定输入状态，并重建所有派生产物。

#### Scenario: restart preserves previous anchor when available

- **GIVEN** 已完成 retained workspace 的 metadata 中存在 `refresh_anchor_commit`
- **WHEN** 用户执行 `openspec bootstrap init --mode refresh --restart`
- **THEN** 新 workspace metadata SHALL 继承该 anchor commit
- **AND** 新 run SHALL 从 `init` phase 重新开始
- **AND** SHALL 清空上一轮的 candidate/review fingerprint 与 approval 状态

#### Scenario: restart succeeds without a previous anchor

- **GIVEN** 已完成 retained workspace 来自没有记录 `refresh_anchor_commit` 的旧版本 bootstrap run
- **WHEN** 用户执行 `openspec bootstrap init --mode refresh --restart`
- **THEN** restart SHALL 仍然成功创建新的 refresh workspace
- **AND** 后续 refresh scan SHALL 回退到全量扫描，直到新的 promote 记录锚点

#### Scenario: restart reuses previous scope unless explicitly overridden

- **GIVEN** 已完成 retained workspace 包含上一轮 `scope.yaml`
- **WHEN** 用户执行 `openspec bootstrap init --mode refresh --restart` 且未传新的 `--scope`
- **THEN** 新 workspace SHALL 继承上一轮 scope 配置
- **AND** 用户显式传入的新 `--scope` SHALL 覆盖继承得到的 include 范围
