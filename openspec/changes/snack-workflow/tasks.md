### Task 1: WorkflowManifestRegistry 注册 snack

**Goal**: 在 WorkflowManifestRegistry 中注册 snack workflow manifest entry，使其成为第 6 个核心工作流

**Files**:
- Modify: `src/core/templates/manifest/registry.ts`

**Requirements**:
- 在 MANIFEST_ENTRIES 数组中添加 snack entry
- 设置 workflowId 为 'snack'，modeMembership 为 ['core']
- 配置 skillDirName、skillName、commandSlug 为 'openspec-snack' 和 'snack'
- 设置 promptMeta 描述为快速同步工作流

#### Checks

- [x] C1 验证 snack manifest entry 已注册
  - Verifies: `specs/snack-workflow-manifest/spec.md` / Requirement "WorkflowManifestRegistry 注册 snack" / Scenario "注册 snack manifest entry"
  - Command: `grep -A 10 "workflowId: 'snack'" src/core/templates/manifest/registry.ts`
  - Expect: snack entry 包含 modeMembership: ['core']、skillDirName: 'openspec-snack'、commandSlug: 'snack'

- [x] C2 验证 6 个工作流架构
  - Verifies: `specs/snack-workflow-manifest/spec.md` / Requirement "6 个工作流架构" / Scenario "init 安装 6 个工作流"
  - Command: `pnpm test src/core/templates/manifest/registry.ts`
  - Expect: registry 测试通过，MANIFEST_ENTRIES.length === 6

### Task 2: 实现 snack skill 模板函数

**Goal**: 实现 getSnackSkillTemplate 和 getOpsxSnackCommandTemplate 函数，生成 snack skill 文件

**Files**:
- Modify: `src/core/templates/skill-templates.ts`

**Requirements**:
- getSnackSkillTemplate 返回 snack skill 内容（包含 OPSX 上下文加载、git diff 分析、specs 生成逻辑）
- getOpsxSnackCommandTemplate 返回 command 模板或 undefined（snack 为 skill-only）
- skill 文件 instructions 不超过 200 行
- 包含明确说明不生成 tasks.md 的逻辑
- 复用 explore/propose/apply 的共享 OPSX 上下文片段

#### Checks

- [x] C3 验证 getSnackSkillTemplate 函数存在
  - Verifies: `specs/snack-skill-generation/spec.md` / Requirement "snack skill 纳入生成管线" / Scenario "生成 snack skill 文件"
  - Command: `grep -A 5 "export.*getSnackSkillTemplate" src/core/templates/skill-templates.ts`
  - Expect: 函数导出存在

- [x] C4 验证生成的 skill 文件长度
  - Verifies: `specs/snack-skill-generation/spec.md` / Requirement "snack skill 纳入生成管线" / Scenario "skill 文件长度验证"
  - Command: `pnpm exec openspec update && wc -l .claude/skills/openspec-snack/SKILL.md`
  - Expect: instructions 部分不超过 200 行

### Task 3: 验证 snack skill 基本流程

**Goal**: 验证生成的 snack skill 包含所有必需的逻辑组件

**Files**:
- Test: `.claude/skills/openspec-snack/SKILL.md`

**Requirements**:
- skill 包含输入检测逻辑（change-name 可选）
- 包含 OPSX 上下文加载指令
- 包含 git diff 分析、code-map 反查步骤
- 包含 specs 生成策略（中层推断）和 OPSX delta 启发式规则
- 明确说明不生成 tasks.md

#### Checks

- [x] C5 验证 skill 包含 OPSX 上下文加载
  - Verifies: `specs/snack-skill/spec.md` / Requirement "OPSX 上下文加载" / Scenario "读取 OPSX 项目架构"
  - Command: `grep -i "project.opsx.yaml" .claude/skills/openspec-snack/SKILL.md`
  - Expect: skill 包含读取 project.opsx.yaml 的指令

- [x] C6 验证 skill 包含 git diff 分析
  - Verifies: `specs/snack-skill/spec.md` / Requirement "Git diff 分析" / Scenario "获取修改文件列表"
  - Command: `grep -i "git diff" .claude/skills/openspec-snack/SKILL.md`
  - Expect: skill 包含 git diff 命令指令

- [x] C7 验证 skill 包含 code-map 反查
  - Verifies: `specs/snack-skill/spec.md` / Requirement "Code-map 反查" / Scenario "文件路径映射到 capabilities"
  - Command: `grep -i "code-map" .claude/skills/openspec-snack/SKILL.md`
  - Expect: skill 包含读取 code-map.yaml 的指令

- [x] C8 验证 skill 明确不生成 tasks.md
  - Verifies: `specs/snack-skill/spec.md` / Requirement "不生成 tasks.md" / Scenario "跳过 tasks.md 生成"
  - Command: `grep -i "不生成.*tasks\|skip.*tasks" .claude/skills/openspec-snack/SKILL.md`
  - Expect: skill 明确说明不生成 tasks.md

### Task 4: 验证 snack 输出提示逻辑

**Goal**: 验证 snack skill 包含完成路径和修正路径的输出提示

**Files**:
- Test: `.claude/skills/openspec-snack/SKILL.md`

**Requirements**:
- 输出提示包含快速路径（sync/archive --no-verify）
- 输出提示包含修正路径（审查 change、修改代码、再次 snack）
- 标记 [REVIEW NEEDED] 不确定部分

#### Checks

- [x] C9 验证输出包含快速路径提示
  - Verifies: `specs/snack-skill/spec.md` / Requirement "输出提示包含双路径" / Scenario "输出完成路径提示"
  - Command: `grep -i "sync.*--no-verify\|archive.*--no-verify" .claude/skills/openspec-snack/SKILL.md`
  - Expect: skill 输出提示包含 sync 和 archive 的 --no-verify 选项

- [x] C10 验证输出包含修正路径提示
  - Verifies: `specs/snack-skill/spec.md` / Requirement "输出提示包含双路径" / Scenario "输出修正路径提示"
  - Command: `grep -i "REVIEW NEEDED\|再次.*snack" .claude/skills/openspec-snack/SKILL.md`
  - Expect: skill 输出提示包含审查和迭代指引

### Task 5: 集成测试 - 完整 snack 工作流

**Goal**: 端到端测试 snack skill 生成和调用流程

**Files**:
- Test: `test/integration/snack-workflow.test.ts`

**Requirements**:
- 测试 openspec init 安装 6 个工作流（包含 snack）
- 测试 openspec update 刷新 snack skill 文件
- 验证生成的 skill 文件结构完整

#### Checks

- [ ] C11 验证 init 安装 6 个工作流
  - Verifies: `specs/snack-workflow-manifest/spec.md` / Requirement "6 个工作流架构" / Scenario "init 安装 6 个工作流"
  - Command: `pnpm test test/integration/snack-workflow.test.ts`
  - Expect: 测试通过，验证 6 个 skill 目录存在

- [ ] C12 验证 update 刷新 snack skill
  - Verifies: `specs/snack-workflow-manifest/spec.md` / Requirement "6 个工作流架构" / Scenario "update 刷新 6 个工作流"
  - Command: `pnpm test test/integration/snack-workflow.test.ts`
  - Expect: 测试通过，验证 snack skill 文件被正确刷新
