### Task 1: Parser 支持三类验证锚点

**Goal**: `task-structure.ts` 解析 REMOVED 锚定语法变体与 `Preserves` 字段，保持现有 `Verifies` 语义零改动。

**Files**:
- Modify: `src/core/parsers/task-structure.ts`
- Test: `test/core/parsers/task-structure.test.ts`

**Requirements**:
- `parseVerifies` 接受 `REMOVED Requirement "<name>"` 形式（无 Scenario），普通形式仍强制 ≥1 个 Scenario
- `parseSpecRequirements` 索引 delta spec `## REMOVED Requirements` 区段的 names-only 条目，REMOVED 锚点交叉校验所指条目存在
- 新增 `Preserves` 字段解析：项目根相对 `openspec/specs/<cap>/spec.md` 路径 + Requirement + ≥1 Scenario，路径解析用 Node path API
- 新增独立 `isValidMainSpecPath` 仅服务 `Preserves` 分支，拒绝 change-local 路径、绝对路径、父目录穿越、反斜杠路径；`isValidChangeSpecPath` 不动
- 缺少 `Verifies` 但存在 `Preserves` 的 Check 视为已锚定

#### Checks

- [x] C1 验证 REMOVED 锚定语法解析与交叉校验
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenario "REMOVED 锚定的结构校验"
  - Command: `npx vitest run test/core/parsers/task-structure.test.ts`
  - Expect: 合法 REMOVED 锚定（无 Scenario）通过；所指 REMOVED 条目缺失时报错；普通 Verifies 缺 Scenario 仍报 `invalid-verifies-path`

- [x] C2 验证 Preserves 字段解析与路径白名单
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenario "Preserves 字段锚定主 spec 且跨平台解析"
  - Command: `npx vitest run test/core/parsers/task-structure.test.ts`
  - Expect: 主 spec 路径 + Requirement/Scenario 通过；change-local 路径、绝对路径、`..` 穿越、反斜杠路径被拒绝；Verifies 未被顺带放宽

### Task 2: Tasks 指令与模板支持删除/重构呈现

**Goal**: schema.yaml 任务转换规则补删除与重构等价检查映射，Files 标签加 `Delete:`，tasks 模板补删除任务示例。

**Files**:
- Modify: `schemas/spec-driven/schema.yaml`
- Modify: `schemas/spec-driven/templates/tasks.md`
- Modify: `src/core/templates/fragments/opsx-fragments.ts`
- Test: `test/commands/artifact-workflow.test.ts`

**Requirements**:
- 转换规则新增：删除工作 → `Verifies: ... REMOVED Requirement` 锚定 + 缺失断言 Command；重构等价检查 → `Preserves` 锚定 + Expect 点名旧形态
- Files 标签清单加 `Delete:`，生成面改动以目录粒度声明的指引
- 缺失断言按非运行时快速路径处理（Command 输出为最终证据）写入 tasks/apply 指令
- tasks 模板增加含 `Delete:` 与 REMOVED Check 的删除任务示例
- propose 结构检查 fragment 描述与 parser 新语法同步

#### Checks

- [ ] C3 验证 tasks 指令包含删除与重构转换规则
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenario "Tasks instructions convert vague work into testable goals", "Files 支持 Delete 声明"
  - Command: `npx vitest run test/commands/artifact-workflow.test.ts`
  - Expect: `openspec instructions tasks --json` 的 instruction 包含 REMOVED 锚定删除规则、Preserves 等价检查规则与 `Delete:` 标签

- [ ] C4 验证缺失断言走非运行时快速路径
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenario "Tasks instructions allow non-runtime text fast path"
  - Command: `npx vitest run test/commands/artifact-workflow.test.ts`
  - Expect: instruction 声明缺失断言以 Command 输出为最终证据、不要求人为 red/green

### Task 3: Reviewer 模板分派判定与规格外检测

**Goal**: reviewer 模板按锚点类型分派判定模式，Completeness 加 `Delete:` 核对，Cleanliness 加规格外改动检测，输出 schema additive 扩展。

**Files**:
- Modify: `src/core/templates/workflows/reviewer.ts`
- Test: `test/skills/reviewer-skill-content.test.ts`
- Test: `test/skills/reviewer-cleanliness-dimension.test.ts`
- Test: `test/skills/reviewer-summary-schema.test.ts`

**Requirements**:
- Correctness 增加缺失性判定（REMOVED → 多角度搜索 → 引用空结果或残留 → 残留即 CRITICAL）与双支等价性判定（测试证据 ∧ 旧形态消失，并存即 CRITICAL）
- Completeness 增加 `Delete:` 声明 vs `git diff <originalBranch>...HEAD` 逐项核对，未删即 CRITICAL
- Cleanliness 增加规格外改动检测：归因宇宙（Files 条目含目录、Check 证据文件、change 工件）、行为代码 CRITICAL、良性降级、不确定升级
- `summary.cleanliness` 增加 `unaccountedChangesFound`；`writeBackPlan.taskLine` 对规格外发现允许 `null` 且 action 为 `append_remediation`
- 归因匹配将两侧路径规范化为 POSIX 相对路径后比较

