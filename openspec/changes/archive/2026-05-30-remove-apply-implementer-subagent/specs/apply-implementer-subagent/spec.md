## MODIFIED Requirements

### Requirement: apply 不再调用 implementer subagent

系统 SHALL NOT 在 apply Phase 0 中生成、安装或调用 `openspec-implementer`。

#### Scenario: apply workflow 不 dispatch implementer

- **WHEN** Master agent 执行 apply Phase 0
- **THEN** 系统直接实现 pending task
- **AND** 系统 SHALL NOT dispatch coding subagent

#### Scenario: internal skill 列表显式排除 implementer

- **WHEN** 系统生成 internal skills
- **THEN** internal skill 列表 SHALL 包含 reviewer、optimizer 和 impact-sweeper
- **AND** internal skill 列表 SHALL NOT 包含 `openspec-implementer`

#### Scenario: clean-context gate 保持不变

- **WHEN** Phase 0 实现完成
- **THEN** 系统仍 SHALL 使用 reviewer 进行 Phase 1 判断
- **AND** 系统仍 SHALL 使用 optimizer 判断 Phase 2 优化机会
