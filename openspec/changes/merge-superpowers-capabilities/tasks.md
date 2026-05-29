## 1. Actions

### P0: 核心能力

#### Explore 增强

- [ ] A1 更新 explore 模板，添加 brainstorming checklist（6 步流程）
- [ ] A2 实现一次一问的提问逻辑
- [ ] A3 实现 2-3 方案对比生成逻辑
- [ ] A4 实现分段设计呈现逻辑
- [ ] A5 实现 Design Summary 生成和格式化
- [ ] A6 实现范围检查和拆解建议逻辑

#### Apply Master Agent 拆解

- [ ] A7 实现粗粒度任务读取逻辑（Goal/Files/Requirements/Checks）
- [ ] A8 实现项目上下文探索逻辑（读取相关文件、理解代码模式）
- [ ] A9 实现任务拆解为 TDD Cycle 的核心算法
- [ ] A10 实现详细步骤文件生成逻辑（.apply-steps/task-N-<name>.md）
- [ ] A11 实现完整代码生成（测试代码 + 实现代码）
- [ ] A12 实现验证命令和 checkpoint 生成
- [ ] A13 实现 commit 信息生成

#### Implementer Subagent

- [ ] A14 创建 implementer subagent skill 文件结构
- [ ] A15 实现详细步骤文件读取和解析
- [ ] A16 实现 TDD Cycle 顺序执行逻辑
- [ ] A17 实现 Step 1（Write Failing Test）执行逻辑
- [ ] A18 实现 Step 2（Run Test - Verify Fails）执行和 checkpoint 验证
- [ ] A19 实现 Step 3（Implement Minimal Code）执行逻辑
- [ ] A20 实现 Step 4（Run Test - Verify Passes）执行和 checkpoint 验证
- [ ] A21 实现 Step 5（Commit）执行逻辑
- [ ] A22 实现状态报告逻辑（DONE/BLOCKED/NEEDS_CONTEXT/DONE_WITH_CONCERNS）

### P1: 增强能力

#### Propose 智能路由

- [ ] A23 实现 explore 上下文检测逻辑（扫描对话历史）
- [ ] A24 实现输入详细程度判断算法（5 个维度评分）
- [ ] A25 实现多子系统检测逻辑
- [ ] A26 实现从 Design Summary 提取信息的逻辑
- [ ] A27 更新 propose 模板，集成智能路由决策
- [ ] A28 实现决策透明化（显示判断依据）

#### 分支隔离

- [ ] A29 实现当前分支检测逻辑（git branch --show-current）
- [ ] A30 实现隔离方式询问逻辑（3 个选项）
- [ ] A31 实现创建新分支逻辑（git checkout -b）
- [ ] A32 实现 worktree 创建逻辑（手动或调用 skill）
- [ ] A33 实现隔离状态持久化（.apply-isolation.json）
- [ ] A34 集成 Superpowers 的 using-git-worktrees skill
- [ ] A35 实现 archive 时的 worktree 清理逻辑

### 基础设施

- [ ] A36 更新 tasks.md 解析器，支持新旧两种格式
- [ ] A37 更新 apply 指令生成逻辑，返回任务拆解状态
- [ ] A38 创建 .apply-steps/ 目录管理逻辑
- [ ] A39 实现跨平台路径处理（path.join/path.resolve）
- [ ] A40 添加配置项（propose.smartRouting, apply.defaultIsolation）

### 测试和文档

- [ ] A41 为任务拆解算法编写单元测试
- [ ] A42 为 implementer subagent 编写单元测试
- [ ] A43 为智能路由判断编写单元测试
- [ ] A44 编写完整工作流集成测试（explore → propose → apply）
- [ ] A45 编写 Windows 路径处理测试
- [ ] A46 更新 CLAUDE.md，说明新工作流
- [ ] A47 更新 README，添加快速开始指南
- [ ] A48 编写迁移指南（旧格式 → 新格式）

## 2. Checks

### Explore 增强验证

- [ ] C1 验证 brainstorming checklist 完整执行
  - Covers: A1, A2, A3, A4, A5, A6
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Explore 必须执行 brainstorming checklist" / Scenario "完整 brainstorming 流程"
  - Command: 手动测试 `/opsx:explore "add user auth"`
  - Expect: 系统按顺序执行 6 个步骤，生成 Design Summary

- [ ] C2 验证一次一问纪律
  - Covers: A2
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "一次一问的提问纪律" / Scenario "单个问题等待"
  - Command: 手动测试 explore 流程
  - Expect: 系统每次只问一个问题，等待回答后再继续

