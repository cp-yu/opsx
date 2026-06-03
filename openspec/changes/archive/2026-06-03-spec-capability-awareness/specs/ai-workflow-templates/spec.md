## MODIFIED Requirements

### Requirement: 内部 subagent skill 引用替换内联 fragment
verify/apply/archive 三个模板中 spawn reviewer subagent 的步骤 SHALL 从传递内联 fragment 文本改为 invoke 对应的 `openspec-reviewer` skill。Spawn optimizer subagent 的步骤 SHALL 从传递内联 fragment 文本改为 invoke 对应的 `openspec-optimizer` skill。

模板中的 invoke 指令 SHALL 使用工具适配的 skill 名称引用（如 Claude Code 使用 `openspec-reviewer`，Codex 使用 `$openspec-reviewer`），利用 `cap.ai.tool-invocation-references` 的现有变换管线。

#### Scenario: Propose 模板包含 spec 发现指令

- **WHEN** propose 模板被加载
- **THEN** SHALL 包含步骤指示 LLM 运行 `openspec spec list --json` 获取现有 specs 及其 capabilities 关联
- **AND** SHALL 指示 LLM 交叉对比提议的新 capabilities 与已有 specs，避免创建冗余 spec

#### Scenario: Apply 模板包含 spec 交叉检查指令

- **WHEN** apply-change 模板被加载
- **THEN** SHALL 包含步骤指示 LLM 在实现 capability 前查询关联的所有 specs
- **AND** SHALL 指示 LLM 运行 `openspec spec list --json` 获取 cap→spec 映射
- **AND** SHALL 指示 LLM 确认是否需要同步更新 delta spec

#### Scenario: Verify 模板 spawn reviewer subagent
- **WHEN** verify 模板在 subagent-orchestrated 模式下执行 Phase 1
- **AND** 当前 AI 工具支持 subagent skill invoke
- **THEN** 模板 SHALL 指示顶层 agent spawn clean-context subagent 并 invoke `openspec-reviewer` skill
- **AND** SHALL 同时传递显式证据包作为 subagent 的输入上下文
- **AND** SHALL NOT 内联输出验证协议、严重性阈值或证据标准的文本

#### Scenario: Apply 模板 Phase 2 的 optimizer subagent
- **WHEN** apply 模板执行 Phase 2 优化循环
- **AND** 需要 spawn optimizer subagent
- **THEN** 模板 SHALL 指示主 agent spawn subagent 并 invoke `openspec-optimizer` skill
- **AND** SHALL 传递 Phase 1 结果、制品、文件内容、config 和 failedDirections

### Requirement: 模板不内联 subagent 角色定义
verify/apply/archive 模板 SHALL NOT 在模板 body 中内联 reviewer 或 optimizer 的完整角色定义、验证协议、判断标准或输出格式。这些内容归对应的 skill 文件所有。

模板 SHALL 保留以下 orchestration 职责的描述：证据包收集、subagent spawn 与 invoke、payload 校验、CLI 持久化、checkpoint 管理和写回执行。

#### Scenario: 模板内容精简
- **WHEN** 比较改进前后的 verify 模板
- **THEN** 改进后模板 SHALL NOT 包含 reviewer 的验证维度列表、severity 定义、或输出 JSON schema
- **AND** 改进后模板 SHALL 保留 evidence 包组装和 subagent spawn 指令
