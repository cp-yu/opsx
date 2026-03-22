## MODIFIED Requirements

### Requirement: Raw + full SHALL generate formal OPSX and complete valid specs
在 `raw + full` 下，bootstrap SHALL 将 candidate specs 纳入 review / stale / promote 合同，并且当 candidate spec 失效时在任何正式写入之前阻断 promote。

#### Scenario: Full mode output is reviewed before promote
- **GIVEN** bootstrap 以 `full` 模式初始化
- **AND** baseline 类型为 `raw`
- **WHEN** 执行 `openspec bootstrap validate`
- **THEN** 同时生成 candidate OPSX 与 candidate specs
- **AND** review SHALL 审核 candidate specs 的完整性与合法性
- **AND** promote SHALL NOT 在写入时临时生成未审核 specs

#### Scenario: Candidate spec source edits make review stale
- **GIVEN** bootstrap 以 `full` 模式初始化
- **AND** baseline 类型为 `raw`
- **AND** candidate 输出与 review 已生成且处于 `current`
- **WHEN** 任一会影响 candidate spec 内容或路径的 spec-generation source data 被修改
- **THEN** reviewState SHALL 变为 `stale`
- **AND** promote SHALL 被阻止，直到重新运行 `openspec bootstrap validate` 并重新审核

#### Scenario: Invalid candidate spec blocks promote before formal writes
- **GIVEN** bootstrap 以 `full` 模式初始化
- **AND** baseline 类型为 `raw`
- **AND** review 已完成并允许 promote
- **AND** 某个 candidate spec 在磁盘上变为非法或缺失
- **WHEN** 执行 `openspec bootstrap promote`
- **THEN** 命令 SHALL 失败
- **AND** SHALL NOT 写入任何正式 OPSX 文件
- **AND** SHALL NOT 写入任何正式 spec 文件
