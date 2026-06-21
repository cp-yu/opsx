# verify-skill-reference-files Specification

## Purpose

Phase 2 checkpoint 协议现由 reviewer.ts 子代理模型和 apply-change.ts Phase 2 编排段落共同承载。该协议确保 optimizer 优化失败时可安全回滚到 checkpoint 状态。

## Requirements
### Requirement: Checkpoint 协议由 reviewer.ts 和 apply-change.ts 承载

Phase 2 checkpoint 协议 SHALL 由 `reviewer.ts` 子代理 contract 和 `apply-change.ts` Phase 2 编排段落定义，不再依赖独立的 reference 文件机制。

#### Scenario: Checkpoint 由 reviewer subagent contract 定义

- **WHEN** reviewer subagent 执行 Phase 2 优化相关验证
- **THEN** checkpoint 生命周期（CREATED、BASELINE_RESTORED_FOR_RETRY、TERMINAL_ACCEPTED、TERMINAL_RESTORED）SHALL 由 reviewer.ts 子代理 contract 内联承载
- **AND** git stash 操作（push/apply/drop/pop）SHALL 在 reviewer contract 中定义

#### Scenario: apply-change Phase 2 编排使用 checkpoint

- **WHEN** apply 模板执行 Phase 2 优化循环
- **THEN** apply-change.ts Phase 2 编排段落 SHALL 定义 checkpoint 创建、恢复和消费流程
- **AND** 失败时 SHALL 恢复 baseline 并记录 failedDirections
