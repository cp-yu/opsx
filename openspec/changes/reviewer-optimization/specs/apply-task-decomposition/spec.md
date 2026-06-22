---
capabilities:
  - cap.apply.task-decomposition
---

# apply-task-decomposition Delta Spec

## MODIFIED Requirements

### Requirement: 任务执行失败处理

系统 SHALL 在任务执行遇到非预期失败时先执行诊断后再尝试修复，每次修复只改变一个变量，并在同一 task 累计 3 次修复尝试仍未解决时停止并向用户呈现证据。连续 2 次相同 normalized error signature 仍作为快速 pause 路径保留。

#### Scenario: 任务需求不明确

- **WHEN** Master agent 发现任务的 Goal 或 Requirements 过于模糊
- **THEN** 系统 SHALL 使用 proposal、design、change-local specs、tasks.md、OPSX code-map 和相关项目文件补足可执行上下文
- **AND** 系统 SHALL NOT 仅因首次发现模糊点就询问用户

#### Scenario: 项目上下文不足

- **WHEN** Master agent 无法找到相关的现有代码或模式
- **THEN** 系统 SHALL 读取 OPSX code-map、相关 specs、邻近模板测试和项目搜索结果补足上下文
- **AND** 系统 SHALL 将���失上下文转化为当前任务中的可验证探索或检查步骤
- **AND** 系统 SHALL 继续 apply recovery loop

#### Scenario: 任务过于复杂

- **WHEN** Master agent 判断任务过大
- **THEN** 系统 SHALL 在当前任务内按最小可验证批次执行
- **AND** 系统 SHALL NOT 因为任务可拆分而要求生成新的中间制品

#### Scenario: 同一错误重复失败快速暂停

- **WHEN** 同一 task 的同一 normalized error signature 连续失败 2 次
- **THEN** 系统 SHALL pause
- **AND** pause 输出 SHALL 包含 task、check、command、failure kind、error summary 和已尝试的 remediation
- **AND** 系统 SHALL 等待用户指导

#### Scenario: 累计修复次数达到上限

- **WHEN** 同一 task 累计 3 次修复尝试仍未解决问题
- **THEN** 系统 SHALL 停止修复
- **AND** 系统 SHALL 向用户呈现已尝试的路径、根因判断和怀疑方向
- **AND** 系统 SHALL 等待用户指导
