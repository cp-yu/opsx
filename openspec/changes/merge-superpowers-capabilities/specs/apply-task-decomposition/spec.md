## ADDED Requirements

### Requirement: Master agent 必须拆解粗粒度任务为 TDD 步骤

Apply 阶段的 Master agent SHALL 读取 tasks.md 中的粗粒度任务，并拆解为详细的 TDD 步骤。

#### Scenario: 读取粗粒度任务

- **WHEN** Master agent 开始执行某个任务
- **THEN** 系统读取该任务的 Goal、Files、Requirements、Checks
- **THEN** 系统探索项目上下文（读取相关文件，理解现有代码模式）

#### Scenario: 拆解为多个 TDD Cycle

- **WHEN** Master agent 理解了任务需求和项目上下文
- **THEN** 系统将任务拆解为 1 个或多个 TDD Cycle
- **THEN** 每个 TDD Cycle 对应一个独立的功能点或边界条件

#### Scenario: 单个 TDD Cycle 包含 5 个步骤

- **WHEN** Master agent 生成 TDD Cycle
- **THEN** 每个 Cycle 包含以下 5 个步骤：
  1. Write Failing Test（编写失败测试）
  2. Run Test (Verify Fails)（运行测试，验证失败）
  3. Implement Minimal Code（实现最小代码）
  4. Run Test (Verify Passes)（运行测试，验证通过）
  5. Commit（提交代码）

### Requirement: 详细步骤必须包含完整代码

系统 SHALL 在详细步骤中包含完整的测试代码和实现代码。

#### Scenario: 测试代码完整性

- **WHEN** Master agent 生成 Step 1（Write Failing Test）
- **THEN** 系统生成完整的测试代码，包括：
  - Import 语句
  - 测试框架设置（describe/it 或等价结构）
  - 完整的测试逻辑
  - 断言语句

#### Scenario: 实现代码完整性

- **WHEN** Master agent 生成 Step 3（Implement Minimal Code）
- **THEN** 系统生成完整的实现代码，包括：
  - Import 语句
  - 函数/类定义
  - 最小化实现逻辑（仅满足测试通过）
  - Export 语句

#### Scenario: 代码基于项目实际模式

- **WHEN** Master agent 生成代码
- **THEN** 系统使用项目现有的代码风格（如 import 风格、命名约定、测试框架）
- **THEN** 系统使用项目现有的依赖库（不引入新依赖）

### Requirement: 详细步骤必须包含验证命令

系统 SHALL 在详细步骤中包含具体的验证命令和预期输出。

#### Scenario: Step 2 验证命令

- **WHEN** Master agent 生成 Step 2（Run Test - Verify Fails）
- **THEN** 系统提供具体的测试命令（如 `npm test tests/auth.test.ts`）
- **THEN** 系统提供预期输出（如 "FAIL - route not defined"）
- **THEN** 系统标注 Checkpoint："Test MUST fail"

#### Scenario: Step 4 验证命令

- **WHEN** Master agent 生成 Step 4（Run Test - Verify Passes）
- **THEN** 系统提供具体的测试命令（如 `npm test tests/auth.test.ts`）
- **THEN** 系统提供预期输出（如 "PASS"）
- **THEN** 系统标注 Checkpoint："Test MUST pass"

#### Scenario: 跨平台命令兼容

- **WHEN** 系统生成测试命令
- **THEN** 命令 SHALL 在 Windows、macOS、Linux 上都能执行
- **THEN** 路径使用 Node.js path 模块处理，不硬编码斜杠

### Requirement: 详细步骤必须包含 commit 信息

系统 SHALL 在 Step 5 中提供完整的 commit 命令和 message。

#### Scenario: Commit 命令生成

- **WHEN** Master agent 生成 Step 5（Commit）
- **THEN** 系统提供 `git add` 命令，列出所有修改的文件
- **THEN** 系统提供 `git commit -m` 命令，包含符合项目规范的 commit message

#### Scenario: Commit message 格式

- **WHEN** 系统生成 commit message
- **THEN** message 遵循 Conventional Commits 格式（如 `feat(auth): add user registration endpoint`）
- **THEN** message 简洁描述本次 TDD Cycle 实现的功能

### Requirement: 详细步骤写入文件

系统 SHALL 将详细步骤写入 `.apply-steps/task-N-<name>.md` 文件。

#### Scenario: 文件路径生成

- **WHEN** Master agent 完成任务拆解
- **THEN** 系统在 `openspec/changes/<change-name>/.apply-steps/` 目录下创建文件
- **THEN** 文件名格式为 `task-N-<kebab-case-name>.md`（N 为任务序号）
- **THEN** 路径使用 `path.join()` 构建，确保跨平台兼容

#### Scenario: 文件内容结构

- **WHEN** 系统写入详细步骤文件
- **THEN** 文件包含以下部分：
  - 标题（Task N: <任务名> - Detailed TDD Steps）
  - Context（Goal、Files、Requirements、Related Spec）
  - 多个 TDD Cycle（每个 Cycle 包含 5 个 Step）
  - Summary（总 Cycle 数、修改的文件、Commit 数）

#### Scenario: 文件编码

- **WHEN** 系统写入文件
- **THEN** 文件使用 UTF-8 编码
- **THEN** 换行符使用 LF（`\n`），不使用 CRLF

### Requirement: 任务拆解失败处理

系统 SHALL 在任务拆解失败时提供明确的错误信息。

#### Scenario: 任务需求不明确

- **WHEN** Master agent 发现任务的 Goal 或 Requirements 过于模糊
- **THEN** 系统报告："任务需求不明确，无法拆解。建议更新 tasks.md 中的 Requirements。"
- **THEN** 系统列出具体的模糊点

#### Scenario: 项目上下文不足

- **WHEN** Master agent 无法找到相关的现有代码或模式
- **THEN** 系统报告："项目上下文不足，无法生成准确的代码。建议在 tasks.md 中添加更多上下文信息。"
- **THEN** 系统列出缺失的上下文（如"找不到现有的测试框架"）

#### Scenario: 任务过于复杂

- **WHEN** Master agent 判断任务需要 > 5 个 TDD Cycle
- **THEN** 系统报告："任务过于复杂，建议拆分为多个子任务。"
- **THEN** 系统建议拆分方案
