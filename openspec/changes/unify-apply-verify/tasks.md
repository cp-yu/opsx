## 1. 配置和类型定义

- [ ] 1.1 在 `openspec/config.yaml` schema 中新增 `optimization.optRetries` 字段（默认 2）
- [ ] 1.2 在 `src/core/verify/types.ts` 中新增 `failedDirections: string[]` 字段到 `VerifyOptimization` 接口
- [ ] 1.3 更新 `OptimizationStatus` 类型定义，确认 `IMPROVED | DEGRADED | NOT_NEEDED | SKIPPED` 终态完整

## 2. Verify CLI 适配

- [ ] 2.1 修改 `src/commands/verify.ts` 的 `handleVerification` 函数，将硬编码的 `behaviorRetryCounter >= 3` 改为读取 `config.optimization.optRetries`
- [ ] 2.2 修改 `handleVerification` 在验证失败时（可重试路径）追加失败方向到 `optimization.failedDirections[]`
- [ ] 2.3 修改 `handleOptimization` 在 `OPTIMIZATION_PROPOSED` 路径中记录优化方向到 `optimization.attempts`
- [ ] 2.4 更新 `phase1Baseline` 或新增 helper 确保 `failedDirections` 在 optimization 对象初始化时存在
- [ ] 2.5 更新 `src/core/verify/result-validator.ts` 的 `validateVerifyResult` 确认新增字段不破坏 seal 校验

## 3. Apply 模板重构

- [ ] 3.1 修改 `src/core/templates/workflows/apply-change.ts`，将 apply 模板重构为 Phase 0（实现）+ Phase 1（验证）+ Phase 2（优化）+ Phase 3（Seal）四阶段
- [ ] 3.2 Phase 1 阶段：实现完成后 spawn subagent reviewer 执行一致性验证，调用 `openspec verify phase1`
- [ ] 3.3 Phase 2 阶段：实现优化循环（提案 subagent → 主 agent 应用补丁 → 再验证 subagent → 循环）
- [ ] 3.4 Phase 2 中集成 git stash checkpoint 创建/恢复/消费逻辑
- [ ] 3.5 Phase 2 中重试预算由 `config.optimization.optRetries` 控制，格式/匹配问题由主 agent 直接处理
- [ ] 3.6 Phase 2 中验证失败时记录 `failedDirections` 到 `.verify-result.json`
- [ ] 3.7 Phase 3 阶段：执行 `openspec verify seal` 并输出最终状态
- [ ] 3.8 保留 `--skip-optimization` flag 和 `optimization.enabled` 配置检查

## 4. Verify 模板保留

- [ ] 4.1 确认 `src/core/templates/workflows/verify-change.ts` 模板内容不变，`/opsx:verify` skill 继续可用
- [ ] 4.2 确认 `src/core/templates/workflows/archive-change.ts` 中的 verify gate 逻辑不变

## 5. 测试

- [ ] 5.1 更新 `test/commands/verify.test.ts` 中 Phase 2 重试次数测试，适配 `optRetries` 配置
- [ ] 5.2 新增 `test/commands/verify.test.ts` 测试用例：`failedDirections` 记录和读取
- [ ] 5.3 更新 `test/core/verify/result-validator.test.ts` 覆盖 `failedDirections` 字段
- [ ] 5.4 新增 `test/core/templates/apply-change.test.ts` 覆盖 Phase 0-3 工作流
- [ ] 5.5 运行全量测试 `pnpm test` 确保无回归
