## Context

OpenSpec 当前采用 Design-Driven Development（DDD）模式：先写 specs，再直接实现。主 agent 直接编写代码，缺乏 Test-First 纪律和子代理隔离执行。Superpowers 采用 Test-Driven Development（TDD）+ Subagent-Driven Development 模式：每个任务由独立 subagent 执行，强制 test-first 循环。

本设计将 Superpowers 的核心能力融合到 OpenSpec 中，保持 OpenSpec 的制品结构（`openspec/changes/<name>/`），但增强其执行能力。

**当前状态：**
- Explore：开放式思考，无结构化流程
- Propose：直接生成制品，无设计澄清阶段
- Apply：主 agent 直接实现，tasks.md 是粗粒度 Actions/Checks
- Verify：两阶段门禁（Phase 1 correctness + Phase 2 optimization）

**目标状态：**
- Explore：集成 brainstorming 6 步流程，强制设计前置
- Propose：智能判断是否需要 explore，从 Design Summary 生成制品
- Apply：Master agent 拆解任务 → Implementer subagent 执行 TDD 循环
- Verify：保持现有两阶段门禁

## Goals / Non-Goals

**Goals:**
- 增强 explore 为 brainstorming，提供结构化的需求澄清和设计流程
- 改造 apply 为 TDD + subagent 驱动模型，提升代码质量
- 保持 OpenSpec 制品结构和工作流哲学
- 支持分支隔离和 worktree，保护 main 分支
- 渐进式融合，不破坏现有用户体验

**Non-Goals:**
- 不改变 OpenSpec 的制品目录结构（不迁移到 `docs/superpowers/`）
- 不引入 Comet 的 `.comet.yaml` 状态机（使用 OpenSpec 现有的 status 推断）
- 不强制所有变更都必须 explore（保持灵活性）
- 不移除现有的 verify 门禁（保持两阶段验证）

## Decisions

### Decision 1: Explore 增强策略

**选择：** 增强现有 `/opsx:explore`，集成 brainstorming 流程，但不写文件

**理由：**
- 保持 explore 的"思考模式"定位
- 设计结论存在对话上下文中，不污染 change 目录
- 强制同会话调用 propose（确保设计新鲜度）

**替代方案：**
- 方案 A：Explore 写 design.md → 拒绝，未定型内容不应落盘
- 方案 B：创建新的 `/opsx:design` 命令 → 拒绝，增加用户心智负担

**实现：**
- 更新 `.claude/commands/opsx/explore.md` 模板
- 添加 brainstorming checklist（6 步）
- 添加 Design Summary 格式模板
- 添加智能判断逻辑（详细输入可跳过）

### Decision 2: Propose 智能路由

**选择：** Propose 检测 explore 上下文，根据输入详细程度决定是否需要 explore

**判断标准：**
```typescript
interface InputComplexity {
  hasExploreContext: boolean;
  inputLength: number;
  hasTechStack: boolean;
  hasDataModel: boolean;
  hasApiEndpoints: boolean;
  hasTestStrategy: boolean;
}

function shouldSkipExplore(input: InputComplexity): boolean {
  if (input.hasExploreContext) return true;
  
  const detailScore = [
    input.hasTechStack,
    input.hasDataModel,
    input.hasApiEndpoints,
    input.hasTestStrategy
  ].filter(Boolean).length;
  
  return input.inputLength > 100 && detailScore >= 3;
}
```

**理由：**
- 平衡纪律性和灵活性
- 详细输入不需要重复澄清
- 简单输入强制 explore（防止跳过设计）

### Decision 3: Tasks.md 格式转换

**选择：** 从 Actions/Checks 结构转为粗粒度 Goal/Files/Requirements/Checks 结构

**新格式：**
```markdown
### Task 1: 用户注册 API

**Goal**: 实现用户注册功能，支持邮箱+密码注册

**Files**:
- Create: `src/routes/auth.ts`
- Modify: `src/app.ts`
- Test: `tests/auth.test.ts`

**Requirements**:
- 接受 POST /auth/register
- 验证邮箱格式
- 密码使用 bcrypt 加密

#### Checks
- [ ] C1: 注册功能验证
  - Verifies: specs/auth/spec.md#Requirement-1#Scenario-1
  - Command: npm test auth.test.ts
```

