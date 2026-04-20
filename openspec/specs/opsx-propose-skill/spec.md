# opsx-propose-skill Specification

## Purpose
定义 `/opsx:propose` 在生成工件后执行轻量校验、单轮修复以及最终 warning 汇总的行为边界。
## Requirements
### Requirement: Post-propose warning validation
`/opsx:propose` 在生成 apply-required artifacts 后 SHALL 执行一次 post-propose warning validation。

#### Scenario: Validation runs after artifact generation
- **WHEN** agent 完成 `proposal.md`、`specs/`、`design.md`、`tasks.md` 以及适用时的 `opsx-delta.yaml` 生成
- **THEN** agent SHALL 在最终总结前执行一次文档体检
- **AND** 该体检 SHALL 发生在 “Ready for implementation” 输出之前

#### Scenario: Validation is warning-only
- **WHEN** post-propose validation 发现问题
- **THEN** 结果 SHALL 以 warning 形式呈现
- **AND** SHALL NOT 将 `propose` 转变为阻断式 gate
- **AND** 最终仍 MAY 宣告 ready for apply

### Requirement: Specs validation aligns with downstream sync/archive semantics
`specs` 的 post-propose 校验 SHALL 与后续 `sync` / `archive` 使用的 delta spec 校验语义保持基本一致。

#### Scenario: Delta spec structure is checked
- **WHEN** agent 校验 change 下的 generated specs
- **THEN** SHALL 检查 delta section 结构是否合法
- **AND** SHALL 检查 `ADDED` / `MODIFIED` requirement 是否包含规范性文本
- **AND** SHALL 检查 requirement 是否包含至少一个 `#### Scenario:`
- **AND** SHALL 与后续 change delta validation 的主要失败条件保持一致

### Requirement: OPSX validation aligns with downstream sync/archive semantics
`opsx-delta.yaml` 的 post-propose 校验 SHALL 与后续 `sync` / `archive` prepare 阶段的 OPSX dry-run 合并校验语义保持基本一致。

#### Scenario: OPSX delta is validated against current project OPSX
- **GIVEN** `openspec/project.opsx.yaml` 存在
- **AND** change 中存在 `opsx-delta.yaml`
- **WHEN** agent 执行 post-propose validation
- **THEN** SHALL 按 dry-run 方式解析 `opsx-delta.yaml`
- **AND** SHALL 基于当前 project OPSX 进行合并预演
- **AND** SHALL 检查 referential integrity
- **AND** SHALL 检查 code-map integrity
- **AND** SHALL 与后续 `sync` / `archive` prepare 阶段的主要失败条件保持一致

#### Scenario: No formal OPSX exists
- **GIVEN** `openspec/project.opsx.yaml` 不存在
- **WHEN** change 中存在 `opsx-delta.yaml`
- **THEN** agent SHALL 跳过 merge-based OPSX integrity 校验
- **AND** SHALL NOT 报错
- **AND** 最终报告 SHALL 说明该检查被跳过

### Requirement: Auxiliary artifact checks stay lightweight
`proposal.md`、`design.md`、`tasks.md` 的 post-propose 检查 SHALL 保持轻量，并以当前 schema template 为准。

#### Scenario: Lightweight template-based checks
- **WHEN** agent 校验 `proposal.md`、`design.md`、`tasks.md`
- **THEN** SHALL 仅检查关键模板结构是否存在
- **AND** SHALL 使用当前 schema template 作为结构依据
- **AND** SHALL NOT 引入独立于 template 的重语义 lint 规则

### Requirement: Single repair pass
发现 warning 后，agent SHALL 进行单轮文档修复，而不是无限循环。

#### Scenario: Agent fixes warnings once
- **WHEN** 初次 post-propose validation 产生 warning
- **THEN** agent SHALL 先尝试修复文档
- **AND** SHALL 仅进行一轮修复
- **AND** 修复后 SHALL 再检查一次并输出结果

### Requirement: Final summary reports fixed and remaining warnings
`/opsx:propose` 的最终总结 SHALL 区分已修复 warning 与剩余 warning。

#### Scenario: Final summary with residual warnings
- **WHEN** 单轮修复后仍存在 warning
- **THEN** 最终总结 SHALL 列出 remaining warnings
- **AND** SHALL 明确这些 warning 主要需要继续修正文档
- **AND** SHALL 允许继续进入 `/opsx:apply`

#### Scenario: Final summary with all warnings fixed
- **WHEN** 单轮修复后 warning 已消除
- **THEN** 最终总结 SHALL 说明 post-propose validation 已通过
- **AND** SHALL 输出 ready for apply
