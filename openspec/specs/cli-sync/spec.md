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

在同步执行之前，系统 SHALL 检查 verify gate（通过 `checkFreshness` 和 `checkArchiveCompatibility`），除非用户传入 `--no-verify`。

同步完成后，`applyPreparedChangeSync` SHALL 自动刷新 `.verify-result.json` 中与 sync 输出重叠的 evidence 文件哈希，使 verify 结果不因合法的 sync 写入而失效。

#### Scenario: verify gate 失败输出可操作指引

- **GIVEN** 用户执行 `openspec sync my-change`
- **AND** `.verify-result.json` 存在但 freshness 为 STALE
- **WHEN** verify gate 检查失败
- **THEN** 错误输出 SHALL 包含变更文件列表
- **AND** 包含建议重新 verify 的命令
- **AND** 包含 `--no-verify` 跳过选项
- **AND** exit code 非 0

#### Scenario: verify gate 通过后执行同步

- **GIVEN** 用户执行 `openspec sync my-change`
- **AND** freshness 为 FRESH 且 archiveCompatibility 为 compatible
- **WHEN** verify gate 检查通过
- **THEN** 继续执行同步流程
- **AND** 输出同步摘要

#### Scenario: --no-verify 跳过 verify gate

- **GIVEN** 用户执行 `openspec sync my-change --no-verify`
- **AND** freshness 为 STALE
- **WHEN** 命令执行
- **THEN** 跳过 verify gate 直接进入同步
- **AND** 不输出 `formatVerifyGateFailure` 结果

#### Scenario: 同步后 evidence fingerprint 自动刷新

- **GIVEN** 用户执行 `openspec sync my-change`
- **AND** sync 前 `.verify-result.json` 为 FRESH
- **AND** evidence 中包含 `openspec/project.opsx.yaml`
- **AND** sync 写入了 OPSX delta
- **WHEN** sync 完成
- **THEN** `.verify-result.json` 中 `openspec/project.opsx.yaml` 的 hash SHALL 被更新为当前文件内容的哈希
- **AND** `evidenceFingerprint` SHALL 基于更新后的 entries 重新计算
- **AND** 后续 `openspec verify status my-change --json` SHALL 返回 FRESH

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

### Requirement: --no-verify 选项

`openspec sync` SHALL 提供 `--no-verify` 选项，跳过 verify gate 检查。

#### Scenario: --no-verify 开关

- **WHEN** 用户执行 `openspec sync my-change --no-verify`
- **THEN** `skipVerify` 设为 `true`
- **AND** 不调用 `checkFreshness` 或 `checkArchiveCompatibility`
- **AND** 同步照常执行

