---
capabilities:
  - cap.optimizer.tdd-smells
---

## ADDED Requirements

### Requirement: 长方法拆分检测
Optimizer Subagent 在扫描实现文件时，MUST 识别超过 30 行的方法，并生成将其拆分为私有辅助函数的 Search/Replace blocks。

拆分原则：
- 将逻辑块提取为私有辅助方法，每个辅助方法做一件事
- 保持公共接口不变
- 使用描述性方法名替代注释

#### Scenario: 检测到 40 行方法
- **WHEN** Optimizer 读取实现文件，发现一个方法包含 40 行代码
- **THEN** Optimizer MUST 分析该方法的逻辑块，生成 Search/Replace blocks 将其拆分为 2-4 个私有辅助方法

#### Scenario: 方法已足够简洁
- **WHEN** Optimizer 读取实现文件，发现所有方法均少于 30 行
- **THEN** Optimizer 跳过长方法检测，继续下一个坏味道维度

#### Scenario: 拆分后保持接口不变
- **WHEN** Optimizer 生成长方法拆分的 Search/Replace blocks
- **THEN** 生成的代码 MUST 保持原方法的签名、参数和返回值不变，仅提取内部逻辑为私有方法

### Requirement: 浅模块加深检测
Optimizer Subagent 在扫描实现文件时，MUST 识别浅模块（方法数少于 3 个且实现简单的类/模块），并生成合并或加深抽象的 Search/Replace blocks。

评估标准：
- 方法数量：是否可减少？
- 参数复杂度：是否可简化？
- 内部复杂度：是否有足够隐藏的实现？

行动策略：
- 合并浅模块（少于 3 个方法的类）
- 将复杂度下推到实现内部
- 简化公共 API 接口

#### Scenario: 检测到单方法类
- **WHEN** Optimizer 读取实现文件，发现一个类仅包含 1 个公共方法且无状态
- **THEN** Optimizer MUST 生成 Search/Replace blocks 将该类替换为独立函数

#### Scenario: 检测到过度参数化接口
- **WHEN** Optimizer 读取实现文件，发现一个方法接收 6 个独立参数
- **THEN** Optimizer MUST 生成 Search/Replace blocks 将这些参数封装为配置对象或专用参数类

#### Scenario: 合并相关浅模块
- **WHEN** Optimizer 读取实现文件，发现两个类各有 2 个方法，且操作相同数据
- **THEN** Optimizer MUST 生成 Search/Replace blocks 将它们合并为一个更深的模块

#### Scenario: 模块已足够深
- **WHEN** Optimizer 读取实现文件，发现类有 5 个以上方法且内部实现复杂
- **THEN** Optimizer 跳过浅模块检测，继续下一个坏味道维度

### Requirement: 原始类型痴迷消除检测
Optimizer Subagent 在扫描实现文件时，MUST 识别具有领域意义的原始类型（字符串、数字），并生成替换为值对象的 Search/Replace blocks。

候选类型：
- Email、URL、电话号码字符串
- 货币金额（数字 + 货币代码）
- 日期范围（开始日期 + 结束日期）
- 带验证规则的标识符

值对象化收益：
- 验证逻辑封装一次
- 领域概念的类型安全
- 代码自文档化

#### Scenario: 检测到 Email 字符串
- **WHEN** Optimizer 读取实现文件，发现多处使用 `email: string` 且包含正则验证
- **THEN** Optimizer MUST 生成 Search/Replace blocks 创建 `Email` 值对象类，封装验证逻辑

#### Scenario: 检测到货币金额原始类型
- **WHEN** Optimizer 读取实现文件，发现函数同时接收 `amount: number` 和 `currency: string` 参数
- **THEN** Optimizer MUST 生成 Search/Replace blocks 创建 `Money` 值对象类，封装金额和货币

#### Scenario: 检测到日期范围原始类型
- **WHEN** Optimizer 读取实现文件，发现多处传递 `startDate: Date, endDate: Date` 参数对
- **THEN** Optimizer MUST 生成 Search/Replace blocks 创建 `DateRange` 值对象类

