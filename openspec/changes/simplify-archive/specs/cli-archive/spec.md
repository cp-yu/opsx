## ADDED Requirements

### Requirement: Sync Gate

archive 命令 SHALL 在归档前检查 change 是否存在未合并的 delta（spec + OPSX），并在存在时阻止归档。sync 检查与 verify gate 正交，`--no-sync` flag 可跳过。

#### Scenario: 存在未合并 delta 时阻止归档

- **WHEN** change 包含尚未通过 `openspec sync` 合并到 main spec 的 delta
- **AND** 未使用 `--no-sync`
- **THEN** archive 命令 SHALL 输出错误消息指明 pending delta
- **AND** SHALL 提示用户执行 `openspec sync <change-name>` 后重试
- **AND** SHALL 终止归档操作

#### Scenario: delta 已全部合并时通过检查

- **WHEN** change 的所有 delta（spec + OPSX）已通过 `openspec sync` 合并到 main spec
- **AND** 未使用 `--no-sync`
- **THEN** sync gate SHALL 通过
- **AND** archive 命令 SHALL 继续后续步骤

#### Scenario: --no-sync 跳过 sync gate

- **WHEN** 执行 `openspec archive <change> --no-sync`
- **AND** 非 `--yes` 模式
- **THEN** CLI SHALL 显示警告确认提示，说明跳过 sync 检查的风险
- **AND** 用户确认后 SHALL 跳过 sync 检查
- **AND** 继续归档

#### Scenario: --yes --no-sync 静默跳过

- **WHEN** 执行 `openspec archive <change> --no-sync --yes`
- **THEN** CLI SHALL 静默跳过 sync 检查
- **AND** 直接继续归档

#### Scenario: 仅含 removal delta 且目标 header 已不存在

- **WHEN** change delta 仅包含 REMOVED 操作
- **AND** 对应 main spec 中所有被移除的 header 已不存在
- **THEN** sync gate SHALL 将该项 delta 视为已同步
- **AND** SHALL NOT 阻止归档

## MODIFIED Requirements

### Requirement: Archive Process

archive 操作 SHALL 在校验通过后将 change 目录移动到 archive 目录，并输出 git handoff 提醒。archive 不执行任何 spec 或 OPSX 写入操作。同步合并由 `openspec sync` 独立完成。

#### Scenario: 直接归档

- **WHEN** 所有 gate 通过（verify、sync、validation、task）
- **AND** change 目录存在
- **THEN** 命令 SHALL 将 change 目录移动到 archive 目录
- **AND** 目录名 SHALL 使用 `YYYY-MM-DD-<change-name>` 格式
- **AND** SHALL 输出 git handoff 提醒
- **AND** SHALL NOT 修改 main spec 文件
- **AND** SHALL NOT 修改 OPSX 主文件
- **AND** SHALL NOT 执行 `git add`、`git commit`、`git checkout`、`git merge` 或 `git branch`

#### Scenario: 已归档 change 检测

- **WHEN** 目标 archive 路径已存在
- **AND** change 目录已不在活动目录
- **THEN** 命令 SHALL 输出 git handoff 提醒后退出

#### Scenario: 归档失败不回写

- **WHEN** archive gate 校验失败
- **THEN** 命令 SHALL 终止归档
- **AND** 不执行任何文件修改
- **AND** change 目录保持原样

### Requirement: Display Output

archive 命令 SHALL 提供清晰的 gate 状态反馈。

#### Scenario: 显示 gate 状态

- **WHEN** 执行 archive
- **THEN** 依次显示每个 gate 的通过/跳过/失败状态
- **AND** 显示 task 完成状态
- **AND** 归档完成后显示最终确认消息和 git handoff 提醒

## REMOVED Requirements

### Requirement: Spec Update Process

**Reason**: archive 不再执行 spec 写入，同步合并职责已完全移交给 `openspec sync`

**Migration**: 在调用 archive 前执行 `openspec sync <change-name>` 合并 delta

### Requirement: Skip Specs Option

**Reason**: `--skip-specs` flag 控制的 archive-time sync 写入路径已删除，替换为独立的 `--no-sync` gate flag

**Migration**: 使用 `--no-sync` 跳过 sync gate 检查

### Requirement: Archive-time sync SHALL use runtime projection

**Reason**: archive 不再执行同步写入，runtime projection 相关的 sync 行为由 `openspec sync` 独立管理

**Migration**: 无

### Requirement: Confirmation Behavior

**Reason**: archive 不再显示 spec 更新确认，该确认逻辑属于 `openspec sync`

**Migration**: 无

### Requirement: Non-blocking confirmation

**Reason**: archive 不再执行 spec 更新，无需 spec 更新确认

**Migration**: 无
