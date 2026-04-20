# Spec: bootstrap-refresh-mode

## Purpose

定义 `formal-opsx -> refresh` 的 bootstrap 合同，包括 git-aware 扫描范围收敛、delta-first review，以及 merge-based promote。

## Requirements

### Requirement: Refresh mode SHALL support formal OPSX repositories

`openspec bootstrap` SHALL 为已有 formal OPSX 三文件的仓库提供显式 `refresh` mode，并继续拒绝 `invalid-partial-opsx` baseline。

#### Scenario: formal-opsx baseline exposes refresh as the only supported mode

- **WHEN** 仓库已存在合法的 `openspec/project.opsx.yaml`、`openspec/project.opsx.relations.yaml` 与 `openspec/project.opsx.code-map.yaml`
- **THEN** `detectBootstrapBaseline()` SHALL 返回 `formal-opsx`
- **AND** `getAllowedBootstrapModes('formal-opsx')` SHALL 返回 `['refresh']`
- **AND** pre-init `status --json` / `instructions --json` SHALL 将下一步指向 `openspec bootstrap init --mode refresh`

#### Scenario: invalid partial OPSX remains rejected

- **WHEN** 仓库只存在部分 formal OPSX 文件，或任一 formal OPSX 文件无法通过 schema 校验
- **THEN** `detectBootstrapBaseline()` SHALL 返回 `invalid-partial-opsx`
- **AND** `getAllowedBootstrapModes('invalid-partial-opsx')` SHALL 返回空列表
- **AND** bootstrap SHALL NOT 为该仓库暴露 `refresh` 入口

### Requirement: Refresh scan SHALL use a git anchor when available

refresh 模式 SHALL 在 bootstrap metadata 中记录最近一次 promote 的 git 锚点；当仓库可用 git 且锚点仍可解析时，系统 SHALL 基于锚点到当前工作树的变更路径缩小扫描范围。无法可靠使用 git 时，系统 SHALL 回退到全量扫描。

#### Scenario: git-aware refresh narrows scan scope

- **GIVEN** refresh metadata 中存在可解析的锚点提交
- **AND** 仓库位于有效 git work tree 中
- **WHEN** 执行 refresh scan 或 validate 以重建 candidate
- **THEN** 系统 SHALL 收集锚点提交到当前 `HEAD` 的改动路径，并纳入 staged、unstaged 与 untracked 文件
- **AND** 仅对这些路径映射到的节点及其直接关系邻居执行增量重扫
- **AND** 未受影响的 formal OPSX 节点 SHALL 被视为现有约束输入，而不是重新从零推断

#### Scenario: refresh falls back to full scan without git support

- **WHEN** 仓库不在 git 中、锚点提交缺失、锚点已不可达，或 diff 结果无法可信地映射到现有节点
- **THEN** refresh SHALL 回退到全量扫描
- **AND** 系统 SHALL 继续复用现有 formal OPSX、`openspec/specs/` 与保留的 `openspec/bootstrap/` 工作区作为输入约束
- **AND** SHALL NOT 因 git 不可用而中止 refresh workflow

#### Scenario: changed-path mapping is cross-platform

- **WHEN** refresh 将 git diff 路径映射到 `project.opsx.code-map.yaml` 中的 refs
- **THEN** 系统 SHALL 使用 `path.resolve()` / `path.normalize()` 一类跨平台路径规范化机制进行比较
- **AND** SHALL NOT 假设 `/` 为唯一分隔符
- **AND** Windows 上的路径大小写与分隔符差异 SHALL NOT 导致已变更节点被静默漏扫

### Requirement: Refresh review and promote SHALL be delta-first

refresh 模式下的 review 与 promote SHALL 以已有 formal OPSX 为基线，聚焦 ADDED / MODIFIED / REMOVED 变化，并通过 merge/delta 更新正式文件，而不是直接整包覆盖 candidate 输出。

#### Scenario: refresh review focuses on deltas against current formal OPSX

- **GIVEN** 仓库已有 formal OPSX
- **WHEN** refresh 生成 review 产物
- **THEN** review SHALL 明确展示相对当前 formal OPSX 的 ADDED / MODIFIED / REMOVED domains、capabilities 与 relations
- **AND** SHALL 标注哪些现有节点被保留为未变更基线
- **AND** review approval SHALL 在增量输入变化后变为 stale

#### Scenario: refresh promote merges reviewed OPSX changes

- **GIVEN** refresh review 已批准且 candidate delta 仍为 current
- **WHEN** 执行 `openspec bootstrap promote`
- **THEN** 系统 SHALL 基于当前 formal OPSX 执行 merge/delta 应用
- **AND** SHALL NOT 直接用 candidate `project.opsx*.yaml` 整包覆盖 formal 三文件
- **AND** merge 后结果 SHALL 继续通过 referential integrity 与 code-map integrity 校验

#### Scenario: refresh spec conflicts fail explicitly

- **GIVEN** refresh 识别出新增 capability 需要写入 formal spec
- **AND** 目标 `openspec/specs/<capability>/spec.md` 已存在且内容不属于本次新增目标
- **WHEN** 执行 promote
- **THEN** 命令 SHALL 失败并报告冲突路径
- **AND** SHALL NOT 隐式 merge、覆盖或删除已有 formal spec
- **AND** 对 formal OPSX 的写入 SHALL 一并中止

### Requirement: Refresh restart SHALL preserve retained workspace audit history

对已完成的 retained workspace 显式执行 restart 以开启新的 refresh run 时，系统 SHALL 在创建新工作目录前保留上一轮 workspace 作为审计历史。

#### Scenario: completed retained workspace is snapshotted before restart

- **GIVEN** 仓库 baseline 为 `formal-opsx`
- **AND** 当前 `openspec/bootstrap/` 是已完成 promote 的 retained workspace
- **WHEN** 用户执行 `openspec bootstrap init --mode refresh --restart`
- **THEN** 系统 SHALL 先将现有 workspace 移动到 OpenSpec 管理的显式历史目录
- **AND** SHALL 再创建新的 `openspec/bootstrap/` 作为下一轮 refresh run 的工作目录
- **AND** 成功输出 SHALL 包含历史快照路径

#### Scenario: restart carries forward only stable input state

- **GIVEN** 已完成 retained workspace 的 metadata 中存在上一轮 scope，且可能存在 `refresh_anchor_commit`
- **WHEN** 用户执行 `openspec bootstrap init --mode refresh --restart`
- **THEN** 新 workspace SHALL 继承上一轮 scope，除非用户显式传入新的 `--scope`
- **AND** 新 workspace SHALL 继承可用的 `refresh_anchor_commit`
- **AND** `source_fingerprint`、`candidate_fingerprint`、`review_fingerprint` 与 `candidate_spec_paths` SHALL 被显式清空

#### Scenario: restart falls back to full scan when no prior anchor exists

- **GIVEN** 已完成 retained workspace 没有可用的 `refresh_anchor_commit`
- **WHEN** 用户执行 `openspec bootstrap init --mode refresh --restart`
- **THEN** restart SHALL 仍然成功创建新的 refresh workspace
- **AND** 后续 refresh scan SHALL 回退到全量扫描，直到新的 promote 写入锚点
