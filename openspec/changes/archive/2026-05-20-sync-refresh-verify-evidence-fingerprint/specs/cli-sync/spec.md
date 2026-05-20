## MODIFIED Requirements

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