**理由：**
- 粗粒度任务便于 Master agent 拆解
- 保留 Checks 与 verify 门禁集成
- 明确 Goal 和 Requirements，便于 subagent 理解

**迁移策略：**
- 新变更使用新格式
- 现有变更保持兼容（解析器支持两种格式）
- 提供迁移工具（可选）

### Decision 4: Apply 三层架构

**选择：** Master Agent（Coordinator）+ Implementer Subagent（Executor）+ Reviewer/Optimizer Subagent（Verifier）

**架构：**
```
Master Agent (当前 agent，capable model)
  ├─ 读取粗粒度 tasks.md
  ├─ 探索项目上下文
  ├─ 拆解为详细 TDD 步骤（多个 TDD Cycle）
  ├─ 写入 .apply-steps/task-N-<name>.md
  └─ Dispatch implementer subagent (cheap model)
       ├─ 读取详细步骤文件
       ├─ 机械执行 TDD 循环
       └─ 报告状态（DONE/BLOCKED/NEEDS_CONTEXT）
```

**理由：**
- Master agent 保持全局上下文和任务间协调
- Implementer subagent 保持 fresh context，避免污染
- Cheap model 执行详细步骤，成本可控
- 总成本 = 1 × capable + N × cheap（N = 任务数）

**替代方案：**
- 方案 A：主 agent 直接实现 → 拒绝，缺乏 TDD 纪律
- 方案 B：Propose 生成详细步骤 → 拒绝，无法基于实际项目状态

### Decision 5: 详细步骤文件存储

**选择：** 写入 `.apply-steps/task-N-<name>.md`，archive 时删除

**格式：**
```markdown
# Task 1: 用户注册 API - Detailed TDD Steps

## TDD Cycle 1: Basic Registration Endpoint

### Step 1: Write Failing Test
**File**: `tests/auth.test.ts`
```typescript
[完整测试代码]
```

### Step 2: Run Test (Verify Fails)
**Command**: `npm test tests/auth.test.ts`
**Expected**: FAIL - route not defined
**Checkpoint**: Test MUST fail

### Step 3: Implement Minimal Code
**File**: `src/routes/auth.ts`
```typescript
[完整实现代码]
```

### Step 4: Run Test (Verify Passes)
**Command**: `npm test tests/auth.test.ts`
**Expected**: PASS
**Checkpoint**: Test MUST pass

### Step 5: Commit
```bash
git add tests/auth.test.ts src/routes/auth.ts
git commit -m "feat(auth): add basic registration endpoint"
```
```

**理由：**
- 可追溯（调试时可查看 Master agent 的拆解）
- 不污染 tasks.md（保持简洁）
- Archive 时删除（实现细节不需要归档）

### Decision 6: 分支隔离策略

**选择：** 可选隔离，检测 main/master 时询问用户

**流程：**
```
/opsx:apply
  ↓
检测当前分支
  ↓
如果在 main/master:
  询问："建议在 feature 分支上工作。"
  选项：
    - 创建新分支 <change-name>
    - 创建 worktree（调用 using-git-worktrees skill）
    - 当前分支继续（不推荐）
  ↓
执行隔离
  ↓
实现（每个 TDD cycle commit）
```

**理由：**
- 保护 main 分支（每个 TDD cycle 都 commit）
- 灵活性（用户可以选择不隔离）
- 支持 worktree（并行开发场景）

**Worktree 集成：**
- 直接集成 Superpowers 的 `using-git-worktrees` skill
- 作为可选依赖（如果 skill 不存在，只支持分支隔离）

### Decision 7: Implementer Subagent Prompt Contract

**选择：** 简化版 prompt，只需机械执行详细步骤

**Prompt 结构：**
```markdown
You are implementing a task from an OpenSpec change.

## Task Details
[从详细步骤文件读取]

## Your Job
1. Read the detailed TDD steps file at: <path>
2. Execute each TDD Cycle in order
3. For each step:
   - Copy code to file
   - Run command
   - Verify checkpoint (Step 2: MUST fail, Step 4: MUST pass)
4. Report status: DONE / BLOCKED / NEEDS_CONTEXT

## Checkpoints
- Step 2: Test MUST fail (proves test is valid)
- Step 4: Test MUST pass (proves implementation works)
- If checkpoint fails, report BLOCKED immediately
```

