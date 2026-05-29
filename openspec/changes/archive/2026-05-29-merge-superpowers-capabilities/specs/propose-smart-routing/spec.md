## ADDED Requirements

### Requirement: Propose 必须检测 explore 上下文

Propose 阶段 SHALL 检测对话历史中是否存在 explore 的设计总结。

#### Scenario: 检测 Design Summary

- **WHEN** 用户调用 `/opsx:propose <change-name>`
- **THEN** 系统扫描对话历史，查找 explore 生成的 Design Summary
- **THEN** 如果找到，系统提取 Design Summary 内容

#### Scenario: 同会话 explore

- **WHEN** 用户在同一会话中先调用 `/opsx:explore`，再调用 `/opsx:propose`
- **THEN** 系统能够找到 explore 的 Design Summary
- **THEN** 系统使用 Design Summary 生成制品

#### Scenario: 新会话无 explore

- **WHEN** 用户在新会话中直接调用 `/opsx:propose`
- **THEN** 系统无法找到 explore 的 Design Summary
- **THEN** 系统进入智能判断流程

### Requirement: 判断输入详细程度

系统 SHALL 根据用户输入的详细程度判断是否需要 explore。

#### Scenario: 计算详细程度分数

- **WHEN** 系统无法找到 explore 上下文
- **THEN** 系统分析用户输入，检查以下维度：
  - 是否包含明确的技术栈/库（如 "使用 JWT + Passport.js"）
  - 是否包含数据模型/接口定义（如 "users 表包含 id, email, password_hash"）
  - 是否包含 API 端点或函数签名（如 "POST /auth/register"）
  - 是否包含测试策略（如 "单元测试覆盖认证逻辑"）
  - 是否包含边界条件/错误处理（如 "登录失败 5 次后锁定账户"）
- **THEN** 系统计算详细程度分数（满足的维度数量）

#### Scenario: 详细输入（分数 ≥ 3）

- **WHEN** 详细程度分数 ≥ 3 且输入长度 > 100 字
- **THEN** 系统判定为"详细输入"
- **THEN** 系统显示："输入足够详细，跳过 explore，直接生成制品。"
- **THEN** 系统继续生成制品

#### Scenario: 简单输入（分数 < 3）

- **WHEN** 详细程度分数 < 3 或输入长度 ≤ 100 字
- **THEN** 系统判定为"简单输入"
- **THEN** 系统显示："输入过于简单，建议先运行 `/opsx:explore` 澄清需求和设计方案。"
- **THEN** 系统停止，等待用户调用 explore

### Requirement: 检测多子系统

系统 SHALL 检测用户输入是否涉及多个独立子系统。

#### Scenario: 识别多子系统关键词

- **WHEN** 用户输入包含以下模式：
  - "包含"、"以及"、"和" 连接的 3 个以上并列功能
  - "平台"、"系统" 等宏观词汇
  - 明确列举的多个模块（如 "用户管理、商品管理、订单管理"）
- **THEN** 系统判定为"多子系统"

#### Scenario: 多子系统强制 explore

- **WHEN** 系统判定为"多子系统"
- **THEN** 系统显示："这个需求涉及多个独立子系统，建议先运行 `/opsx:explore` 进行拆解。"
- **THEN** 系统停止，等待用户调用 explore

#### Scenario: 多子系统示例

- **WHEN** 用户输入："构建电商平台，包含用户管理、商品管理、订单管理、支付集成、库存管理"
- **THEN** 系统识别出 5 个并列功能
- **THEN** 系统判定为"多子系统"，强制 explore

### Requirement: 从 Design Summary 提取信息

系统 SHALL 从 explore 的 Design Summary 中提取信息生成制品。

#### Scenario: 提取架构方案

- **WHEN** 系统找到 Design Summary
- **THEN** 系统从"架构方案"部分提取选定的方案和理由
- **THEN** 系统将其写入 design.md 的"Decisions"部分

#### Scenario: 提取核心组件