#### Checks

- [ ] C5 验证 reviewer 模板包含三类判定与 Delete 核对
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "三个验证维度" / Scenario "缺失性判定要求多角度搜索后引用证据", "等价性判定不接受仅测试证据", "Delete 声明与 git diff 逐项核对"
  - Command: `npx vitest run test/skills/reviewer-skill-content.test.ts`
  - Expect: 模板文本含缺失性判定协议、双支等价判定、Delete 核对规则

- [ ] C6 验证规格外改动检测与归因宇宙
  - Verifies: `specs/reviewer-cleanliness-dimension/spec.md` / Requirement "规格外改动检测" / Scenario "无法归因的行为代码升级为 CRITICAL", "机械性良性改动降级", "生成面以目录粒度归因", "跨平台路径归因"
  - Command: `npx vitest run test/skills/reviewer-cleanliness-dimension.test.ts`
  - Expect: 模板含归因宇宙显式列表定义、严重级别分派与 POSIX 规范化比较要求

- [ ] C7 验证 writeBackPlan 对规格外发现的扩展
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "结构化输出合约" / Scenario "规格外发现的 writeBackPlan 条目", "summary 包含 cleanliness 字段"
  - Command: `npx vitest run test/skills/reviewer-summary-schema.test.ts`
  - Expect: taskLine 可空仅限规格外发现条目且 action 为 append_remediation

- [ ] C11 验证 cleanliness 计数器扩展
  - Verifies: `specs/reviewer-cleanliness-dimension/spec.md` / Requirement "Cleanliness summary schema 扩展" / Scenario "规格外改动计入计数器", "完整 cleanliness 检查输出"
  - Command: `npx vitest run test/skills/reviewer-summary-schema.test.ts`
  - Expect: schema 含 `unaccountedChangesFound` 且计数反映检测结果

### Task 4: Verify 模板双骨架同步判定语义

**Goal**: verify-change 模板的 subagent 与 reread 两套骨架同步三类锚点判定语义与 Completeness 扩展。

**Files**:
- Modify: `src/core/templates/workflows/verify-change.ts`
- Test: `test/skills/verify-change-strictness.test.ts`

**Requirements**:
- Phase 1 协议文本包含按锚点类型分派（存在性/缺失性/等价性）的判定语义
- Spec coverage 措辞从纯存在性搜索改为按锚定类型核查（REMOVED → 缺失确认）
- subagent 骨架与 reread 骨架同步同一语义，不出现单骨架遗漏

#### Checks

- [ ] C8 验证 verify 模板双骨架包含 Correctness 分派判定
  - Verifies: `specs/opsx-verify-skill/spec.md` / Requirement "Correctness Verification" / Scenario "REMOVED requirement 的缺失性判定", "Preserves 锚点的双支等价性判定"
  - Command: `npx vitest run test/skills/verify-change-strictness.test.ts`
  - Expect: 两套骨架模板文本均含缺失性判定与双支等价性判定语义

- [ ] C12 验证 verify 模板双骨架包含 Completeness 扩展
  - Verifies: `specs/opsx-verify-skill/spec.md` / Requirement "Completeness Verification" / Scenario "Spec coverage check", "Delete 声明核对"
  - Command: `npx vitest run test/skills/verify-change-strictness.test.ts`
  - Expect: 两套骨架模板文本均含按锚定类型核查的 spec coverage 与 Delete 核对语义

### Task 5: Skill 再生成与全链路回归

**Goal**: 模板改动经 skill-generation 管线再生成各工具适配器，全量测试与 change validation 通过。

**Files**:
- Modify: `.claude/skills/openspec-reviewer/SKILL.md`
- Test: `test/integration/reviewer-strictness.test.ts`

**Requirements**:
- reviewer/verify 模板改动后运行 skill 再生成，生成面与模板一致
- 全量现有测试通过，现有 `Verifies` 合约与 reviewer 严格性测试零语义改动
- Windows CI 通过（Preserves 路径解析与归因路径规范化涉及跨平台行为）

#### Checks

- [ ] C9 验证生成面一致性与集成回归
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "三个验证维度" / Scenario "完整制品的变更"
  - Command: `npx vitest run test/integration/reviewer-strictness.test.ts test/skills/`
  - Expect: 再生成后的 skill 文件与模板一致，集成与 skill 测试全部通过

- [ ] C10 验证全量回归与 change 结构
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenario "Verifies path remains change-local and cross-platform"
  - Command: `pnpm test`
  - Expect: 全量测试通过（含 Windows 路径行为相关用例）；现有 Verifies 拒绝主 spec 路径的用例不变
