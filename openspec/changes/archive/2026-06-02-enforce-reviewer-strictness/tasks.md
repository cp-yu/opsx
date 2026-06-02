### Task 1: 反转元规则和重写 severity thresholds

**Goal**: 将 reviewer.ts L83-93 的元规则从"不确定时降级"反转为"不确定时升级"，扩展 CRITICAL trigger 覆盖遗留物，明确 WARNING/SUGGESTION 的降级条件。

**Files**:
- Modify: `src/core/templates/workflows/reviewer.ts`
- Test: `test/skills/reviewer-severity-escalation.test.ts`

**Requirements**:
- 删除 L91-92 的"prefer lower tier"指令
- 新增 severity assignment philosophy 段落，明确"Default stance: Strict"
- CRITICAL trigger 扩展包含"residue from refactor/migration"
- WARNING trigger 收窄为明确的降级条件（工具缺失、装饰性 drift、显式注释说明）
- 新增"When uncertain: Escalate"指导原则

#### Checks

- [x] C1 验证元规则反转
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "严重性阈值与证据标准" / Scenario "实现与 spec 矛盾"
  - Evidence: `src/core/templates/workflows/reviewer.ts` L83-120
  - Expect: 包含 "Default stance: Strict" 和 "When uncertain: Escalate to CRITICAL"，不包含 "prefer lower tier"

- [x] C2 验证 CRITICAL trigger 扩展
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "严重性阈值与证据标准" / Scenario "实现与 spec 矛盾"
  - Evidence: `src/core/templates/workflows/reviewer.ts` severity thresholds 表格
  - Expect: CRITICAL 行包含 "OR residue from refactor/migration (orphaned code, stale markers, incomplete migration)"

### Task 2: 强化 Correctness 维度 trigger

**Goal**: 将 Correctness 维度（L127-133）的 spec 偏离和 scenario 未覆盖从 WARNING 升为 CRITICAL，增加明确的 downgrade 条件。

**Files**:
- Modify: `src/core/templates/workflows/reviewer.ts`
- Test: `test/skills/reviewer-correctness-escalation.test.ts`

**Requirements**:
- "divergence detected" 从 WARNING "may diverge" 改为 CRITICAL "contradicts spec"
- 新增 downgrade 条件："仅当 drift 是装饰性且不影响可观测行为时降为 WARNING"
- "scenario coverage incomplete" 从 WARNING 改为 CRITICAL（无 downgrade）
- 新增第三条：requirement 无证据 → CRITICAL

#### Checks

- [x] C3 验证 divergence 升级为 CRITICAL
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "三个验证维度" / Scenario "Correctness 维度升级 scenario 未覆盖为 CRITICAL"
  - Evidence: `src/core/templates/workflows/reviewer.ts` Correctness 段落
  - Expect: "issue CRITICAL \"Implementation contradicts spec\"" 且包含 downgrade 条件

- [x] C4 验证 scenario 未覆盖升级为 CRITICAL
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "三个验证维度" / Scenario "Correctness 维度升级 scenario 未覆盖为 CRITICAL"
  - Evidence: `src/core/templates/workflows/reviewer.ts` Correctness 段落
  - Expect: "issue CRITICAL \"Scenario not covered\"" 且无 downgrade 条件

### Task 3: 强化 Coherence 维度 trigger

**Goal**: 将 Coherence 维度（L134-140）的设计决策违反从 WARNING 升为 CRITICAL，增加明确的 downgrade 条件。

**Files**:
- Modify: `src/core/templates/workflows/reviewer.ts`
- Test: `test/skills/reviewer-coherence-escalation.test.ts`

**Requirements**:
- "Design decision not followed" 从 WARNING 改为 CRITICAL "Design decision violated"
- 新增 downgrade 条件："仅当偏离在代码注释中显式说明理由时降为 WARNING"
- 保持代码风格偏离为 SUGGESTION（不变）

#### Checks

- [x] C5 验证设计违背升级为 CRITICAL
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "三个验证维度" / Scenario "Coherence 维度升级设计违背为 CRITICAL"
  - Evidence: `src/core/templates/workflows/reviewer.ts` Coherence 段落
  - Expect: "issue CRITICAL \"Design decision violated\"" 且包含 downgrade 条件

### Task 4: 新增 Cleanliness 维度

**Goal**: 在 Coherence 之后、OPSX Alignment 之前插入 Cleanliness 维度（~45 行），采用工具无关设计，检测 5 类遗留物。

**Files**:
- Modify: `src/core/templates/workflows/reviewer.ts`
- Test: `test/skills/reviewer-cleanliness-dimension.test.ts`

**Requirements**:
- 插入位置：L141+（Coherence 段落之后）
- 包含 5 类检测目标：孤儿代码、过时 TODO、死 import、半迁移、不可达代码
- 采用工具无关检测策略：提供方法库而非强制协议
- Severity mapping：前 4 类 CRITICAL，不可达代码 WARNING
- 新增职责边界说明：Cleanliness 属于 Reviewer Phase 1 而非 Optimizer Phase 2

#### Checks

- [x] C6 验证 Cleanliness 维度结构
  - Verifies: `specs/reviewer-cleanliness-dimension/spec.md` / Requirement "Cleanliness 维度定义" / Scenario "检测重构后的孤儿代码"
  - Evidence: `src/core/templates/workflows/reviewer.ts` L141-186
  - Expect: 包含 "### Cleanliness" 标题和 5 类检测目标说明

