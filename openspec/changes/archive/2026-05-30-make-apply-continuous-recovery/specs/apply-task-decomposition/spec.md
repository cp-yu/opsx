## MODIFIED Requirements

### Requirement: 任务拆解失败处理

系统 SHALL 在任务拆解遇到复杂度或上下文问题时优先生成可执行的 bounded TDD 步骤，并仅在同一 task 的同一 normalized error signature 经 master remediation 后连续失败 2 次时暂停。

#### Scenario: 任务需求不明确

- **WHEN** Master agent 发现任务的 Goal 或 Requirements 过于模糊
- **THEN** 系统 SHALL 使用 proposal、design、change-local specs、tasks.md 和相关项目文件补足可执行上下文
- **AND** 系统 SHALL 更新 `.apply-steps/task-N-<name>.md` 后继续 dispatch implementer
- **AND** 系统 SHALL NOT 仅因首次发现模糊点就询问用户

#### Scenario: 项目上下文不足

- **WHEN** Master agent 无法找到相关的现有代码或模式
- **THEN** 系统 SHALL 读取 OPSX code-map、相关 specs、邻近模板测试和项目搜索结果补足上下文
- **AND** 系统 SHALL 将缺失上下文转化为 step file 中的可验证探索或检查步骤
- **AND** 系统 SHALL 继续执行 apply recovery loop

#### Scenario: 任务过于复杂

- **WHEN** Master agent 判断任务需要 > 5 个 TDD Cycle
- **THEN** 系统 SHALL 将该任务自动拆分为多个 bounded step file 或 bounded batches
- **AND** 每个 step file 或 batch SHALL 包含 1-5 个 TDD Cycle
- **AND** 系统 SHALL 按顺序 dispatch implementer 继续执行
- **AND** 系统 SHALL NOT 因为超过 5 个 TDD Cycle 而暂停并要求用户拆分

#### Scenario: 同一错误重复失败才暂停

- **WHEN** 同一 task 的同一 normalized error signature 在 master remediation 后连续失败 2 次
- **THEN** 系统 SHALL pause
- **AND** pause 输出 SHALL 包含 task、cycle、step、command、failure kind、error summary 和已尝试的 remediation
- **AND** 系统 SHALL 等待用户指导

#### Scenario: 错误变化继续执行

- **WHEN** 同一 task 重试后失败原因变为不同 normalized error signature
- **THEN** 系统 SHALL 将其视为有进展
- **AND** 系统 SHALL 继续 recovery loop
- **AND** 系统 SHALL NOT 将其计入前一个错误签名的连续失败次数