#### Scenario: 原始类型使用合理
- **WHEN** Optimizer 读取实现文件，发现原始类型仅作简单传递，无验证或领域逻辑
- **THEN** Optimizer 跳过原始类型痴迷检测，继续下一个坏味道维度

### Requirement: 重复消除增强指标
Optimizer Subagent 在现有"Lower duplication"维度基础上，MUST 增加具体的代码坏味道识别指标。

坏味道指标：
- 2 个及以上位置存在相同或近似相同的逻辑块
- 复制粘贴的验证/转换逻辑
- 重复的错误处理模式

#### Scenario: 识别相同验证逻辑
- **WHEN** Optimizer 读取实现文件，发现 3 个函数中都有相同的输入验证代码
- **THEN** Optimizer MUST 生成 Search/Replace blocks 提取共享验证函数

#### Scenario: 识别重复错误处理
- **WHEN** Optimizer 读取实现文件，发现多处使用相同的 try-catch 模式
- **THEN** Optimizer MUST 生成 Search/Replace blocks 提取错误处理装饰器或包装函数

### Requirement: 局部性优化增强指标
Optimizer Subagent 在现有"Better locality"维度基础上，MUST 增加 Feature Envy 坏味道的具体识别指标。

Feature Envy 指标：
- 方法主要操作另一个类的数据
- 过度使用 getter 链（如 `a.getB().getC().doX()`）
- 逻辑应属于数据所有者但放在错误位置

#### Scenario: 识别 Feature Envy
- **WHEN** Optimizer 读取实现文件，发现一个方法多次调用另一个对象的 getter 并操作其数据
- **THEN** Optimizer MUST 生成 Search/Replace blocks 将该逻辑迁移到数据所有者类中

#### Scenario: 识别 getter 链
- **WHEN** Optimizer 读取实现文件，发现代码中存在 `order.getCustomer().getAddress().getCity()` 形式的调用
- **THEN** Optimizer MUST 生成 Search/Replace blocks 在 `Order` 类中添加 `getCustomerCity()` 方法，封装该访问路径

### Requirement: 控制流清晰增强指标
Optimizer Subagent 在现有"Clearer control flow"维度基础上，MUST 增加长方法和深度嵌套的具体识别指标。

坏味道指标：
- 方法超过 30 行
- 条件嵌套深度超过 3 层
- 多个返回路径被嵌套隐藏

#### Scenario: 识别深度嵌套条件
- **WHEN** Optimizer 读取实现文件，发现 if-else 嵌套深度达到 4 层
- **THEN** Optimizer MUST 生成 Search/Replace blocks 使用提前返回（early return）减少嵌套

#### Scenario: 识别隐藏的返回路径
- **WHEN** Optimizer 读取实现文件，发现方法有 5 个返回语句分散在深层嵌套中
- **THEN** Optimizer MUST 生成 Search/Replace blocks 重构为卫语句模式，使主路径清晰

### Requirement: 坏味道类型标注
Optimizer Subagent 在生成 Search/Replace blocks 时，MUST 在每个 block 前添加注释，标注该 block 解决的坏味道类型。

标注格式：
```
<!-- Code Smell: <smell-type> -->
<<<PATH: relative/path/to/file.ts
...
```

坏味道类型枚举：
- `Duplication`
- `Long Method`
- `Shallow Module`
- `Feature Envy`
- `Primitive Obsession`
- `Deep Nesting`
- `Dead Code`

#### Scenario: 标注重复消除 block
- **WHEN** Optimizer 生成提取共享函数的 Search/Replace block
- **THEN** block 前 MUST 包含 `<!-- Code Smell: Duplication -->` 注释

#### Scenario: 标注长方法 block
- **WHEN** Optimizer 生成拆分长方法的 Search/Replace block
- **THEN** block 前 MUST 包含 `<!-- Code Smell: Long Method -->` 注释

#### Scenario: 标注原始类型痴迷 block
- **WHEN** Optimizer 生成值对象化的 Search/Replace block
- **THEN** block 前 MUST 包含 `<!-- Code Smell: Primitive Obsession -->` 注释
