## MODIFIED Requirements

### Requirement: Master agent 直接执行 pending task

Apply 阶段的 Master agent SHALL 读取 `tasks.md` 中的 pending task，并在当前上下文中按 Check 执行严格 TDD、证据收集和任务勾选。在实现 specs 未覆盖的实现细节时，Master agent SHALL 遵循 ponytaill 6-rung ladder（是否存在 → stdlib → native → 已安装依赖 → 一行 → 最小实现）。Agent SHALL NOT 质疑或简化 specs 明确要求的行为。

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

#### Scenario: specs 明确要求的照做

- **WHEN** 某个 spec requirement 明确要求实现特定抽象、接口或组件
- **THEN** Master agent SHALL 完整实现该要求
- **AND** SHALL NOT 以「只有一个实现」或 ponytailladder 为由跳过该实现

#### Scenario: specs 未覆盖的实现细节走 ponytailladder

- **WHEN** spec requirement 要求某行为但未指定实现方式
- **THEN** Master agent SHALL 按 ponytailladder 自问：是否存在已安装的方案 → stdlib 是否有 → native 是否有 → 一行 → 最小实现
- **AND** SHALL 优先选用已有依赖或平台功能，而非引入新依赖
- **AND** SHALL 为有意的精简标注 `ponytail:` 注释