**理由：**
- 简单明确（cheap model 可以执行）
- 强制 checkpoint 验证（确保 TDD 纪律）
- 明确的失败处理（BLOCKED 时 Master agent 介入）

## Risks / Trade-offs

### Risk 1: 成本增加

**风险：** 每个任务都 dispatch subagent，成本可能增加

**缓解：**
- Implementer 使用 cheap model（Haiku 级别）
- Master agent 只有一个（capable model）
- 总成本 = 1 × capable + N × cheap，N 通常 < 10
- 质量提升带来的长期收益（减少 bug 修复成本）

### Risk 2: 用户体验变化

**风险：** 强制 explore 可能打断快速迭代

**缓解：**
- 智能判断（详细输入可跳过）
- 保持 propose 的非阻塞特性
- 提供明确的跳过条件（用户可预期）

### Risk 3: Tasks.md 格式破坏性变更

**风险：** 现有变更的 tasks.md 格式不兼容

**缓解：**
- 解析器支持两种格式（向后兼容）
- 新变更使用新格式
- 提供迁移工具（可选）
- 文档明确说明迁移路径

### Risk 4: 详细步骤生成质量

**风险：** Master agent 拆解的 TDD 步骤可能不准确

**缓解：**
- Master agent 探索项目上下文（读现有代码）
- 生成的代码基于实际项目模式
- Implementer 可以报告 BLOCKED（Master agent 重新拆解）
- Checkpoint 验证（test 必须先 fail 再 pass）

### Risk 5: Worktree 集成复杂度

**风险：** Worktree 在不同平台上行为不一致

**缓解：**
- 优先使用平台原生工具（如 Claude Code 的 `EnterWorktree`）
- 回退到 git worktree（跨平台）
- 分支隔离作为默认推荐（简单可靠）
- Worktree 作为高级选项（用户主动选择）

## Migration Plan

### Phase 1: P0 核心能力（2-3 周）

1. **Explore 增强**
   - 更新 explore 模板，添加 brainstorming checklist
   - 实现 Design Summary 生成
   - 添加智能判断逻辑

2. **Apply Master Agent 拆解**
   - 实现任务拆解逻辑（粗粒度 → TDD Cycle）
   - 实现详细步骤文件生成（`.apply-steps/`）
   - 更新 apply 模板

3. **Implementer Subagent**
   - 创建 implementer skill
   - 实现 TDD 循环执行逻辑
   - 实现 checkpoint 验证

### Phase 2: P1 增强能力（1-2 周）

4. **Propose 智能路由**
   - 实现 explore 上下文检测
   - 实现输入详细程度判断
   - 更新 propose 模板

5. **分支隔离**
   - 实现分支检测逻辑
   - 实现隔离询问流程
   - 集成 worktree skill

### Phase 3: 测试和文档（1 周）

6. **测试覆盖**
   - 单元测试（任务拆解、步骤生成）
   - 集成测试（完整 explore → propose → apply 流程）
   - 跨平台测试（Windows 路径处理）

7. **文档更新**
   - 更新 CLAUDE.md（新工作流说明）
   - 更新 README（快速开始指南）
   - 添加迁移指南（旧格式 → 新格式）

### Rollback Strategy

如果融合后出现严重问题：

1. **保留旧模板**：在 `src/ai/templates/legacy/` 保留旧版本
2. **配置开关**：添加 `config.yaml` 中的 `useLegacyWorkflow: true`
3. **快速回退**：通过配置切换回旧工作流
4. **数据兼容**：解析器同时支持新旧格式

## Open Questions

1. **Implementer subagent 的 model 选择**
   - 默认使用 Haiku？
   - 允许用户配置？
   - 根据任务复杂度动态选择？

2. **详细步骤文件的生命周期**
   - Archive 时是否提供保留选项？
   - 是否需要 `.gitignore` 排除？

3. **Worktree 目录位置**
   - 项目本地（`.worktrees/`）？
   - 全局目录（`~/.config/openspec/worktrees/`）？
   - 用户配置？

4. **Tasks.md 迁移工具**
   - 是否需要自动迁移命令？
   - 还是只提供文档指导？