- **WHEN** 系统找到 Design Summary
- **THEN** 系统从"核心组件"部分提取组件列表、职责、接口
- **THEN** 系统将其写入 design.md 的相关部分
- **THEN** 系统根据组件生成 tasks.md 的任务列表

#### Scenario: 提取技术栈

- **WHEN** 系统找到 Design Summary
- **THEN** 系统从"技术栈"部分提取具体技术选择
- **THEN** 系统将其写入 design.md 的"Context"部分
- **THEN** 系统在 tasks.md 的 Requirements 中引用技术栈

#### Scenario: 提取测试策略

- **WHEN** 系统找到 Design Summary
- **THEN** 系统从"测试策略"部分提取测试覆盖范围
- **THEN** 系统在 tasks.md 的 Checks 中生成对应的测试验证项

#### Scenario: 提取风险和权衡

- **WHEN** 系统找到 Design Summary
- **THEN** 系统从"风险和权衡"部分提取已知风险和缓解措施
- **THEN** 系统将其写入 design.md 的"Risks / Trade-offs"部分

### Requirement: 生成粗粒度 tasks.md

系统 SHALL 生成粗粒度的 tasks.md，包含 Goal/Files/Requirements/Checks 结构。

#### Scenario: 从 Design Summary 生成任务

- **WHEN** 系统从 Design Summary 提取了核心组件
- **THEN** 系统为每个组件生成一个任务
- **THEN** 每个任务包含：
  - Goal（组件的职责描述）
  - Files（需要创建或修改的文件）
  - Requirements（功能需求列表）
  - Checks（验证项，关联到 specs）

#### Scenario: 任务粒度控制

- **WHEN** 系统生成任务
- **THEN** 每个任务的 Requirements 不超过 5 条
- **THEN** 如果组件过于复杂，系统拆分为多个任务
- **THEN** 任务之间的依赖关系在 tasks.md 中明确标注

#### Scenario: Files 路径生成

- **WHEN** 系统生成 Files 列表
- **THEN** 路径使用 POSIX 格式（forward slash）
- **THEN** 路径相对于项目根目录
- **THEN** 明确标注 Create（创建新文件）或 Modify（修改现有文件）

### Requirement: 智能路由决策透明

系统 SHALL 向用户明确说明智能路由的决策过程。

#### Scenario: 显示判断依据

- **WHEN** 系统做出"跳过 explore"或"需要 explore"的决策
- **THEN** 系统显示判断依据：
  - 输入长度：<N> 字
  - 详细程度分数：<M>/5
  - 是否多子系统：是/否
  - 决策：跳过 explore / 需要 explore

#### Scenario: 用户可以覆盖决策

- **WHEN** 系统建议"需要 explore"
- **THEN** 用户可以选择："我确认输入已足够详细，直接生成制品"
- **THEN** 系统尊重用户选择，继续生成制品

#### Scenario: 记录决策日志

- **WHEN** 系统做出智能路由决策
- **THEN** 系统在 proposal.md 的开头添加注释：
  ```markdown
  <!-- 智能路由决策：
  - 输入长度：150 字
  - 详细程度分数：4/5（技术栈、数据模型、API、测试策略）
  - 决策：跳过 explore
  -->
  ```

### Requirement: 向后兼容

系统 SHALL 保持与现有 propose 行为的向后兼容。

#### Scenario: 无 explore 上下文且详细输入

- **WHEN** 用户在新会话中提供详细输入
- **THEN** 系统行为与当前 propose 一致（直接生成制品）
- **THEN** 用户体验无变化

#### Scenario: 配置开关

- **WHEN** 用户在 `openspec/config.yaml` 中设置 `propose.requireExplore: false`
- **THEN** 系统跳过智能判断，始终直接生成制品
- **THEN** 用户可以选择退回旧行为

#### Scenario: 渐进式启用

- **WHEN** 系统首次引入智能路由
- **THEN** 默认配置为 `propose.smartRouting: true`
- **THEN** 用户可以通过配置禁用
- **THEN** 文档明确说明新旧行为差异
