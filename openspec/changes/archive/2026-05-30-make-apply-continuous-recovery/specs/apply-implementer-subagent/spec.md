## MODIFIED Requirements

### Requirement: Implementer 必须报告执行状态

系统 SHALL 在执行完成或遇到问题时报告明确的结构化状态。`BLOCKED` 和 `NEEDS_CONTEXT` 是给 Master agent 的 recovery 输入，默认不直接触发用户可见 pause。

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
- **AND** 系统 SHALL 返回结构化错误签名字段：
  - task identifier
  - cycle identifier
  - step identifier
  - command
  - failure kind
  - error summary
- **AND** Master agent SHALL 使用这些字段修正 step file、artifact 或实现方向后重试
- **AND** 系统 SHALL NOT 在第一次 `BLOCKED` 时直接询问用户

#### Scenario: 需要更多上下文报告 NEEDS_CONTEXT

- **WHEN** Implementer 无法理解详细步骤中的某些指示
- **THEN** 系统报告状态 `NEEDS_CONTEXT`
- **AND** 系统 SHALL 返回结构化错误签名字段：
  - task identifier
  - cycle identifier
  - step identifier
  - command when applicable
  - failure kind
  - error summary
- **AND** Master agent SHALL 补充或重写相关 step file 内容后重试
- **AND** 系统 SHALL NOT 在第一次 `NEEDS_CONTEXT` 时直接询问用户

#### Scenario: 完成但有疑虑报告 DONE_WITH_CONCERNS

- **WHEN** 所有步骤都执行完成，但 Implementer 对结果有疑虑
- **THEN** 系统报告状态 `DONE_WITH_CONCERNS`
- **THEN** 系统返回疑虑内容：
  - 哪些地方不确定
  - 建议进行额外验证
- **AND** Master agent SHALL 验证疑虑并决定标记 task 完成或进入 recovery loop

#### Scenario: 同一错误重复升级为用户暂停

- **WHEN** Implementer 在同一 task 上返回与上一轮相同的 normalized error signature
- **AND** Master agent 已经针对该 signature 执行过 remediation
- **AND** 该 signature 连续失败次数达到 2
- **THEN** Master agent SHALL pause 并向用户报告稳定复现的 blocker
