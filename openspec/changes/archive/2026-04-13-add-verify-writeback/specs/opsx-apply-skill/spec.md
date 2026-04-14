## ADDED Requirements

### Requirement: Apply 读取 Verify 诊断信息

当 `.verify-result.json` 存在时，`/opsx:apply` SHALL 读取 verify 的诊断信息，将其作为修复上下文注入任务实现循环。

#### Scenario: 检测到 verify 结果文件

- **WHEN** apply 在 Step 4（读取上下文）阶段检测到 `openspec/changes/<name>/.verify-result.json` 存在
- **AND** result 为 `FAIL_NEEDS_REMEDIATION`
- **THEN** apply SHALL 读取该文件的 `issues` 数组
- **AND** 在 Step 5（显示进度）中额外展示：上次 verify 发现的 CRITICAL issues 摘要
- **AND** 在 Step 6（实现循环）中，对每个被 unmark 的 task，将对应的 verify issue 作为修复指导注入上下文

#### Scenario: 检测到 remediation section

- **WHEN** apply 读取 `tasks.md` 发现存在 `## Remediation` section
- **THEN** apply SHALL 将 remediation 条目视为优先修复项
- **AND** 在实现被 unmark 的 task 时，引用对应的 remediation 条目（包含 `[code_fix]` 或 `[artifact_fix]` 类型标注）作为修复方向

#### Scenario: verify 结果为 PASS 或不存在

- **WHEN** `.verify-result.json` 不存在
- **OR** result 为 `PASS` 或 `PASS_WITH_WARNINGS`
- **THEN** apply SHALL 按原有逻辑执行，不注入额外修复上下文

#### Scenario: 修复完成后清理 remediation section

- **WHEN** apply 完成所有 remediation 条目的修复
- **AND** 所有 remediation checkbox 标记为 `[x]`
- **THEN** apply SHALL 在完成提示中建议重新运行 `/opsx:verify` 以确认修复有效

#### Scenario: artifact_fix 类型的 remediation 处理

- **WHEN** apply 遇到 `[artifact_fix]` 类型的 remediation 条目
- **THEN** apply SHALL 修改对应的 artifact（spec 或 design）而非代码
- **AND** 标记该 remediation 为完成
