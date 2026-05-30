## MODIFIED Requirements

### Requirement: Post-propose warning validation

`/opsx:propose` 在生成 apply-required artifacts 后 SHALL 执行一次 post-propose warning validation。该 validation SHALL 只包含程序化、可复现的文档结构检查；它 SHALL NOT 使用大语言模型执行语义质量判断。

#### Scenario: Validation runs after artifact generation
- **WHEN** agent 完成 `proposal.md`、`specs/`、`design.md`、`tasks.md` 以及适用时的 `opsx-delta.yaml` 生成
- **THEN** agent SHALL 在最终总结前执行一次文档体检
- **AND** 该体检 SHALL 发生在 "Ready for implementation" 输出之前

#### Scenario: Validation is warning-only
- **WHEN** post-propose validation 发现问题
- **THEN** 结果 SHALL 以 warning 形式呈现
- **AND** SHALL NOT 将 `propose` 转变为阻断式 gate
- **AND** 最终仍 MAY 宣告 ready for apply

#### Scenario: Actions and Checks structure is checked programmatically
- **WHEN** agent 执行 post-propose warning validation
- **AND** `tasks.md` 已生成
- **THEN** validation SHALL programmatically check that `tasks.md` contains `Actions` and `Checks` sections
- **AND** SHALL check that action checkboxes use `A` IDs
- **AND** SHALL check that check checkboxes use `C` IDs
- **AND** SHALL check that every check contains a `Covers:` field
- **AND** SHALL check that every `Covers:` reference points to an existing action ID
- **AND** SHALL check that every action ID is referenced by at least one `Covers:` field

#### Scenario: Check fields are structurally validated
- **WHEN** post-propose validation inspects `Checks`
- **THEN** validation SHALL programmatically check that every check contains at least one executable evidence field from the allowed set: `Command:`, `Evidence:`, or `Expect:`
- **AND** validation SHALL NOT judge whether the command, evidence, or expectation is semantically sufficient

#### Scenario: Programmatic task warnings remain repair-only
- **WHEN** programmatic task structure validation finds missing sections, malformed IDs, missing `Covers:`, dangling `Covers:` references, or missing evidence fields
- **THEN** agent SHALL 将问题记录为 warning
- **AND** SHALL 最多执行一轮 `tasks.md` 修复
- **AND** SHALL NOT 阻断 apply-ready 输出

#### Scenario: Semantic suitability is deferred to verify
- **WHEN** post-propose validation checks `tasks.md`
- **THEN** validation SHALL NOT classify actions as trivial or non-trivial
- **AND** SHALL NOT judge whether a bugfix, validation, or refactor check is semantically appropriate
- **AND** semantic sufficiency SHALL be evaluated later by the verify/reviewer workflow against the generated artifacts and implementation evidence

### Requirement: Specs validation aligns with downstream sync/archive semantics
`specs` 的 post-propose 校验 SHALL 与后续 `sync` / `archive` 使用的 delta spec 校验语义保持基本一致。

#### Scenario: Delta spec structure is checked
- **WHEN** agent 校验 change 下的 generated specs
- **THEN** SHALL 检查 delta section 结构是否合法
- **AND** SHALL 检查 `ADDED` / `MODIFIED` requirement 是否包含规范性文本
- **AND** SHALL 检查 requirement 是否包含至少一个 `#### Scenario:`
- **AND** SHALL 与后续 change delta validation 的主要失败条件保持一致

### Requirement: OPSX validation aligns with downstream sync/archive semantics
`opsx-delta.yaml` 的 post-propose 校验 SHALL 通过程序化 CLI 命令执行，而非手动 dry-run。`openspec validate "<name>" --type change` SHALL 自动包含 OPSX dry-run merge 校验（通过 `Validator.validateOpsxDelta()`），检查 Zod schema 解析、引用完整性和 code-map 完整性。

#### Scenario: OPSX delta is validated against current project OPSX
- **GIVEN** `openspec/project.opsx.yaml` 存在
- **AND** change 中存在 `opsx-delta.yaml`
- **WHEN** agent 执行 post-propose validation
- **THEN** SHALL 调用 `openspec validate "<change>" --type change --json`
- **AND** 该命令 SHALL 通过 `Validator.validateOpsxDelta()` 以程序化方式执行 OPSX dry-run merge 校验
- **AND** SHALL 检查 referential integrity
- **AND** SHALL 检查 code-map integrity
- **AND** SHALL NOT 依赖 LLM 手动读取文件并模拟 merge 语义

#### Scenario: No formal OPSX exists
- **GIVEN** `openspec/project.opsx.yaml` 不存在
- **WHEN** change 中存在 `opsx-delta.yaml`
- **THEN** `Validator.validateOpsxDelta()` SHALL 优雅跳过
- **AND** 返回 valid: true 且无 issues
- **AND** SHALL NOT 报错