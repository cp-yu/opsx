## 1. 配置和类型定义

- [x] 1.1 在 `openspec/config.yaml` schema 中新增 `optimization.optRetries` 字段（默认 2）
- [x] 1.2 在 `src/core/verify/types.ts` 中新增 `failedDirections: string[]` 字段到 `VerifyOptimization` 接口
- [x] 1.3 更新 `OptimizationStatus` 类型定义，确认 `IMPROVED | DEGRADED | NOT_NEEDED | SKIPPED` 终态完整

## 2. Verify CLI 适配

- [x] 2.1 修改 `src/commands/verify.ts` 的 `handleVerification` 函数，将硬编码的 `behaviorRetryCounter >= 3` 改为读取 `config.optimization.optRetries`
- [x] 2.2 修改 `handleVerification` 在验证失败时（可重试路径）追加失败方向到 `optimization.failedDirections[]`
- [x] 2.3 修改 `handleOptimization` 在 `OPTIMIZATION_PROPOSED` 路径中记录优化方向到 `optimization.attempts`
- [x] 2.4 确认 `failedDirections` 采用 lazy init（首次写入时 `?? []` 初始化），无需在 `verifyPhase1` 或 `phase1Baseline` 中预分配空数组。无失败记录的 `.verify-result.json` 中该字段不存在，语义上区别于"尝试过但无失败"
- [x] 2.5 更新 `src/core/verify/result-validator.ts` 的 `validateVerifyResult` 确认新增字段不破坏 seal 校验

## 3. Apply 模板重构

- [x] 3.1 修改 `src/core/templates/workflows/apply-change.ts`，将 apply 模板重构为 Phase 0（实现）+ Phase 1（验证）+ Phase 2（优化）+ Phase 3（Seal）四阶段
- [x] 3.2 Phase 1 阶段：实现完成后 spawn subagent reviewer 执行一致性验证，调用 `openspec verify phase1`
- [x] 3.3 Phase 2 阶段：实现优化循环（提案 subagent → 主 agent 应用补丁 → 再验证 subagent → 循环）
- [x] 3.4 Phase 2 中集成 git stash checkpoint 创建/恢复/消费逻辑
- [x] 3.5 Phase 2 中循环次数由 `config.optimization.optRetries` 控制，每次提案+补丁+验证循环消耗一次配额（无论成功或失败），格式/匹配问题由主 agent 直接处理不消耗配额
- [x] 3.6 Phase 2 中验证失败时记录 `failedDirections` 到 `.verify-result.json`
- [x] 3.7 Phase 3 阶段：执行 `openspec verify seal` 并输出最终状态
- [x] 3.8 保留 `--skip-optimization` flag 和 `optimization.enabled` 配置检查

## 4. Verify / Archive 模板兼容更新

- [x] 4.1 更新 `src/core/templates/workflows/verify-change.ts` 模板指引，引用共享 verify gate 片段，同时保留 `/opsx:verify` skill 作为 expanded 模式逃生舱
- [x] 4.2 更新 `src/core/templates/workflows/archive-change.ts` 中的 verify gate 指引，增加 `PENDING_VERIFICATION` 恢复路径和共享状态机/schema 引用，同时保持 archive gate 的入口语义不变

## 5. 测试

- [x] 5.1 更新 `test/commands/verify.test.ts` 中 Phase 2 重试次数测试，适配 `optRetries` 配置
- [x] 5.2 新增 `test/commands/verify.test.ts` 测试用例：`failedDirections` 记录和读取
- [x] 5.3 更新 `test/core/verify/result-validator.test.ts` 覆盖 `failedDirections` 字段
- [x] 5.4 新增 `test/core/templates/apply-change.test.ts` 覆盖 Phase 0-3 工作流
- [x] 5.5 运行全量测试 `pnpm test` 确保无回归

## 6. Agent 提示词指引片段

- [x] 6.1 在 `src/core/templates/fragments/opsx-fragments.ts` 中新增共享指引常量：
  - `VERIFY_STATE_MACHINE_DIAGRAM`：ASCII 状态机流程图，展示 Phase 1 → Phase 2 optimization → Phase 2 verification → 终态完整流转
  - `VERIFY_CLI_JSON_SCHEMA_REFERENCE`：Markdown 表格，列出 phase1/phase2 所有 CLI 调用及其 `--input` JSON 格式
  - `VERIFY_ERROR_RECOVERY_GUIDE`：决策树，指导 Agent 在 CLI 返回各类错误时的恢复路径
  - `VERIFY_SIMPLE_CHANGE_FAST_PATH`：简单变更快速路径指引（纯删除/重命名 → NO_OPTIMIZATION_NEEDED）
- [x] 6.2 更新 `src/core/templates/workflows/archive-change.ts` 的 `buildArchiveInstructions`：
  - Step 2 verify gate 增加 `PENDING_VERIFICATION` 恢复路径指引
  - 区分有/无 `affectedFileHashes` 两种子状态及对应 CLI 调用分支
  - 增加 ABORTED_UNSAFE 的明确 STOP 说明（需人工介入）
  - 引用 `VERIFY_STATE_MACHINE_DIAGRAM` 和 `VERIFY_CLI_JSON_SCHEMA_REFERENCE`
- [x] 6.3 更新 `src/core/templates/workflows/verify-change.ts`：
  - `buildCanonicalPhase1Step` 和 `buildPhase2Step` 中引用 `VERIFY_CLI_JSON_SCHEMA_REFERENCE`
  - 新增 CLI 错误恢复指南引用 `VERIFY_ERROR_RECOVERY_GUIDE`
  - `buildPhase2Step` 增加简单变更快速路径引用 `VERIFY_SIMPLE_CHANGE_FAST_PATH`
  - 在 verify 模板末尾引用 `VERIFY_STATE_MACHINE_DIAGRAM`
- [x] 6.4 更新 `src/core/templates/workflows/apply-change.ts`（Phase 2 优化循环部分）：
  - 引用 `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 替代内联 JSON 格式
  - 引用 `VERIFY_ERROR_RECOVERY_GUIDE` 处理 CLI 调用失败
- [x] 6.5 新增 `test/core/templates/fragments/opsx-fragments.test.ts`：
  - 验证所有新增常量可正确导出且为非空字符串
  - 验证 `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 覆盖所有 CLI 调用类型
  - 验证 `VERIFY_STATE_MACHINE_DIAGRAM` 包含所有终态和 archive gate 兼容状态