- [ ] C3 验证 2-3 方案对比
  - Covers: A3
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "2-3 方案对比" / Scenario "方案对比呈现"
  - Command: 手动测试 explore 流程
  - Expect: 系统提出 2-3 个方案，包含优劣势对比和推荐理由

- [ ] C4 验证 Design Summary 格式
  - Covers: A5
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "Design Summary 生成" / Scenario "Design Summary 格式"
  - Evidence: explore 输出的 Design Summary
  - Expect: 包含架构方案、核心组件、数据流、技术栈、测试策略、风险和权衡 6 个部分

- [ ] C5 验证范围检查
  - Covers: A6
  - Verifies: `specs/explore-brainstorming/spec.md` / Requirement "范围检查和拆解建议" / Scenario "范围过大提示"
  - Command: 手动测试 `/opsx:explore "构建电商平台，包含用户管理、商品管理、订单管理、支付集成、库存管理"`
  - Expect: 系统识别多子系统，建议拆分

### Apply 任务拆解验证

- [ ] C6 验证粗粒度任务读取
  - Covers: A7
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "Master agent 必须拆解粗粒度任务为 TDD 步骤" / Scenario "读取粗粒度任务"
  - Command: `pnpm test src/core/apply/task-decomposition.test.ts`
  - Expect: 正确解析 Goal、Files、Requirements、Checks

- [ ] C7 验证任务拆解为 TDD Cycle
  - Covers: A9
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "Master agent 必须拆解粗粒度任务为 TDD 步骤" / Scenario "拆解为多个 TDD Cycle"
  - Command: `pnpm test src/core/apply/task-decomposition.test.ts`
  - Expect: 一个任务拆解为 1-5 个 TDD Cycle，每个 Cycle 包含 5 个 Step

- [ ] C8 验证详细步骤文件生成
  - Covers: A10, A11, A12, A13
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "详细步骤写入文件" / Scenario "文件内容结构"
  - Command: 手动测试 apply 阶段，检查 `.apply-steps/` 目录
  - Expect: 生成的文件包含 Context、TDD Cycle、Summary，代码完整，命令可执行

- [ ] C9 验证完整代码生成
  - Covers: A11
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "详细步骤必须包含完整代码" / Scenario "测试代码完整性", "实现代码完整性"
  - Evidence: `.apply-steps/` 中的代码块
  - Expect: 测试代码和实现代码都包含 import、完整逻辑、export

- [ ] C10 验证跨平台路径处理
  - Covers: A39
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "详细步骤必须包含验证命令" / Scenario "跨平台命令兼容"
  - Command: `pnpm test src/core/apply/path-handling.test.ts` (Windows CI)
  - Expect: 路径使用 path.join()，在 Windows/macOS/Linux 上都能正确执行

### Implementer Subagent 验证

- [ ] C11 验证详细步骤文件读取
  - Covers: A15
  - Verifies: `specs/apply-implementer-subagent/spec.md` / Requirement "Implementer subagent 必须读取详细步骤文件" / Scenario "读取步骤文件"
  - Command: `pnpm test src/ai/skills/implementer/file-reader.test.ts`
  - Expect: 正确解析 TDD Cycle 和 Step

- [ ] C12 验证 TDD Cycle 顺序执行
  - Covers: A16
  - Verifies: `specs/apply-implementer-subagent/spec.md` / Requirement "Implementer 必须按顺序执行 TDD Cycle" / Scenario "顺序执行 Cycle"
  - Command: 手动测试 implementer subagent
  - Expect: 按顺序执行所有 Cycle，不跳过步骤

- [ ] C13 验证 Step 2 checkpoint（测试必须失败）
  - Covers: A18
  - Verifies: `specs/apply-implementer-subagent/spec.md` / Requirement "Step 2 必须验证测试失败" / Scenario "验证测试失败"
  - Command: 手动测试，观察 Step 2 执行
  - Expect: 如果测试通过，报告 BLOCKED

- [ ] C14 验证 Step 4 checkpoint（测试必须通过）
  - Covers: A20
  - Verifies: `specs/apply-implementer-subagent/spec.md` / Requirement "Step 4 必须验证测试通过" / Scenario "验证测试通过"
  - Command: 手动测试，观察 Step 4 执行
  - Expect: 如果测试失败，报告 BLOCKED

- [ ] C15 验证状态报告
  - Covers: A22
  - Verifies: `specs/apply-implementer-subagent/spec.md` / Requirement "Implementer 必须报告执行状态" / Scenario "成功完成报告 DONE", "遇到阻塞报告 BLOCKED"
  - Command: 手动测试不同场景
  - Expect: 正确报告 DONE/BLOCKED/NEEDS_CONTEXT/DONE_WITH_CONCERNS

### Propose 智能路由验证

