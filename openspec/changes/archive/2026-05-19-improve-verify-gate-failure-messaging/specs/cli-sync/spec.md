## MODIFIED Requirements

<!--
  cli-sync 在现有的 Command Syntax 和 verify gate 行为中未记录 --no-verify 选项。
  此 delta 补充相关需求，并将 verify gate 失败输出格式从技术诊断升级为可操作指引。
-->

### Requirement: 同步执行

`openspec sync` SHALL 复用 `change-sync` 契约执行同步。

在同步执行之前，系统 SHALL 检查 verify gate（通过 `checkFreshness` 和 `checkArchiveCompatibility`），除非用户传入 `--no-verify`。

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

## ADDED Requirements

### Requirement: --no-verify 选项

`openspec sync` SHALL 提供 `--no-verify` 选项，跳过 verify gate 检查。

#### Scenario: --no-verify 开关

- **WHEN** 用户执行 `openspec sync my-change --no-verify`
- **THEN** `skipVerify` 设为 `true`
- **AND** 不调用 `checkFreshness` 或 `checkArchiveCompatibility`
- **AND** 同步照常执行