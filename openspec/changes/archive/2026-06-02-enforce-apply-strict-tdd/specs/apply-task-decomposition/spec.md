## MODIFIED Requirements

### Requirement: Master agent 直接执行 pending task

Apply 阶段的 Master agent SHALL 读取 `tasks.md` 中的 pending task，并在当前上下文中按 Check 执行严格 TDD、证据收集和任务勾选。

#### Scenario: 读取粗粒度任务

- **WHEN** Master agent 开始执行某个任务
- **THEN** 系统读取该任务的 Goal、Files、Requirements、Checks
- **AND** 系统探索项目上下文（读取相关文件，理解现有代码模式）

#### Scenario: 拆解为可执行工作

- **WHEN** Master agent 理解了任务需求和项目上下文
- **THEN** 系统在当前上下文中规划最小可验证实现顺序
- **AND** 系统 SHALL NOT 生成正式中间步骤文件

#### Scenario: 行为代码 Check 执行严格 TDD

- **WHEN** pending Check 需要代码行为变化
- **THEN** 系统 SHALL 先新增或更新目标测试
- **AND** 系统 SHALL 运行 Check 指定的命令或等价目标命令并确认预期失败
- **AND** 系统 SHALL 执行最小实现使目标测试通过
- **AND** 系统 SHALL 重跑同一或等价 Check 命令并确认通过
- **AND** 系统 SHALL 使用 red evidence 和 green evidence 作为完成证据

#### Scenario: 非运行时文本制品 Check 只要求最终证据

- **WHEN** pending Check 仅修改非运行时文本或非运行时制品
- **THEN** 系统 SHALL NOT 伪造失败测试
- **AND** 系统 SHALL 运行 Check 声明的验证命令或检查 `Evidence:` / `Expect:` 字段
- **AND** 系统 SHALL 在最终证据通过后才允许勾选 Check

#### Scenario: 不生成 apply-steps

- **WHEN** Master agent 执行 apply Phase 0
- **THEN** 系统 SHALL NOT 创建或读取 `.apply-steps` 目录
- **AND** 系统 SHALL NOT 将任务执行依赖外部 step file

### Requirement: Checks 是任务进度源

系统 SHALL 使用 `tasks.md` 的 Checks 和 Remediation 记录 apply Phase 0 的进度与恢复工作。

#### Scenario: 完成 Check 后勾选

- **WHEN** Check 的 red/green TDD 证据通过，或非运行时文本制品 Check 的最终证据通过
- **THEN** 系统在 `tasks.md` 中勾选对应 Check
- **AND** 系统 SHALL NOT 在缺少完成证据时勾选

#### Scenario: remediation 优先

- **WHEN** `tasks.md` 包含未完成的 `## Remediation` 项
- **THEN** 系统优先处理相关 `[code_fix]` 或 `[artifact_fix]`
- **AND** 系统在证据通过后勾选已解决项

#### Scenario: 跨平台命令兼容

- **WHEN** 系统执行或生成涉及路径的命令
- **THEN** 路径 SHALL 使用 Node.js path 模块处理
- **AND** 系统 SHALL NOT 硬编码平台特定路径分隔符
