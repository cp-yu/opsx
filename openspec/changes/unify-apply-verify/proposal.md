## Why

当前 OPSX 工作流中，`apply`（实现任务）和 `verify`（验证+优化）是两个独立的命令。apply 完成后工作区状态不确定——用户必须单独运行 verify 才能确认实现是否正确、代码是否已优化。这违背了 `apply` 在 OPSX 中的语义：apply 应该是"编译"步骤，编译要么成功产出验证过的制品，要么失败并报告错误。

## What Changes

- **BREAKING**: 将 verify 的 Phase 1（一致性验证）和 Phase 2（最优性检验）集成到 `apply` 命令中，apply 输出即验证过的结果
- **BREAKING**: `/opsx:apply` 不再仅仅是"实现任务"，而是完整的"编译"操作——实现 + 验证 + 优化
- verify 的 Phase 1（一致性验证）和 Phase 2（优化提案）均由 subagent 执行，主 agent 仅负责编码（实现任务 + 应用优化补丁）
- Phase 2 优化循环简化为：优化提案（subagent）→ 应用补丁（主 agent）→ 再验证 Phase 1（subagent），重试预算由 `config.optimization.optRetries`（默认 2）统一控制
- 失败方向记录到 `.verify-result.json`，避免新会话重复尝试相同优化策略
- `openspec verify` CLI 保留为底层工具，用户不直接触及
- `/opsx:verify` skill 保留不动（expanded 模式下的逃生舱）
- `--skip-optimization` flag 和 `optimization.enabled` 配置继续有效

## Capabilities

### New Capabilities

- `apply-verify-integration`: apply 命令内置验证门禁——实现完成后自动执行 Phase 1 一致性验证和 Phase 2 优化循环，确保 apply 输出即验证过的制品

### Modified Capabilities

- `verify-cli-gate`: Phase 2 状态机从双调用模型（`--type=optimization` + `--type=verification`）简化，优化和验证的循环逻辑上移到 apply 模板，verify CLI 仅保留状态持久化能力
- `verify-optimization`: 优化循环从三独立预算（format/match/behavior）简化为单一 `optRetries`，优化方向记录支持跨会话去重
- `ai-workflow-templates`: apply 模板扩展为三阶段（实现 → 验证 → 优化），verify 模板不再作为独立 workflow surface 暴露

## Impact

- 受影响代码: `src/commands/verify.ts`, `src/core/verify/`, `src/core/templates/workflows/apply-change.ts`, `src/core/templates/workflows/verify-change.ts`, `src/core/config.ts`
- 受影响配置: `openspec/config.yaml` 新增 `optimization.optRetries` 字段
- 受影响 CLI: `openspec verify phase2` 的双调用模型可能简化
- 受影响技能: `openspec-apply-change` 技能模板大幅扩展, `openspec-verify-change` 技能模板保留但不再作为独立 workfow surface
