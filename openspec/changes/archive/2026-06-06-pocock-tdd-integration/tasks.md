### Task 1: Apply SKILL.md 增加 TDD Checkpoint 1 (接口设计可测试性)

**Goal**: 在 Apply Master Agent 读取任务后、编写测试前，嵌入接口设计可测试性检查点。

**Files**:
- Modify: `.claude/skills/openspec-apply-change/SKILL.md`
- Test: `test/core/templates/apply-change.test.ts`

**Requirements**:
- 在第 117 行后（读取 Goal, Files, Requirements, Checks 之后）插入 Checkpoint 1 段落
- 包含 3 个评估标准：依赖注入、返回值模式、接口面积最小化
- 违反原则时要求调整接口设计再继续

#### Checks

- [x] C1 验证 Checkpoint 1 内容已插入
  - Verifies: `specs/tdd-apply-checkpoints/spec.md` / Requirement "接口设计可测试性检查" / Scenario "依赖注入检查通过"
  - Evidence: `.claude/skills/openspec-apply-change/SKILL.md`
  - Expect: 第 117 行后包含 "TDD Checkpoint 1: Interface Design for Testability" 段落

- [x] C2 验证 Checkpoint 1 包含完整检查标准
  - Verifies: `specs/tdd-apply-checkpoints/spec.md` / Requirement "接口设计可测试性检查" / Scenario "副作用检查失败"
  - Evidence: `.claude/skills/openspec-apply-change/SKILL.md`
  - Expect: Checkpoint 1 包含依赖注入、返回值、接口面积 3 项标准

### Task 2: Apply SKILL.md 增加 TDD Checkpoint 2 (测试质量标准)

**Goal**: 在 Apply Master Agent 编写测试后、进入 RED 前，嵌入测试质量标准验证检查点。

**Files**:
- Modify: `.claude/skills/openspec-apply-change/SKILL.md`
- Test: `test/core/templates/apply-change.test.ts`

**Requirements**:
- 在第 123 行后（添加/更新测试之后）插入 Checkpoint 2 段落
- 包含 4 个质量标准：公共接口、无内部 mock、单断言、重构存活
- 违反标准时要求重写测试再进入 RED

#### Checks

- [x] C3 验证 Checkpoint 2 内容已插入
  - Verifies: `specs/tdd-apply-checkpoints/spec.md` / Requirement "测试质量标准验证" / Scenario "公共接口测试通过"
  - Evidence: `.claude/skills/openspec-apply-change/SKILL.md`
  - Expect: 第 123 行后包含 "TDD Checkpoint 2: Test Quality Standards" 段落

- [x] C4 验证 Checkpoint 2 包含完整质量标准
  - Verifies: `specs/tdd-apply-checkpoints/spec.md` / Requirement "测试质量标准验证" / Scenario "内部 mock 检查失败"
  - Evidence: `.claude/skills/openspec-apply-change/SKILL.md`
  - Expect: Checkpoint 2 包含公共接口、无内部 mock、单断言、重构存活 4 项标准

### Task 3: Apply SKILL.md 嵌入 TDD Checkpoint 3 (Mock 边界约束)

**Goal**: 在 Apply Master Agent 实现代码时，嵌入 Mock 边界约束强制机制。

**Files**:
- Modify: `.claude/skills/openspec-apply-change/SKILL.md`
- Test: `test/core/templates/apply-change.test.ts`

**Requirements**:
- 在第 125 行内（实现最小化代码步骤）嵌入 Checkpoint 3 段落
- 包含 3 个约束规则：仅系统边界、禁止内部 mock、依赖注入
- 违反约束时要求停止并重构接口

#### Checks

- [x] C5 验证 Checkpoint 3 内容已嵌入
  - Verifies: `specs/tdd-apply-checkpoints/spec.md` / Requirement "Mock 边界约束强制" / Scenario "外部 API mock 允许"
  - Evidence: `.claude/skills/openspec-apply-change/SKILL.md`
  - Expect: 第 125 行内包含 "TDD Checkpoint 3: Mock Boundary Enforcement" 段落

- [x] C6 验证 Checkpoint 3 包含完整约束规则
  - Verifies: `specs/tdd-apply-checkpoints/spec.md` / Requirement "Mock 边界约束强制" / Scenario "内部模块 mock 拒绝"
  - Evidence: `.claude/skills/openspec-apply-change/SKILL.md`
  - Expect: Checkpoint 3 包含系统边界、禁止内部 mock、依赖注入 3 项规则

### Task 4: Optimizer SKILL.md 增强现有 5 维度识别指标

**Goal**: 为 Optimizer "What to Improve" 章节现有 5 个维度增加具体的代码坏味道识别指标。

**Files**:
- Modify: `.claude/skills/openspec-optimizer/SKILL.md`
- Test: `test/skills/optimizer-skill-content.test.ts`

**Requirements**:
- 修改第 79-87 行 "What to Improve" 章节
- 为重复消除、结构简化、控制流清晰、局部性优化、冗余移除 5 个维度分别增加 "Code smell indicators"
- 保持原有维度优先级顺序不变

#### Checks

