### Task 1: 收紧 config projection 与共享语言契约

**Goal**: 让 `proseLanguage` projection 和共享 `Document Language Contract` 明确 prose 字段、canonical token 例外和英文术语边界。

**Files**:
- Modify: `src/core/config-projection.ts`
- Modify: `src/core/templates/fragments/opsx-fragments.ts`
- Test: `test/core/project-config.test.ts`
- Test: `test/core/artifact-graph/instruction-loader.test.ts`

**Requirements**:
- `proseLanguage` projection 说明所有新写或改写 natural-language prose 跟随配置值。
- Projection 和 shared contract 明确 task titles、check names、Requirement/Scenario titles、bullet descriptions、`Expect:` / `Evidence:` descriptions 属于 prose。
- Shared contract 保留 template headings、normative keywords、BDD keywords、IDs、schema keys、relation types、paths、commands、code identifiers 和 exact existing Requirement titles。
- 英文术语可嵌入目标语言 prose，但普通英文句子或标题不得整体保留英文。

#### Checks

- [x] C1 验证 projection 暴露 tightened prose guidance
  - Verifies: `specs/instruction-loader/spec.md` / Requirement "proseLanguage projection 描述 prose 字段" / Scenario "artifact instructions 包含 tightened prose guidance"
  - Command: `npx vitest run test/core/project-config.test.ts test/core/artifact-graph/instruction-loader.test.ts test/core/templates/propose-template.test.ts test/core/templates/skill-templates-parity.test.ts`
  - Expect: projection 和 instruction-loader 相关测试通过，断言 compiled prompt lines 包含 prose 字段和 canonical exception。

- [x] C2 验证共享 contract 覆盖所有 artifact-writing surface
  - Verifies: `specs/docs-agent-instructions/spec.md` / Requirement "artifact prose language contract 明确字段边界" / Scenario "共享 contract 定义 prose 字段", Scenario "共享 contract 保留 canonical token", Scenario "英文术语可嵌入目标语言 prose"
  - Command: `npx vitest run test/core/project-config.test.ts test/core/artifact-graph/instruction-loader.test.ts test/core/templates/propose-template.test.ts test/core/templates/skill-templates-parity.test.ts`
  - Expect: shared fragment 相关测试通过，contract 文案同时包含 prose 字段、canonical token 和英文术语规则。

### Task 2: 收紧 spec-driven artifact instructions

**Goal**: 明确 specs/tasks instruction 中结构 token 与填充 prose 的语言边界，避免英文 examples 带偏 artifact prose。

**Files**:
- Modify: `schemas/spec-driven/schema.yaml`
- Test: `test/core/artifact-graph/instruction-loader.test.ts`

**Requirements**:
- Specs instruction 指出 `### Requirement:` 与 `#### Scenario:` 保持 canonical，新写 Requirement/Scenario titles 跟随 `proseLanguage`。
- Tasks instruction 指出 `### Task N:`、`Goal`、`Files`、`Requirements`、`Checks`、`Verifies:`、`Command:`、`Evidence:`、`Expect:` 等结构标签保持 canonical。
- Tasks instruction 指出 task titles、check names、requirements bullet prose、`Evidence:` descriptions 和 `Expect:` descriptions 跟随 `proseLanguage`。
- Examples 只作为结构示例，不授权普通英文 prose carryover。

#### Checks

- [x] C3 验证 specs instruction 区分 title prose 与 canonical marker
  - Verifies: `specs/openspec-conventions/spec.md` / Requirement "spec-driven instruction 区分结构 token 和填充 prose" / Scenario "specs instruction 标注 Requirement 和 Scenario title 语言"
  - Command: `npx vitest run test/core/artifact-graph/instruction-loader.test.ts`
  - Expect: schema instruction 断言覆盖 Requirement/Scenario marker 保持 canonical 且 new titles 跟随 `proseLanguage`。

- [x] C4 验证 tasks instruction 区分结构标签与 prose 内容
  - Verifies: `specs/openspec-conventions/spec.md` / Requirement "spec-driven instruction 区分结构 token 和填充 prose" / Scenario "tasks instruction 标注 task 和 check prose 语言", Scenario "examples 不改变 proseLanguage 约束"
  - Command: `npx vitest run test/core/artifact-graph/instruction-loader.test.ts`
  - Expect: schema instruction 断言覆盖 task/check prose 字段跟随 `proseLanguage`，并说明 examples 不改变语言约束。

### Task 3: 固定 propose workflow 语言契约

**Goal**: 确保 `$openspec-propose` skill/command template 消费共享语言契约，不引入 per-artifact language scan。

**Files**:
- Modify: `src/core/templates/workflows/propose.ts`
- Test: `test/core/templates/propose-template.test.ts`

**Requirements**:
- Propose skill 和 command template 包含共享 `Document Language Contract`。
- Propose guidance 使用 artifact instructions 与 `configProjection.prompt.fragments` 作为语言约束来源。
- Propose 不增加每个 artifact 完成前的 ordinary English prose scan。

#### Checks

- [x] C5 验证 propose template 包含共享语言契约
  - Verifies: `specs/propose-workflow/spec.md` / Requirement "Propose 消费共享 artifact language contract" / Scenario "Propose template 包含共享语言契约"
  - Command: `npx vitest run test/core/templates/propose-template.test.ts`
  - Expect: propose template 测试断言 skill 和 command body 都包含 shared contract 与 `proseLanguage` prose fields。

- [x] C6 验证 propose template 不包含额外语言自检流程
  - Verifies: `specs/propose-workflow/spec.md` / Requirement "Propose 消费共享 artifact language contract" / Scenario "Propose 不增加额外语言自检流程"
  - Command: `npx vitest run test/core/templates/propose-template.test.ts`
  - Expect: propose template 测试断言没有 per-artifact non-canonical English prose scan 或额外 self-check 要求。
