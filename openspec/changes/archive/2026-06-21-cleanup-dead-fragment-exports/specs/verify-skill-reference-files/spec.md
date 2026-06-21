## ADDED Requirements

### Requirement: verify skill reference files 随模板删除而移除

verify-change 技能模板 SHALL 已被删除（commit 763d9d6f）。该模板原本 SHALL 通过 referenceFiles 机制提供 Phase 2 checkpoint 协议，但该协议现由 reviewer.ts 子代理模型和 apply-change.ts Phase 2 编排段落共同承载。

#### Scenario: 已删除模板不生成 reference 文件

- **WHEN** 系统生成 workflow skills
- **THEN** 系统 SHALL NOT 生成 `openspec/references/openspec-phase2-checkpoint-protocol.md`
- **AND** SHALL NOT 引用不存在的 `PHASE2_CHECKPOINT_PROTOCOL_REFERENCE` 常量

#### Scenario: checkpoint 协议由 reviewer.ts 承载

- **WHEN** reviewer subagent 执行 Phase 2 优化相关验证
- **THEN** checkpoint 协议 SHALL 由 reviewer.ts 子代理 contract 和 apply-change.ts Phase 2 编排段落定义
- **AND** SHALL NOT 依赖已删除的 verify-change 模板中的 referenceFiles 机制
