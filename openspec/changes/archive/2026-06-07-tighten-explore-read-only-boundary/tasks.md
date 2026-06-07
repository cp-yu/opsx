### Task 1: 增加 explore 边界模板测试

**Goal**: 用正向断言锁定 explore read-only 边界和 sweeper 写例外。

**Files**:
- Test: `test/core/templates/explore-template.test.ts`

**Requirements**:
- 测试 SHALL 覆盖 main explore agent 只读语义。
- 测试 SHALL 覆盖用户确认设计方向不是文件写入授权。
- 测试 SHALL 覆盖 `openspec-impact-sweeper` 是唯一 `openspec/sweeper/` JSON report 写例外。
- 测试 SHALL 使用必须包含的正向断言，不增加旧文案不存在的否定断言。

#### Checks

- [x] C1 验证只读和确认边界测试
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 主代理保持只读" / Scenario "Explore 不写入制品"; Requirement "设计确认不是写入授权" / Scenario "用户确认方案"
  - Command: `npx vitest run test/core/templates/explore-template.test.ts`
  - Expect: explore template tests 通过，并断言必要的只读和确认边界文案。

- [x] C2 验证 sweeper 写例外测试
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 主代理保持只读" / Scenario "Impact sweeper 是 explore 唯一写例外"; `specs/ai-workflow-templates/spec.md` / Requirement "Explore invokes impact sweeper" / Scenario "Sweeper report 写入不授权 explore 写入"
  - Command: `npx vitest run test/core/templates/explore-template.test.ts`
  - Expect: explore template tests 通过，并断言 subagent JSON report 例外不赋予 main explore agent 写权限。

### Task 2: 收紧 canonical explore workflow template

**Goal**: 更新 canonical explore skill 和 command template，使 explore 主代理保持 read-only，并把 active-change insight 路由为 future capture target。

**Files**:
- Modify: `src/core/templates/workflows/explore.ts`
- Test: `test/core/templates/explore-template.test.ts`

**Requirements**:
- Hard Rules SHALL 声明 main explore agent 保持只读。
- Command template SHALL 将 explore 描述为思考而不是写入。
- 用户选择方案或确认段落 SHALL 只表示设计方向。
- Existing Changes guidance SHALL 使用 Future Capture Target 语义。
- Generated surface refresh SHALL 保持在本任务范围之外。

#### Checks

- [x] C3 验证 canonical template 只读文案
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 主代理保持只读" / Scenario "Explore 不写入制品"
  - Command: `npx vitest run test/core/templates/explore-template.test.ts`
  - Expect: template tests 针对 `src/core/templates/workflows/explore.ts` 通过。

- [x] C4 验证 active-change future capture routing
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 捕获边界保持 specs 为可观察行为" / Scenario "可观察行为进入 specs"; Scenario "重构和实现决策进入 design"; Scenario "其他 insight 路由到对应制品"
  - Command: `npx vitest run test/core/templates/explore-template.test.ts`
  - Expect: template tests 通过，并且 active-change guidance 将 insights 路由到 future capture targets，而不是 explore 直接编辑。

### Task 3: 校验 proposal artifacts

**Goal**: 确认本 change 的 specs、design、tasks 和 OPSX delta 与收紧后的 explore/propose 边界一致。

**Files**:
- Create: `openspec/changes/tighten-explore-read-only-boundary/proposal.md`
- Create: `openspec/changes/tighten-explore-read-only-boundary/design.md`
- Create: `openspec/changes/tighten-explore-read-only-boundary/specs/explore-brainstorming/spec.md`
- Create: `openspec/changes/tighten-explore-read-only-boundary/specs/ai-workflow-templates/spec.md`
- Create: `openspec/changes/tighten-explore-read-only-boundary/tasks.md`
- Create: `openspec/changes/tighten-explore-read-only-boundary/opsx-delta.yaml`

**Requirements**:
- Delta specs SHALL 表达可观察 prompt 行为和约束。
- Design SHALL 承载理由、非目标和 generated-surface refresh 决策。
- OPSX delta SHALL only modify existing affected capability intents.

#### Checks

- [x] C5 验证 change artifacts
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Explore invokes impact sweeper" / Scenario "Proposal readiness 需要 sweep"; Scenario "Sweeper report 写入不授权 explore 写入"
  - Command: `openspec validate "tighten-explore-read-only-boundary" --type change --json`
  - Expect: validation 不报告阻塞性结构错误；若有 warnings，则审查一次。
