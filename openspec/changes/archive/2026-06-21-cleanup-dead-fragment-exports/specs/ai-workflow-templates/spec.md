## MODIFIED Requirements

### Requirement: 内部 subagent skill 引用替换内联 fragment

verify/apply/archive 三个模板中 spawn reviewer subagent 的步骤 SHALL invoke 对应的 `openspec-reviewer` skill。Spawn optimizer subagent 的步骤 SHALL invoke 对应的 `openspec-optimizer` skill。

模板中的 invoke 指令 SHALL 使用工具适配的 skill 名称引用，利用 `cap.ai.tool-invocation-references` 的现有变换管线。

#### Scenario: Verify 模板 spawn reviewer subagent

- **WHEN** verify 模板执行 Phase 1
- **THEN** 模板 SHALL 指示顶层 agent spawn clean-context subagent 并 invoke `openspec-reviewer` skill
- **AND** SHALL 同时传递显式证据包作为 subagent 的输入上下文
- **AND** SHALL NOT 内联输出验证协议、严重性阈值或证据标准的文本

### Requirement: Verify template 包含 coordinator 角色和 mode label

verify-change 模板 SHALL NOT 再包含 coordinator role declaration 和 mode label reference table，因为该模板已被删除（commit 763d9d6f）。coordinator 角色声明现由 `reviewer.ts` 子代理模型承载。

#### Scenario: 已删除模板不包含角色声明

- **WHEN** 系统生成 verify workflow skill
- **THEN** 生成的 skill instructions SHALL 以 reviewer.ts 子代理 contract 中的角色定义为准
- **AND** SHALL NOT 再包含 verify-change 模板中的 coordinator role declaration

### Requirement: Verify fragment 提取到 opsx-fragments.ts

`VERIFY_COORDINATOR_ROLE` 和 `VERIFY_SUBAGENT_TIMEOUT_RULES` fragments SHALL 已从 `src/core/templates/fragments/opsx-fragments.ts` 中删除。消费方 `verify-change.ts` 已被删除，无其他模板 SHALL import 这些 fragments。coordinator 角色声明和 subagent 超时规则现由 `reviewer.ts` 子代理 contract 内联承载。

#### Scenario: 死 fragments 不再存在

- **WHEN** 开发者读取 `opsx-fragments.ts`
- **THEN** 该文件 SHALL NOT 包含 `VERIFY_COORDINATOR_ROLE` 或 `VERIFY_SUBAGENT_TIMEOUT_RULES` 导出
- **AND** 文件中的 "Used in:" 注释 SHALL NOT 引用已删除的 `verify-change.ts`