- [x] C7 验证重复消除增强指标
  - Verifies: `specs/tdd-optimizer-smells/spec.md` / Requirement "重复消除增强指标" / Scenario "识别相同验证逻辑"
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: "Lower duplication" 维度包含识别指标：相同逻辑块、复制粘贴验证、重复错误处理

- [x] C8 验证局部性优化增强指标
  - Verifies: `specs/tdd-optimizer-smells/spec.md` / Requirement "局部性优化增强指标" / Scenario "识别 Feature Envy"
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: "Better locality" 维度包含 Feature Envy 指标：主要操作他类数据、getter 链、逻辑错位

### Task 5: Optimizer SKILL.md 新增长方法拆分维度

**Goal**: 在 Optimizer "What to Improve" 章节新增第 6 维度：长方法拆分检测。

**Files**:
- Modify: `.claude/skills/openspec-optimizer/SKILL.md`
- Test: `test/skills/optimizer-skill-content.test.ts`

**Requirements**:
- 在第 87 行后新增维度 6 "Break long methods"
- 包含识别指标：方法超过 30 行
- 包含重构模式：提取私有辅助方法、保持公共接口不变

#### Checks

- [x] C9 验证长方法维度已新增
  - Verifies: `specs/tdd-optimizer-smells/spec.md` / Requirement "长方法拆分检测" / Scenario "检测到 40 行方法"
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: "What to Improve" 包含维度 6 "Break long methods"

- [x] C10 验证长方法重构模式完整
  - Verifies: `specs/tdd-optimizer-smells/spec.md` / Requirement "长方法拆分检测" / Scenario "拆分后保持接口不变"
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: 维度 6 包含提取私有方法、保持接口不变的重构模式说明

### Task 6: Optimizer SKILL.md 新增浅模块加深维度

**Goal**: 在 Optimizer "What to Improve" 章节新增第 7 维度：浅模块加深检测。

**Files**:
- Modify: `.claude/skills/openspec-optimizer/SKILL.md`
- Test: `test/skills/optimizer-skill-content.test.ts`

**Requirements**:
- 在维度 6 后新增维度 7 "Deepen shallow modules"
- 包含评估标准：方法数、参数复杂度、内部复杂度
- 包含行动策略：合并浅模块、下推复杂度、简化 API

#### Checks

- [x] C11 验证浅模块维度已新增
  - Verifies: `specs/tdd-optimizer-smells/spec.md` / Requirement "浅模块加深检测" / Scenario "检测到单方法类"
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: "What to Improve" 包含维度 7 "Deepen shallow modules"

- [x] C12 验证浅模块评估标准完整
  - Verifies: `specs/tdd-optimizer-smells/spec.md` / Requirement "浅模块加深检测" / Scenario "合并相关浅模块"
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: 维度 7 包含方法数、参数复杂度、内部复杂度 3 项评估标准

### Task 7: Optimizer SKILL.md 新增原始类型痴迷消除维度

**Goal**: 在 Optimizer "What to Improve" 章节新增第 8 维度：原始类型痴迷消除检测。

**Files**:
- Modify: `.claude/skills/openspec-optimizer/SKILL.md`
- Test: `test/skills/optimizer-skill-content.test.ts`

**Requirements**:
- 在维度 7 后新增维度 8 "Eliminate primitive obsession"
- 包含候选类型：Email、货币、日期范围、标识符
- 包含值对象化收益说明：验证封装、类型安全、自文档化

#### Checks

- [x] C13 验证原始类型痴迷维度已新增
  - Verifies: `specs/tdd-optimizer-smells/spec.md` / Requirement "原始类型痴迷消除检测" / Scenario "检测到 Email 字符串"
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: "What to Improve" 包含维度 8 "Eliminate primitive obsession"

- [x] C14 验证原始类型痴迷候选类型完整
  - Verifies: `specs/tdd-optimizer-smells/spec.md` / Requirement "原始类型痴迷消除检测" / Scenario "检测到货币金额原始类型"
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: 维度 8 包含 Email、货币、日期范围、标识符候选类型

### Task 8: Optimizer SKILL.md 增加坏味道类型标注要求

**Goal**: 在 Optimizer 输出契约中增加坏味道类型标注要求。

**Files**:
- Modify: `.claude/skills/openspec-optimizer/SKILL.md`
- Test: `test/skills/optimizer-skill-content.test.ts`

**Requirements**:
- 在 "Output Contract" 章节的 "Response B: Search/Replace Blocks" 部分增加标注格式说明
- 定义坏味道类型枚举：Duplication、Long Method、Shallow Module、Feature Envy、Primitive Obsession、Deep Nesting、Dead Code
- 要求每个 block 前添加 `<!-- Code Smell: <type> -->` 注释

#### Checks

- [x] C15 验证坏味道标注格式已添加
  - Verifies: `specs/tdd-optimizer-smells/spec.md` / Requirement "坏味道类型标注" / Scenario "标注重复消除 block"
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: "Output Contract" 包含坏味道标注格式说明和示例

- [x] C16 验证坏味道类型枚举完整
  - Verifies: `specs/tdd-optimizer-smells/spec.md` / Requirement "坏味道类型标注" / Scenario "标注原始类型痴迷 block"
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: 标注格式包含 7 种坏味道类型枚举
