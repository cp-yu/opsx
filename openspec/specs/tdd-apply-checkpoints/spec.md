# tdd-apply-checkpoints Specification

## Purpose
定义 Apply Phase 0 在任务实现循环中执行的 TDD 质量检查点，确保接口可测试性、测试行为质量和 Mock 边界在进入实现与验证前得到约束。
## Requirements
### Requirement: 接口设计可测试性检查
Apply Master Agent 在读取任务的 Goal、Files、Requirements、Checks 后，开始编写测试前，MUST 评估目标接口的可测试性设计。

评估标准：
- 依赖通过参数注入，而非在函数/类内部创建
- 函数返回值而非产生副作用
- 接口面积最小化（最少方法数和参数数）

若接口设计违反上述原则，Agent MUST 调整接口设计后再继续，而非强行为不可测试的接口编写测试。

#### Scenario: 依赖注入检查通过
- **WHEN** Master Agent 读取任务后，发现目标函数通过参数接收所有外部依赖
- **THEN** Agent 继续进入测试编写阶段，不提出接口调整建议

#### Scenario: 依赖注入检查失败
- **WHEN** Master Agent 读取任务后，发现目标函数内部使用 `new` 创建依赖或直接调用全局对象
- **THEN** Agent MUST 先调整接口设计，将依赖改为参数注入，再继续后续步骤

#### Scenario: 副作用检查通过
- **WHEN** Master Agent 读取任务后，发现目标函数返回计算结果而非直接修改全局状态或数据库
- **THEN** Agent 继续进入测试编写阶段

#### Scenario: 副作用检查失败
- **WHEN** Master Agent 读取任务后，发现目标函数不返回值，而是直接修改外部状态
- **THEN** Agent MUST 先调整接口设计，改为返回值模式，再继续后续步骤

#### Scenario: 接口面积检查通过
- **WHEN** Master Agent 读取任务后，发现目标类/模块的公共方法数量少于 5 个且每个方法参数少于 4 个
- **THEN** Agent 继续进入测试编写阶段

### Requirement: 测试质量标准验证
Apply Master Agent 在为 behavior/code Check 添加或更新测试后，运行 Check 前，MUST 验证测试符合质量标准。

质量标准：
- 测试通过公共接口验证行为，不测试私有方法或内部实现细节
- 测试不 mock 内部协作者，仅 mock 系统边界（见 Mock 边界约束）
- 每个测试包含一个逻辑断言（可多个物理断言，但验证同一个行为）
- 测试在内部重构后仍能通过（测试行为而非实现）

若测试违反上述标准，Agent MUST 重写测试后再进入 RED 阶段。

#### Scenario: 公共接口测试通过
- **WHEN** Master Agent 编写的测试通过调用公共方法并验证返回值或可观察副作用
- **THEN** Agent 继续进入 RED 阶段

#### Scenario: 私有方法测试失败
- **WHEN** Master Agent 编写的测试直接调用私有方法或访问内部状态
- **THEN** Agent MUST 重写测试，改为通过公共接口间接验证该行为

#### Scenario: 内部 mock 检查失败
- **WHEN** Master Agent 编写的测试 mock 了项目内部的类、模块或函数
- **THEN** Agent MUST 重写测试，移除内部 mock，改为真实调用或重构接口

#### Scenario: 单一逻辑断言检查通过
- **WHEN** Master Agent 编写的测试虽有 3 个 `expect()` 调用，但都在验证同一个用户行为的不同方面（如返回对象的多个字段）
- **THEN** Agent 继续进入 RED 阶段

#### Scenario: 多逻辑断言检查失败
- **WHEN** Master Agent 编写的测试在一个 `it()` 块中验证了两个独立的用户行为（如登录 + 注销）
- **THEN** Agent MUST 拆分为两个独立测试

#### Scenario: 重构存活性检查
- **WHEN** Master Agent 编写的测试仅依赖公共接口和行为契约，不依赖实现细节
- **THEN** 该测试被标记为可在重构后存活，Agent 继续进入 RED 阶段

### Requirement: Mock 边界约束强制
Apply Master Agent 在实现使 Check 通过的最小化代码时，MUST 强制执行 Mock 边界约束。

约束规则：
- Mock 仅限系统边界：外部 API、数据库、时间源（`Date.now()`、`new Date()`）、文件系统
- 禁止 mock 内部类、模块或项目控制的协作者
- 使用依赖注入模式，将可 mock 的系统边界作为参数传入

若实现需要 mock 内部代码，Agent MUST 停止实现，重构接口以接受该依赖为参数。

#### Scenario: 外部 API mock 允许
- **WHEN** Master Agent 实现代码需要调用外部支付网关 API
- **THEN** Agent 允许在测试中 mock 该 API 客户端，并通过依赖注入传入

#### Scenario: 数据库 mock 允许
- **WHEN** Master Agent 实现代码需要查询数据库
- **THEN** Agent 允许在测试中 mock 数据库连接或使用测试数据库

#### Scenario: 时间源 mock 允许
- **WHEN** Master Agent 实现代码需要获取当前时间戳
- **THEN** Agent 将时间源（如 `() => Date.now()`）作为参数注入，允许测试传入固定值

#### Scenario: 文件系统 mock 允许
- **WHEN** Master Agent 实现代码需要读写文件
- **THEN** Agent 将文件系统操作（如 `fs` 模块包装）作为参数注入，允许测试 mock

#### Scenario: 内部模块 mock 拒绝
- **WHEN** Master Agent 实现代码需要调用同项目的另一个服务类
- **THEN** Agent MUST 拒绝 mock，改为在测试中使用该服务类的真实实例

#### Scenario: 内部协作者 mock 拒绝触发重构
- **WHEN** Master Agent 发现实现需要 mock 内部类才能测试
- **THEN** Agent MUST 停止实现，重构接口将该内部类作为参数注入，然后继续
