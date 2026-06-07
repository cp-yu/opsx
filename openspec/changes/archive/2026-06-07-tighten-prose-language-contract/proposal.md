## Why

当前 `proseLanguage` 投影只笼统要求新写 prose 使用目标语言，导致 artifact 生成时普通英文 task 标题、Requirement 标题、Scenario 标题和 `Expect:` 描述被误当作 canonical token 保留。需要把 prose 与 canonical token 的边界写进共享契约，避免生成面继续混用普通英文 prose。

## What Changes

- 强化 `configProjection` 中 `proseLanguage` 的 authoring guidance，明确新写或改写的 natural-language prose 必须跟随 `proseLanguage` 的值。
- 收紧共享 `Document Language Contract`，列出 artifact 中属于 prose 的字段和允许保持 canonical 的结构 token。
- 更新 spec-driven schema instructions，明确 specs/tasks 中的 Requirement/Scenario titles、task titles、check names、`Expect:` / `Evidence:` prose 跟随 `proseLanguage`，结构标签保持 canonical。
- 增加 prompt/template 层测试，固定 projection、instruction-loader 和 propose workflow surface 的语言契约。

## Capabilities

### New Capabilities

### Modified Capabilities
- `docs-agent-instructions`: workflow 和 skill surface 共享的 config projection contract 增加 prose 字段边界。
- `instruction-loader`: artifact instructions 暴露的 projection lines 增加更明确的 `proseLanguage` 规则。
- `openspec-conventions`: spec-driven artifact instructions 明确结构 token 与填充 prose 的语言边界。
- `propose-workflow`: `$openspec-propose` 继续消费共享 contract，生成 artifact 时遵守 tightened prose language contract。

## Impact

- 影响代码：`src/core/config-projection.ts`、`src/core/templates/fragments/opsx-fragments.ts`、`schemas/spec-driven/schema.yaml`、`src/core/templates/workflows/propose.ts`。
- 影响测试：`test/core/project-config.test.ts`、`test/core/artifact-graph/instruction-loader.test.ts`、`test/core/templates/propose-template.test.ts`，必要时补充 schema instruction 断言。
- 不引入 language lint/validator，不增加 propose per-artifact self-check。
