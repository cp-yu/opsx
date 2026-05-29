## Why

OpenSpec 当前的编码阶段能力偏弱，缺乏结构化的 TDD 纪律和子代理隔离执行机制。同时，explore/propose 阶段缺少 Superpowers brainstorming 那种强制设计前置、渐进式澄清需求的能力。本变更将 Superpowers 的核心能力（brainstorming、TDD、subagent-driven development）融合到 OpenSpec 中，提升整体开发质量和效率。

## What Changes

**P0 核心能力：**
- 增强 `/opsx:explore`，集成 Superpowers brainstorming 的 6 步流程（探索上下文、一次一问、2-3 方案对比、分段设计呈现、Design Summary）
- 改造 `/opsx:apply`，Master agent 负责将粗粒度任务拆解为详细 TDD 步骤，dispatch implementer subagent 执行
- 新增 implementer subagent，机械执行 TDD 循环（write test → run fail → implement → run pass → commit）
- Tasks.md 格式从 DDD（Design-Driven）转向 TDD（Test-Driven），支持粗粒度任务 + 动态生成详细步骤

**P1 增强能力：**
- 增强 `/opsx:propose`，智能判断是否需要 explore（基于输入详细程度）
- Apply 阶段支持分支隔离（检测 main/master，询问创建分支或 worktree）
- 集成 Superpowers 的 `using-git-worktrees` skill

## Capabilities

### New Capabilities

- `explore-brainstorming`: Explore 阶段的 brainstorming 流程，包含 6 步 checklist、一次一问纪律、2-3 方案对比、Design Summary 生成
- `apply-task-decomposition`: Apply 阶段 Master agent 的任务拆解能力，将粗粒度任务拆解为详细 TDD 步骤
- `apply-implementer-subagent`: Implementer subagent 的执行模型，机械执行详细 TDD 步骤
- `apply-branch-isolation`: Apply 阶段的分支隔离策略，支持创建分支或 worktree
- `propose-smart-routing`: Propose 阶段的智能路由，根据输入详细程度决定是否需要 explore

### Modified Capabilities

- `cap.ai.workflow-templates`: explore/propose/apply 模板需要更新，集成 brainstorming 和 TDD 流程
- `cap.ai.skill-generation`: 需要生成新的 implementer subagent skill 和更新现有 workflow skills
- `cap.change.create`: 变更创建流程需要支持新的 explore → propose 工作流
- `cap.cli.instructions`: apply 指令需要返回任务拆解状态和详细步骤文件路径

## Impact

**代码影响：**
- `src/ai/templates/`: 需要更新 explore-change.md, propose-change.md, apply-change.md 模板
- `src/ai/skills/`: 需要新增 implementer subagent skill，更新现有 workflow skills
- `src/core/instructions/`: apply 指令生成逻辑需要支持任务拆解状态
- `src/core/parsers/`: tasks.md 解析器需要支持新的粗粒度格式

**工作流影响：**
- 用户需要适应新的 explore → propose → apply 流程
- Apply 阶段会生成 `.apply-steps/` 目录存储详细 TDD 步骤
- 每个 TDD cycle 会产生独立 commit（需要在 feature 分支上工作）

**依赖影响：**
- 需要集成 Superpowers 的 `using-git-worktrees` skill（可选依赖）
- Implementer subagent 需要 cheap model 支持（成本优化）

**破坏性变更：**
- **BREAKING**: Tasks.md 格式从当前的 Actions/Checks 结构变为粗粒度 Goal/Files/Requirements/Checks 结构
- **BREAKING**: Apply 阶段默认会询问分支隔离，不再直接在当前分支工作
