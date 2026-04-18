# verify-writeback Specification

## Purpose
TBD - created by archiving change add-verify-writeback. Update Purpose after archive.
## Requirements
### Requirement: Verify Write-back 能力

当 `/opsx:verify` 发现 CRITICAL 级别的 spec-code 不一致时，系统 SHALL 自动将 `tasks.md` 中对应任务的完成标记从 `[x]` 回退为 `[ ]`，并生成 remediation 清单。

#### Scenario: CRITICAL 不一致触发 task unmark

- **WHEN** verify 检测到某个 requirement 在代码中完全缺失实现
- **AND** 该 requirement 对应的 task 在 `tasks.md` 中标记为 `[x]`
- **THEN** 系统 SHALL 将该 task 的 `[x]` 替换为 `[ ]`
- **AND** 在 remediation 清单中记录 unmark 原因和对应的 requirement

#### Scenario: WARNING 级别不触发自动 write-back

- **WHEN** verify 检测到 WARNING 级别的不一致（如实现偏离 spec 意图但功能存在）
- **THEN** 系统 SHALL 仅在报告中列出 WARNING
- **AND** SHALL NOT 自动修改 `tasks.md`

#### Scenario: 无 CRITICAL 不一致时不修改 tasks.md

- **WHEN** verify 完成且无 CRITICAL 级别 issue
- **THEN** 系统 SHALL NOT 修改 `tasks.md`
- **AND** 验证结果标记为 `PASS` 或 `PASS_WITH_WARNINGS`

### Requirement: Remediation 清单生成

系统 SHALL 在 verify 发现问题时生成结构化的 remediation 清单，区分 `code_fix` 和 `artifact_fix` 两类。

#### Scenario: 生成 code_fix 类型 remediation

- **WHEN** verify 发现代码未实现某个 spec requirement
- **THEN** remediation 清单 SHALL 包含一条 `code_fix` 条目
- **AND** 条目包含：对应的 requirement 名称、缺失的具体行为、建议修改的文件

#### Scenario: 生成 artifact_fix 类型 remediation

- **WHEN** verify 发现代码实现与 spec/design 描述不一致，但代码实现是合理的
- **THEN** remediation 清单 SHALL 包含一条 `artifact_fix` 条目
- **AND** 条目包含：需要更新的 artifact（spec 或 design）、当前描述与实际行为的差异

#### Scenario: Remediation 清单追加到 tasks.md

- **WHEN** remediation 清单非空
- **THEN** 系统 SHALL 在 `tasks.md` 末尾追加 `## Remediation` section
- **AND** 每条 remediation 以 `- [ ]` checkbox 格式列出，标注类型（`[code_fix]` 或 `[artifact_fix]`）

### Requirement: 验证结果持久化

系统 SHALL 将 verify 结果持久化到 change 目录下的 `.verify-result.json`，供 archive 检查。

#### Scenario: 持久化验证结果

- **WHEN** verify 完成
- **THEN** 系统 SHALL 在 `openspec/changes/<name>/` 下写入 `.verify-result.json`
- **AND** 文件包含：`timestamp`（ISO 8601）、`result`（`PASS` / `PASS_WITH_WARNINGS` / `FAIL_NEEDS_REMEDIATION`）、`issues` 数组、`tasksFileHash`（tasks.md 内容摘要）

#### Scenario: 验证结果过期判定

- **WHEN** archive 读取 `.verify-result.json`
- **AND** `tasks.md` 的当前内容摘要与 `tasksFileHash` 不匹配
- **THEN** 该验证结果 SHALL 被视为过期（stale）

#### Scenario: 跨平台路径处理

- **WHEN** 写入或读取 `.verify-result.json`
- **THEN** 系统 SHALL 使用 `path.join()` 构建文件路径
- **AND** SHALL NOT 硬编码路径分隔符

### Requirement: Verify write-back SHALL consume runtime projection
When verify writes remediation content back to `tasks.md`, the system SHALL use runtime projection compiled from project config for natural-language prose decisions.

#### Scenario: Remediation prose follows projected language policy
- **WHEN** verify appends or refreshes `## Remediation` content
- **AND** runtime projection defines a prose-language policy
- **THEN** remediation descriptions SHALL follow that policy
- **AND** task checkboxes, section headers, requirement references, and other canonical tokens SHALL remain unchanged

