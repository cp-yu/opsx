## ADDED Requirements

### Requirement: 内部 subagent skill 引用替换内联 fragment
verify/apply/archive 三个模板中 spawn reviewer subagent 的步骤 SHALL 从传递内联 fragment 文本改为 invoke 对应的 `openspec-reviewer` skill。Spawn optimizer subagent 的步骤 SHALL 从传递内联 fragment 文本改为 invoke 对应的 `openspec-optimizer` skill。

模板中的 invoke 指令 SHALL 使用工具适配的 skill 名称引用（如 Claude Code 使用 `openspec-reviewer`，Codex 使用 `$openspec-reviewer`），利用 `cap.ai.tool-invocation-references` 的现有变换管线。

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
- **THEN** 原内联的 reviewer 合约文本 SHALL 被替换为简短的 invoke 指令
- **AND** 模板 SHALL 不因篇幅膨胀而降低可维护性

### Requirement: 向后兼容 reread 模式
`current-agent-reread` 执行模式 SHALL 不受影响。不支持 subagent skill invoke 的工具 SHALL 继续使用 reread 骨架，无需加载内部 skill 文件。

#### Scenario: Reread 模式不尝试 invoke 内部 skill
- **WHEN** 当前工具不支持 clean-context subagent verify
- **THEN** 系统 SHALL 使用 reread 骨架
- **AND** SHALL NOT 尝试 invoke 不存在或不可用的 openspec-reviewer/optimizer skill