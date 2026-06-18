### Task 1: 重建 explore Superpowers reference

**Goal**: 将 `explore-supperpowers-style` reference 从四段示例重写为 OpenSpec-adapted Superpowers brainstorming protocol。

**Files**:
- Modify: `src/core/templates/workflows/explore.ts`
- Modify: `openspec/references/openspec-explore-supperpowers-style.md`
- Test: `test/core/templates/explore-template.test.ts`

**Requirements**:
- `EXPLORE_SUPPERPOWERS_STYLE_REFERENCE` 覆盖 Superpowers hard gate、context exploration、just-in-time visual companion、one-question discipline、2-3 approaches、section approval、Design Summary self-review、user review gate、openspec-propose handoff。
- reference 使用逻辑 workflow 名称 `openspec-propose`，不包含 `/opsx:` 或 `$openspec-`。
- reference 不暗示 explore 可写 design doc、commit 或调用 writing-plans。
- 保留 `references/explore-supperpowers-style.md` 路径。

#### Checks

- [x] C1 验证 reference 注册与核心行为覆盖
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴露 superpowers 行为引导" / Scenario "explore 声明 supperpowers-style reference"
  - Command: `npm run test -- test/core/templates/explore-template.test.ts`
  - Expect: 测试断言 reference 包含 Superpowers hard gate、context exploration、just-in-time visual companion、one-question discipline、2-3 approaches、section-by-section design approval、Design Summary self-review、user review gate、openspec-propose handoff

- [x] C2 验证 reference 不越过 OpenSpec 只读边界
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴露 superpowers 行为引导" / Scenario "reference 内容路由到 propose 而非直接写入"
  - Command: `npm run test -- test/core/templates/explore-template.test.ts`
  - Expect: reference 不包含直接写 design doc、commit、writing-plans 或旧式直接写入措辞，并使用 `openspec-propose` 逻辑 workflow 名称

### Task 2: 更新 explore reference 契约测试

**Goal**: 用测试固定新的 Superpowers 来源和 OpenSpec 适配边界，防止再次退化成轻量示例文档。

**Files**:
- Modify: `test/core/templates/explore-template.test.ts`

**Requirements**:
- 测试从“四个主题”改为验证 Superpowers brainstorming 行为纪律。
- 测试保留主 instructions 指向 reference 且不重建行为的断言。
- 测试保留 tool-neutral reference、无 sweeper 协议重复、长度限制断言。

#### Checks

- [x] C3 验证 Superpowers 设计前置纪律被测试固定
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴露 superpowers 行为引导" / Scenario "reference 保留 Superpowers 设计前置纪律"
  - Command: `npm run test -- test/core/templates/explore-template.test.ts`
  - Expect: 测试失败时能暴露 hard gate、简单变更设计确认、Design Summary 用户审查 gate 的缺失

- [x] C4 验证主 instructions 保持精简
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴露 superpowers 行为引导" / Scenario "主 instructions 保持精简并指向 reference"
  - Command: `npm run test -- test/core/templates/explore-template.test.ts`
  - Expect: 主 instructions 仍包含 Required References、read-only、Impact Sweeps、Brainstorming Checklist，且不内联重建 Superpowers reference 内容

### Task 3: 刷新生成产物并跑长度校验

**Goal**: 通过 OpenSpec 生成链刷新物化 reference 和 managed skill，确认生成内容满足长度和工具中立约束。

**Files**:
- Modify: `openspec/references/openspec-explore-supperpowers-style.md`
- Modify: `.codex/skills/openspec-explore/SKILL.md`
- Test: `test/skills/skill-template-length-validation.test.ts`
- Test: `test/core/templates/skill-templates-parity.test.ts`

**Requirements**:
- 通过 `openspec update` 生成物化 reference，不手写生成产物作为源头。
- 主 `SKILL.md` 保持 ≤200 行。
- referenceFiles 内容保持 ≤500 行。
- 如模板 hash/parity 测试存在固定值，随模板变化同步更新。

#### Checks

- [x] C5 验证生成产物与模板源一致
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴露 superpowers 行为引导" / Scenario "主 instructions 保持精简并指向 reference"
  - Command: `openspec update && npm run test -- test/core/templates/explore-template.test.ts`
  - Expect: `openspec/references/openspec-explore-supperpowers-style.md` 与模板 reference 内容一致，explore skill 指向项目级 reference

- [x] C6 验证长度和 parity 约束
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 通过 referenceFiles 暴露 superpowers 行为引导" / Scenario "主 instructions 保持精简并指向 reference"
  - Command: `npm run test -- test/skills/skill-template-length-validation.test.ts test/core/templates/skill-templates-parity.test.ts`
  - Expect: 主 `SKILL.md` ≤200 行，referenceFiles ≤500 行，模板 parity 断言通过
