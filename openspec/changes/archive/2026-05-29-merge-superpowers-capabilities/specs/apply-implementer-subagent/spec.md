## ADDED Requirements

### Requirement: Implementer subagent 必须读取详细步骤文件

Implementer subagent SHALL 读取 Master agent 生成的详细步骤文件并执行。

#### Scenario: 读取步骤文件

- **WHEN** Implementer subagent 被 dispatch
- **THEN** 系统接收详细步骤文件路径（如 `.apply-steps/task-1-user-registration-api.md`）
- **THEN** 系统读取文件内容
- **THEN** 系统解析出所有 TDD Cycle 和 Step

#### Scenario: 文件不存在处理

- **WHEN** 详细步骤文件路径不存在
- **THEN** 系统报告状态 `BLOCKED`
- **THEN** 系统返回错误信息："详细步骤文件不存在：<path>"

### Requirement: Implementer 必须按顺序执行 TDD Cycle

系统 SHALL 按顺序执行每个 TDD Cycle，不跳过任何步骤。

#### Scenario: 顺序执行 Cycle

- **WHEN** Implementer 开始执行
- **THEN** 系统从第一个 TDD Cycle 开始
- **THEN** 完成一个 Cycle 的所有 5 个步骤后，进入下一个 Cycle
- **THEN** 所有 Cycle 完成后，报告 `DONE`

#### Scenario: 不跳过步骤

- **WHEN** Implementer 执行某个 Cycle
- **THEN** 系统必须依次执行 Step 1 → Step 2 → Step 3 → Step 4 → Step 5
- **THEN** 不允许跳过任何步骤（即使某步骤看起来"不必要"）

### Requirement: Step 1 必须写入测试代码

系统 SHALL 在 Step 1 中将测试代码写入指定文件。

#### Scenario: 创建测试文件

- **WHEN** Step 1 指定 "Create: `tests/auth.test.ts`"
- **THEN** 系统创建该文件（如果不存在）
- **THEN** 系统写入详细步骤中提供的完整测试代码

#### Scenario: 修改测试文件

- **WHEN** Step 1 指定 "Modify: `tests/auth.test.ts`"
- **THEN** 系统读取现有文件
- **THEN** 系统添加新的测试用例（不删除现有测试）

#### Scenario: 文件路径跨平台

- **WHEN** 系统创建或修改文件
- **THEN** 路径使用 `path.join()` 或 `path.resolve()` 处理
- **THEN** 在 Windows、macOS、Linux 上都能正确创建文件

### Requirement: Step 2 必须验证测试失败

系统 SHALL 在 Step 2 中运行测试并验证其失败。

#### Scenario: 运行测试命令

- **WHEN** Step 2 提供命令 `npm test tests/auth.test.ts`
- **THEN** 系统执行该命令
- **THEN** 系统捕获命令输出

#### Scenario: 验证测试失败

- **WHEN** 测试命令执行完成
- **THEN** 系统检查退出码（应为非 0）
- **THEN** 系统检查输出是否包含 "FAIL" 或预期的错误信息
- **THEN** 如果测试通过（退出码 0），系统报告 `BLOCKED`："Checkpoint 失败：测试应该失败但通过了"

#### Scenario: 命令执行失败

- **WHEN** 测试命令无法执行（如命令不存在）
- **THEN** 系统报告 `BLOCKED`
- **THEN** 系统返回错误信息："无法执行测试命令：<command>"

### Requirement: Step 3 必须写入实现代码

系统 SHALL 在 Step 3 中将实现代码写入指定文件。

#### Scenario: 创建实现文件

- **WHEN** Step 3 指定 "Create: `src/routes/auth.ts`"
- **THEN** 系统创建该文件（如果不存在）
- **THEN** 系统写入详细步骤中提供的完整实现代码

#### Scenario: 修改实现文件

- **WHEN** Step 3 指定 "Modify: `src/app.ts`"
- **THEN** 系统读取现有文件
- **THEN** 系统根据详细步骤中的指示修改代码（如添加路由注册）

#### Scenario: 最小化实现