- [ ] C16 验证 explore 上下文检测
  - Covers: A23
  - Verifies: `specs/propose-smart-routing/spec.md` / Requirement "Propose 必须检测 explore 上下文" / Scenario "同会话 explore"
  - Command: 手动测试：先 `/opsx:explore`，再 `/opsx:propose`
  - Expect: 系统找到 Design Summary，使用它生成制品

- [ ] C17 验证输入详细程度判断
  - Covers: A24
  - Verifies: `specs/propose-smart-routing/spec.md` / Requirement "判断输入详细程度" / Scenario "详细输入（分数 ≥ 3）", "简单输入（分数 < 3）"
  - Command: `pnpm test src/ai/propose/smart-routing.test.ts`
  - Expect: 详细输入跳过 explore，简单输入提示需要 explore

- [ ] C18 验证多子系统检测
  - Covers: A25
  - Verifies: `specs/propose-smart-routing/spec.md` / Requirement "检测多子系统" / Scenario "多子系统强制 explore"
  - Command: 手动测试 `/opsx:propose "构建电商平台..."`
  - Expect: 系统识别多子系统，强制 explore

- [ ] C19 验证从 Design Summary 提取信息
  - Covers: A26
  - Verifies: `specs/propose-smart-routing/spec.md` / Requirement "从 Design Summary 提取信息" / Scenario "提取架构方案", "提取核心组件"
  - Evidence: 生成的 design.md 和 tasks.md
  - Expect: 内容与 Design Summary 一致

### 分支隔离验证

- [ ] C20 验证分支检测
  - Covers: A29
  - Verifies: `specs/apply-branch-isolation/spec.md` / Requirement "Apply 必须检测当前分支" / Scenario "在 main/master 分支时询问"
  - Command: 手动测试：在 main 分支调用 `/opsx:apply`
  - Expect: 系统显示警告，询问隔离方式

- [ ] C21 验证创建新分支
  - Covers: A31
  - Verifies: `specs/apply-branch-isolation/spec.md` / Requirement "创建新分支" / Scenario "执行分支创建"
  - Command: 手动测试：选择"创建新分支"
  - Expect: 执行 `git checkout -b <change-name>`，切换成功

- [ ] C22 验证 worktree 创建
  - Covers: A32, A34
  - Verifies: `specs/apply-branch-isolation/spec.md` / Requirement "创建 worktree" / Scenario "调用 worktree skill", "手动创建 worktree"
  - Command: 手动测试：选择"创建 worktree"
  - Expect: 创建 `.worktrees/<change-name>` 目录，切换工作目录

- [ ] C23 验证隔离状态持久化
  - Covers: A33
  - Verifies: `specs/apply-branch-isolation/spec.md` / Requirement "隔离状态持久化" / Scenario "记录隔离方式"
  - Evidence: `.apply-isolation.json` 文件
  - Expect: 文件包含 method、branchName、worktreePath、originalBranch

- [ ] C24 验证跨平台路径处理
  - Covers: A39
  - Verifies: `specs/apply-branch-isolation/spec.md` / Requirement "跨平台路径处理" / Scenario "Worktree 路径构建"
  - Command: `pnpm test src/core/apply/isolation.test.ts` (Windows CI)
  - Expect: 路径在 Windows/macOS/Linux 上都能正确创建

### 集成测试

- [ ] C25 验证完整工作流（explore → propose → apply）
  - Covers: A1-A22, A23-A28, A29-A35
  - Verifies: 所有 5 个 spec 的核心场景
  - Command: 手动端到端测试
  - Expect: 从 explore 到 apply 完成，生成正确的代码和 commit

- [ ] C26 验证向后兼容
  - Covers: A36
  - Verifies: `specs/propose-smart-routing/spec.md` / Requirement "向后兼容" / Scenario "无 explore 上下文且详细输入"
  - Command: 手动测试：新会话直接 `/opsx:propose` 带详细输入
  - Expect: 行为与当前 propose 一致

- [ ] C27 验证 Windows 兼容性
  - Covers: A39, A45
  - Verifies: 所有涉及路径的 spec 场景
  - Command: Windows CI 运行所有测试
  - Expect: 所有测试通过，路径处理正确

### 文档验证

- [ ] C28 验证 CLAUDE.md 更新
  - Covers: A46
  - Verifies: 文档完整性
  - Evidence: CLAUDE.md 内容
  - Expect: 包含新工作流说明、brainstorming checklist、TDD 流程、分支隔离策略

- [ ] C29 验证迁移指南
  - Covers: A48
  - Verifies: 迁移指南可用性
  - Evidence: 迁移指南文档
  - Expect: 包含旧格式 → 新格式的具体步骤和示例
