## MODIFIED Requirements

### Requirement: 内部 subagent skill 引用替换内联 fragment

verify/apply/archive 三个模板中 spawn reviewer subagent 的步骤 SHALL invoke 对应的 `openspec-reviewer` skill。Spawn optimizer subagent 的步骤 SHALL invoke 对应的 `openspec-optimizer` skill。

模板中的 invoke 指令 SHALL 使用工具适配的 skill 名称引用，利用 `cap.ai.tool-invocation-references` 的现有变换管线。

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

- **WHEN** verify 模板执行 Phase 1
- **THEN** 模板 SHALL 指示顶层 agent spawn clean-context subagent 并 invoke `openspec-reviewer` skill
- **AND** SHALL 同时传递显式证据包作为 subagent 的输入上下文
- **AND** SHALL NOT 内联输出验证协议、严重性阈值或证据标准的文本

#### Scenario: Apply 模板 Phase 2 的 optimizer subagent

- **WHEN** apply 模板执行 Phase 2 优化循环
- **AND** 需要 spawn optimizer subagent
- **THEN** 模板 SHALL 指示主 agent spawn subagent 并 invoke `openspec-optimizer` skill
- **AND** SHALL 传递 Phase 1 结果、制品、文件内容、config 和 failedDirections

### Requirement: Verify template 包含 coordinator 角色和 mode label

verify-change template（`buildVerifyIntro`）SHALL 在编号步骤开始前包含显式 coordinator role declaration 和 mode label reference table。

role declaration SHALL 将 coordinator、reviewer subagent、optimizer subagent 和 CLI 定义为职责互不重叠的独立角色。

mode label table SHALL 列出 `verify-prompt-orchestration` capability 中定义的全部 mode label 及其对应 phase 和 trigger。

#### Scenario: Verify prompt 组装时包含角色声明

- **WHEN** verify prompt is assembled
- **THEN** 生成的 skill instructions SHALL 以 coordinator role declaration 开头
- **AND** SHALL 包含 mode label reference table
- **AND** 现有 `"Verify that an implementation matches..."` 文本 SHALL 跟在这些新增内容之后

#### Scenario: Reread mode 同样接收角色和 mode label

- **WHEN** verify prompt is assembled for any supported tool
- **THEN** 生成的 skill instructions SHALL 包含 coordinator role 和 mode label table
- **AND** SHALL use subagent orchestration instructions

## REMOVED Requirements

### Requirement: 向后兼容 reread 模式

**Reason**: 所有 workflow templates now assume subagent support.
**Migration**: Use subagent-orchestrated verify/apply/archive templates for all generated skills.