- **WHEN** 系统写入实现代码
- **THEN** 代码仅实现通过测试所需的最小逻辑
- **THEN** 不添加额外的功能或优化

### Requirement: Step 4 必须验证测试通过

系统 SHALL 在 Step 4 中运行测试并验证其通过。

#### Scenario: 运行测试命令

- **WHEN** Step 4 提供命令 `npm test tests/auth.test.ts`
- **THEN** 系统执行该命令
- **THEN** 系统捕获命令输出

#### Scenario: 验证测试通过

- **WHEN** 测试命令执行完成
- **THEN** 系统检查退出码（应为 0）
- **THEN** 系统检查输出是否包含 "PASS" 或所有测试通过的标志
- **THEN** 如果测试失败（退出码非 0），系统报告 `BLOCKED`："Checkpoint 失败：测试应该通过但失败了"

#### Scenario: 测试失败时提供诊断

- **WHEN** Step 4 的测试失败
- **THEN** 系统报告 `BLOCKED`
- **THEN** 系统返回测试输出（包含失败原因）
- **THEN** 系统建议："实现代码可能不正确，或测试代码有误。"

### Requirement: Step 5 必须提交代码

系统 SHALL 在 Step 5 中提交代码到 git。

#### Scenario: 执行 git add

- **WHEN** Step 5 提供 `git add` 命令
- **THEN** 系统执行该命令，添加所有修改的文件
- **THEN** 系统验证文件已成功添加到暂存区

#### Scenario: 执行 git commit

- **WHEN** Step 5 提供 `git commit -m` 命令
- **THEN** 系统执行该命令，使用提供的 commit message
- **THEN** 系统验证 commit 成功创建

#### Scenario: Commit 失败处理

- **WHEN** git commit 失败（如 pre-commit hook 失败）
- **THEN** 系统报告 `BLOCKED`
- **THEN** 系统返回 git 错误信息
- **THEN** 系统建议："Pre-commit hook 失败，请检查代码质量问题。"

### Requirement: Implementer 必须报告执行状态

系统 SHALL 在执行完成或遇到问题时报告明确的状态。

#### Scenario: 成功完成报告 DONE

- **WHEN** 所有 TDD Cycle 都成功执行完成
- **THEN** 系统报告状态 `DONE`
- **THEN** 系统返回摘要：
  - 完成的 TDD Cycle 数量
  - 修改的文件列表
  - 创建的 commit 数量

#### Scenario: 遇到阻塞报告 BLOCKED

- **WHEN** 任何 Checkpoint 验证失败（Step 2 测试未失败，或 Step 4 测试未通过）
- **THEN** 系统报告状态 `BLOCKED`
- **THEN** 系统返回详细错误信息：
  - 失败的 Cycle 和 Step
  - 具体的失败原因
  - 相关的命令输出

#### Scenario: 需要更多上下文报告 NEEDS_CONTEXT

- **WHEN** Implementer 无法理解详细步骤中的某些指示
- **THEN** 系统报告状态 `NEEDS_CONTEXT`
- **THEN** 系统返回具体的疑问：
  - 哪个步骤不清楚
  - 需要什么额外信息

#### Scenario: 完成但有疑虑报告 DONE_WITH_CONCERNS

- **WHEN** 所有步骤都执行完成，但 Implementer 对结果有疑虑
- **THEN** 系统报告状态 `DONE_WITH_CONCERNS`
- **THEN** 系统返回疑虑内容：
  - 哪些地方不确定
  - 建议进行额外验证

### Requirement: Implementer 使用 cheap model

系统 SHALL 使用 cheap model（如 Haiku）执行 Implementer subagent。

#### Scenario: Model 选择

- **WHEN** Master agent dispatch Implementer subagent
- **THEN** 系统默认使用 cheap model（如 Claude Haiku）
- **THEN** 系统不使用 capable model（如 Claude Opus），除非用户明确配置

#### Scenario: 成本优化

- **WHEN** 一个变更包含 N 个任务
- **THEN** 总成本 = 1 × capable model（Master agent）+ N × cheap model（Implementer subagents）
- **THEN** 相比全部使用 capable model，成本显著降低
