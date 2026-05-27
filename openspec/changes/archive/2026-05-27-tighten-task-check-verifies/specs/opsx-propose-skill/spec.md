## MODIFIED Requirements

### Requirement: Post-propose warning validation

`/opsx:propose` 在生成 apply-required artifacts 后 SHALL 执行一次 post-propose warning validation。该 validation SHALL 只包含程序化、可复现的文档结构检查；它 SHALL NOT 使用大语言模型执行语义质量判断。对于 `tasks.md`，validation SHALL 检查每个 `Checks` 条目的 `Verifies:` 字段结构，并在可用时对 change-local spec requirement/scenario 引用做确定性交叉校验。

#### Scenario: Validation runs after artifact generation
- **WHEN** agent 完成 `proposal.md`、`specs/`、`design.md`、`tasks.md` 以及适用时的 `opsx-delta.yaml` 生成
- **THEN** agent SHALL 在最终总结前执行一次文档体检
- **AND** 该体检 SHALL 发生在 “Ready for implementation” 输出之前

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
- **AND** validation SHALL programmatically check that every check contains a non-empty `Verifies:` field
- **AND** validation SHALL NOT judge whether the command, evidence, expectation, or `Verifies:` target is semantically sufficient

#### Scenario: Verifies references are checked when change specs exist
- **WHEN** post-propose validation inspects a `Verifies:` field
- **AND** the change contains one or more local `specs/*/spec.md` files
- **THEN** validation SHALL require a change-local relative path in the form `specs/<capability>/spec.md`
- **AND** SHALL reject `openspec/specs/...`, project-root-relative paths, absolute paths, parent traversal, and backslash-separated paths
- **AND** SHALL check that the referenced spec file exists
- **AND** SHALL check that the referenced `Requirement` exists in that spec file
- **AND** SHALL check that every referenced `Scenario` or `Scenarios` name exists under that requirement

#### Scenario: Missing change specs degrade Verifies cross-check to warning
- **WHEN** post-propose validation inspects `tasks.md`
- **AND** the change contains no local `specs/*/spec.md` files
- **AND** every check contains a non-empty `Verifies:` field
- **THEN** validation SHALL return a warning explaining that no change specs were available for requirement/scenario cross-checking
- **AND** SHALL NOT fail the task structure solely because `Verifies:` lacks a `specs/<capability>/spec.md` path

#### Scenario: Programmatic task warnings remain repair-only
- **WHEN** programmatic task structure validation finds missing sections, malformed IDs, missing `Covers:`, dangling `Covers:` references, missing `Verifies:`, invalid `Verifies:` paths, missing requirement/scenario references, or missing evidence fields
- **THEN** agent SHALL 将问题记录为 warning
- **AND** SHALL 最多执行一轮 `tasks.md` 修复
- **AND** SHALL NOT 阻断 apply-ready 输出

#### Scenario: Semantic suitability is deferred to verify
- **WHEN** post-propose validation checks `tasks.md`
- **THEN** validation SHALL NOT classify actions as trivial or non-trivial
- **AND** SHALL NOT judge whether a bugfix, validation, refactor check, or `Verifies:` target is semantically appropriate
- **AND** semantic sufficiency SHALL be evaluated later by the verify/reviewer workflow against the generated artifacts and implementation evidence
