# sync-evidence-refresh Specification

## Purpose
此规约记录变更 sync-refresh-verify-evidence-fingerprint 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: sync 完成后刷新 evidence fingerprint

`applyPreparedChangeSync` SHALL 在所有文件写入成功后，检测 change 目录下是否存在 `.verify-result.json`。若存在，SHALL 对 evidenceFingerprintEntries 中路径与本次 sync 输出重叠的条目重算文件哈希，并更新 evidenceFingerprint。

sync 输出文件集合 SHALL 由以下路径组成（相对于 projectRoot 的 POSIX 路径）：
- 若写入了 OPSX delta：`openspec/project.opsx.yaml`、`openspec/project.opsx.relations.yaml`、`openspec/project.opsx.code-map.yaml`
- 所有 spec 写入的目标路径：`prepared.specs.writes[].update.target`

系统 SHALL 使用与 `computeEvidenceFingerprint` 相同的路径标准化方式（`resolveEvidencePath` + `toPosixRelative`）定位和比较文件。

#### Scenario: evidence 中有 sync 输出文件时刷新

- **GIVEN** `.verify-result.json` 存在且包含 `evidenceFingerprintEntries`
- **AND** entries 中包含路径 `openspec/project.opsx.yaml`
- **AND** `prepared.opsx` 非 null（sync 将写入 OPSX 文件）
- **WHEN** `applyPreparedChangeSync` 完成 OPSX 和 spec 写入
- **THEN** 系统 SHALL 读取 `openspec/project.opsx.yaml` 的当前内容
- **AND** SHALL 重算其 SHA-256 哈希
- **AND** SHALL 更新对应 entry 的 hash 值
- **AND** SHALL 重算 `evidenceFingerprint`（JSON.stringify 排序后的 entries → SHA-256）
- **AND** SHALL 将更新后的 result 写回 `.verify-result.json`

#### Scenario: evidence 中无 sync 输出文件时跳过

- **GIVEN** `.verify-result.json` 存在
- **AND** evidenceFingerprintEntries 中的所有路径均不在 sync 输出集合中
- **WHEN** `applyPreparedChangeSync` 完成写入
- **THEN** 系统 SHALL NOT 修改 `.verify-result.json`
- **AND** SHALL NOT 报错

#### Scenario: .verify-result.json 不存在时跳过

- **GIVEN** change 目录下不存在 `.verify-result.json`
- **WHEN** `applyPreparedChangeSync` 完成写入
- **THEN** 系统 SHALL 静默跳过刷新步骤
- **AND** SHALL NOT 报错

#### Scenario: 无 evidenceFingerprintEntries 时跳过

- **GIVEN** `.verify-result.json` 存在但不包含 `evidenceFingerprintEntries` 字段（legacy 格式）
- **WHEN** `applyPreparedChangeSync` 完成写入
- **THEN** 系统 SHALL 静默跳过刷新步骤

#### Scenario: 刷新后 checkFreshness 返回 FRESH

- **GIVEN** sync 前 `.verify-result.json` 为 FRESH
- **AND** sync 改写 `openspec/project.opsx.yaml`（该文件在 evidenceFiles 中）
- **AND** sync 完成后已执行 evidence fingerprint 刷新
- **WHEN** 调用 `checkFreshness(changeDir, projectRoot)`
- **THEN** 返回 `{ status: 'FRESH' }`

#### Scenario: change 级 spec 文件不受刷新影响

- **GIVEN** evidenceFingerprintEntries 中包含 `openspec/changes/<name>/specs/foo/spec.md`
- **AND** sync 不改写此路径（change 级 spec 不在 sync 输出中）
- **WHEN** `applyPreparedChangeSync` 完成写入
- **THEN** 该 entry 的 hash 保持不变
- **AND** 若此文件被外部修改，后续 `checkFreshness` 正常检测到 STALE

#### Scenario: 刷新后证据文件再次被外部修改

- **GIVEN** sync 后 evidence fingerprint 已刷新为 FRESH
- **WHEN** 外部进程再次修改 `openspec/project.opsx.yaml`
- **THEN** 后续 `checkFreshness` SHALL 检测到 STALE
- **AND** details SHALL 列出 `openspec/project.opsx.yaml` 为变更文件

