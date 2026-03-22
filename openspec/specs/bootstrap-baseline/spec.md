# Spec: bootstrap-baseline

## Purpose

修正 bootstrap baseline 下 `full` 与 `opsx-first` 的输出合同，并将 candidate specs 纳入正式 bootstrap 流程。
## Requirements
### Requirement: 空 specs 目录仍应视为 raw baseline
`detectBootstrapBaseline()` SHALL 将空的 `openspec/specs/` 目录（或仅包含 `README.md`）视为 `raw` baseline。

#### Scenario: 空 openspec/specs/ 目录
- **GIVEN** 项目存在 `openspec/specs/` 目录
- **AND** 该目录为空或仅包含 README.md
- **WHEN** 执行 `detectBootstrapBaseline()`
- **THEN** 返回 `raw`
- **AND** `getAllowedBootstrapModes('raw')` 返回 `['full', 'opsx-first']`

#### Scenario: 有真实 spec 内容的 specs 目录
- **GIVEN** 项目存在 `openspec/specs/my-feature/spec.md`
- **WHEN** 执行 `detectBootstrapBaseline()`
- **THEN** 返回 `specs-based`
- **AND** `getAllowedBootstrapModes('specs-based')` 返回 `['full']`

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

### Requirement: Raw + opsx-first SHALL generate OPSX plus README-only starter
在 `raw` baseline 下，bootstrap 以 `opsx-first` 模式运行时 SHALL 生成正式 OPSX 三文件，并且只生成 `openspec/specs/README.md` starter，不生成 capability-level specs。

#### Scenario: Raw baseline uses opsx-first mode
- **GIVEN** bootstrap 以 `opsx-first` 模式初始化
- **AND** baseline 类型为 `raw`
- **WHEN** promote 成功
- **THEN** 写入正式 OPSX 三文件
- **AND** 仅创建 `openspec/specs/README.md`
- **AND** 不写入任何 `openspec/specs/<capability-folder>/spec.md`
- **AND** 不创建空 capability 目录

### Requirement: Specs-based + full SHALL preserve existing specs
在 `specs-based` baseline 下，bootstrap 以 `full` 模式运行时 SHALL 保留已有 specs，仅补齐缺失 capability 的 spec，并在目标路径冲突时 fail-fast。

#### Scenario: Existing spec path is preserved
- **GIVEN** baseline 类型为 `specs-based`
- **AND** `openspec/specs/existing-cap/spec.md` 已存在
- **AND** bootstrap 以 `full` 模式初始化
- **WHEN** promote 成功
- **THEN** 已有 `openspec/specs/existing-cap/spec.md` 保持不变

#### Scenario: Missing capability spec is added
- **GIVEN** baseline 类型为 `specs-based`
- **AND** bootstrap 以 `full` 模式初始化
- **AND** 某个 candidate capability 对应的正式 spec 路径当前不存在
- **WHEN** promote 成功
- **THEN** 系统 SHALL 为该 capability 新增正式 spec

#### Scenario: Existing target path causes fail-fast
- **GIVEN** baseline 类型为 `specs-based`
- **AND** bootstrap 以 `full` 模式初始化
- **AND** 某个 candidate capability 将解析到一个已存在的正式 spec 路径
- **WHEN** 执行 promote
- **THEN** 命令 SHALL 失败
- **AND** SHALL NOT overwrite 该已有 spec
- **AND** SHALL NOT merge 新旧 spec 内容

## PBT Properties

### Property 1: Full completeness
- **INVARIANT**: `raw + full` promote 成功后，candidate capability 集合与正式 spec 集合一一对应，且每个 spec 合法
- **FALSIFICATION**: 随机生成 capability / requirement / scenario 数据，检查是否存在缺失 spec 或非法 spec

### Property 2: Opsx-first exclusivity
- **INVARIANT**: `raw + opsx-first` promote 成功后，不存在任何 `openspec/specs/*/spec.md`
- **FALSIFICATION**: 在随机 raw 项目上 promote 后扫描 specs tree，若出现行为级 spec 则失败

### Property 3: Preserve-only determinism
- **INVARIANT**: `specs-based + full` 对已有 spec 的处理是确定性的：保留已有、补充缺失、冲突失败
- **FALSIFICATION**: 随机生成已有 specs 与重叠 capability，验证不会发生静默 overwrite 或随机 merge