- [x] C7 验证工具无关设计
  - Verifies: `specs/reviewer-cleanliness-dimension/spec.md` / Requirement "工具无关的检测策略" / Scenario "TypeScript 项目使用 tsc 检测死 import"
  - Evidence: `src/core/templates/workflows/reviewer.ts` Detection strategy 段落
  - Expect: 包含 "Possible approaches" 和 "Prioritize speed and reliability"，不包含硬编码的 "Run tsc"

- [x] C8 验证 severity mapping
  - Verifies: `specs/reviewer-cleanliness-dimension/spec.md` / Requirement "Cleanliness 维度定义" / Scenario "不可达代码降级为 WARNING"
  - Evidence: `src/core/templates/workflows/reviewer.ts` Severity mapping 段落
  - Expect: 孤儿代码/死 import/过时 TODO/半迁移 → CRITICAL，不可达代码 → WARNING

### Task 5: 扩展 summary schema

**Goal**: 在 reviewer.ts L176-178 的 summary 对象中增加 cleanliness 字段，包含 4 个计数器。

**Files**:
- Modify: `src/core/templates/workflows/reviewer.ts`
- Test: `test/skills/reviewer-summary-schema.test.ts`

**Requirements**:
- 在 coherence 字段之后插入 cleanliness 对象
- 结构：checked (boolean), orphanedCodeFound, deadImportsFound, staleTodosFound, halfMigrationsFound (数字)
- 更新 Output Contract 示例 JSON

#### Checks

- [x] C9 验证 summary schema 扩展
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "结构化输出合约" / Scenario "summary 包含 cleanliness 字段"
  - Evidence: `src/core/templates/workflows/reviewer.ts` Output Contract 段落的 JSON 示例
  - Expect: 包含 cleanliness 对象和 4 个计数器字段

### Task 6: 同步 verify-change.ts 文档

**Goal**: 将 verify-change.ts L292 的元规则表述从"prefer lower tier"改为"escalate when uncertain"。

**Files**:
- Modify: `src/core/templates/workflows/verify-change.ts`

**Requirements**:
- 删除 "when uncertain, prefer SUGGESTION over WARNING and WARNING over CRITICAL" 表述
- 替换为 "when uncertain, escalate to CRITICAL to enforce the 'clean slate' principle"

#### Checks

- [x] C10 验证 verify-change.ts 文档同步
  - Verifies: `specs/verify-prompt-orchestration/spec.md` / Requirement "语言一致性" / Scenario "删除 prefer lower tier 表述"
  - Evidence: `src/core/templates/workflows/verify-change.ts` L292
  - Expect: 包含 "escalate to CRITICAL"，不包含 "prefer lower tier"

### Task 7: 更新 openspec-reviewer-skill 规约文档

**Goal**: 同步 openspec/specs/openspec-reviewer-skill/spec.md 反映本次变更的所有行为改动。

**Files**:
- Modify: `openspec/specs/openspec-reviewer-skill/spec.md`

**Requirements**:
- 更新 "严重性阈值与证据标准" requirement 反映新的 philosophy 和 trigger
- 更新 "三个验证维度" requirement 改为四个维度，包含 Cleanliness
- 更新 "结构化输出合约" requirement 包含 cleanliness 字段

#### Checks

- [x] C11 验证规约文档同步
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "结构化输出合约" / Scenario "summary 包含 cleanliness 字段"
  - Evidence: `openspec/specs/openspec-reviewer-skill/spec.md`
  - Expect: 包含反映新 severity philosophy、四个维度和 cleanliness schema 的 requirement 内容

### Task 8: 集成测试验证严格性

**Goal**: 通过集成测试验证 reviewer 在遗留问题场景下的 CRITICAL 判定行为。

**Files**:
- Create: `test/integration/reviewer-strictness.test.ts`

**Requirements**:
- 模拟重构后孤儿代码场景，验证 CRITICAL 输出
- 模拟 scenario 未覆盖场景，验证 CRITICAL 输出
- 模拟设计违背场景，验证 CRITICAL 输出
- 模拟装饰性 drift 场景，验证 WARNING 降级
- 模拟过时 TODO 场景，验证 CRITICAL 输出

#### Checks

- [x] C12 验证孤儿代码检测
  - Verifies: `specs/reviewer-cleanliness-dimension/spec.md` / Requirement "Cleanliness 维度定义" / Scenario "检测重构后的孤儿代码"
  - Command: `pnpm test test/integration/reviewer-strictness.test.ts`
  - Expect: 孤儿代码场景测试通过，输出包含 CRITICAL "Dead code not removed"

- [x] C13 验证 scenario 未覆盖升级
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "三个验证维度" / Scenario "Correctness 维度升级 scenario 未覆盖为 CRITICAL"
  - Command: `pnpm test test/integration/reviewer-strictness.test.ts`
  - Expect: scenario 未覆盖场景测试通过，输出包含 CRITICAL "Scenario not covered"

- [x] C14 验证设计违背升级
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "三个验证维度" / Scenario "Coherence 维度升级设计违背为 CRITICAL"
  - Command: `pnpm test test/integration/reviewer-strictness.test.ts`
  - Expect: 设计违背场景测试通过，输出包含 CRITICAL "Design decision violated"
