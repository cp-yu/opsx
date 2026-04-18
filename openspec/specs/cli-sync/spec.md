# Spec: cli-sync

## Purpose

`openspec sync` 命令将 change 中的 delta specs 和 OPSX delta 同步到主 specs 和 OPSX 文件，不执行归档。

## Command Syntax

```bash
openspec sync [change-name] [--no-validate]
```

选项：
- `change-name`：可选，指定 change 名称
- `--no-validate`：跳过同步后验证（不推荐）
## Requirements
### Requirement: Change 选择

`openspec sync` SHALL 同时支持交互式和直接指定两种 change 选择方式。

#### Scenario: 直接指定 change 名称
- **GIVEN** 用户执行 `openspec sync my-change`
- **WHEN** `openspec/changes/my-change/` 存在
- **THEN** 对该 change 执行同步

#### Scenario: 交互式选择
- **GIVEN** 用户执行 `openspec sync`（无参数）
- **AND** 当前存在多个活跃 change
- **THEN** 列出所有活跃 change 供用户选择
- **AND** 排除 `archive/` 目录

#### Scenario: 无活跃 change
- **GIVEN** 用户执行 `openspec sync`
- **AND** 不存在任何活跃 change
- **THEN** 输出提示信息并退出

#### Scenario: 指定的 change 不存在
- **GIVEN** 用户执行 `openspec sync nonexistent`
- **WHEN** `openspec/changes/nonexistent/` 不存在
- **THEN** 报错并退出

### Requirement: 同步执行

`openspec sync` SHALL 复用 `change-sync` 契约执行同步。

#### Scenario: 存在 delta specs 和 OPSX delta
- **GIVEN** change 目录中存在 `specs/` 下的 delta spec 文件
- **AND** 存在 `opsx-delta.yaml`
- **WHEN** 执行 sync
- **THEN** 将 delta specs 合并到 `openspec/specs/` 下对应的主 spec
- **AND** 将 OPSX delta 合并到三个 OPSX 文件
- **AND** 输出同步摘要

#### Scenario: 仅存在 delta specs
- **GIVEN** change 目录中存在 delta spec 文件
- **AND** 不存在 `opsx-delta.yaml`
- **WHEN** 执行 sync
- **THEN** 仅同步 delta specs
- **AND** 输出 `opsx: no-delta`

#### Scenario: 仅存在 OPSX delta
- **GIVEN** change 目录中不存在 delta spec 文件
- **AND** 存在 `opsx-delta.yaml`
- **WHEN** 执行 sync
- **THEN** 仅同步 OPSX delta
- **AND** 输出 `specs: no-delta`

#### Scenario: 无需同步
- **GIVEN** change 目录中既无 delta specs 也无 `opsx-delta.yaml`
- **WHEN** 执行 sync
- **THEN** 输出 `No sync required.` 并成功退出（exit code 0）

### Requirement: 不触发归档

`openspec sync` SHALL NOT 触发归档或移动 change 目录。

#### Scenario: 同步后 change 目录保持不变
- **WHEN** sync 成功完成
- **THEN** change 目录不被移动或删除
- **AND** change 目录内容不被修改（delta 文件保留）

### Requirement: 幂等性

`openspec sync` SHALL 保持幂等性，重复执行不得引入额外差异。

#### Scenario: 重复执行产生相同结果
- **GIVEN** 已对某 change 执行过一次 sync
- **WHEN** 再次对同一 change 执行 sync
- **THEN** 主 specs 和 OPSX 文件内容与首次同步后完全一致

### Requirement: Sync-created specs SHALL use runtime projection
When `openspec sync` creates or rebuilds formal specs, the command SHALL consume runtime projection so newly written prose follows config-driven policy instead of hardcoded English boilerplate.

#### Scenario: New formal spec uses projected prose policy
- **WHEN** sync creates a formal spec that does not yet exist
- **THEN** the command SHALL use runtime projection for any generated prose content
- **AND** SHALL preserve canonical headers, requirement markers, scenario markers, and normative keywords

#### Scenario: Existing formal spec update does not inject unrelated boilerplate
- **WHEN** sync updates an existing formal spec through delta reconciliation
- **THEN** the command SHALL limit generated prose to the sync contract
- **AND** SHALL NOT inject unrelated hardcoded English guidance into unaffected sections

