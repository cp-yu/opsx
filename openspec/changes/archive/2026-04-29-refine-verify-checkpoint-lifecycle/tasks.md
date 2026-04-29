## 1. Verify Checkpoint Contract

- [x] 1.1 更新 `src/core/templates/workflows/verify-change.ts`，将 Phase 2 checkpoint 生命周期改写为显式状态机：中间重试保留 checkpoint，终局恢复后才消费 checkpoint
- [x] 1.2 收敛 `git stash apply`、`git stash pop`、`git stash drop` 的模板语义，移除“先 drop 再给恢复指令”的矛盾分支
- [x] 1.3 对齐与 verify 相关的 prompt 文稿或片段，让生成内容与主模板使用同一套 checkpoint 终局语义

## 2. Archive Gate Alignment

- [x] 2.1 更新 `src/core/templates/workflows/archive-change.ts`，将 `optimization.status = ABORTED_UNSAFE` 视为不可直接复用的 verify 结果
- [x] 2.2 校正 archive 输出说明，明确 fresh result 与 archive-compatible result 不是同一个概念
- [x] 2.3 收紧 archive 内联 full verify 语义：满足 Phase 2 条件时不得因 archive-time 风险而私自降级为 Phase 1 only，`SKIPPED` 仅允许来自 config 禁用或显式 `--skip-optimization`

## 3. Validation And Cross-Platform Coverage

- [x] 3.1 为 checkpoint 生命周期补充验证覆盖：成功接受优化、单次失败后继续重试、终局放弃后恢复 baseline、恢复失败转入 `ABORTED_UNSAFE`
- [x] 3.2 增加 Windows CI / 跨平台校验任务，确保恢复说明与路径处理不依赖平台特定分隔符或 shell 习惯
- [x] 3.3 运行相关校验并确认 `proposal.md`、`design.md`、`tasks.md`、delta specs 与 `opsx-delta.yaml` 在 warning-only 检查下保持一致
- [x] 3.4 更新 `openspec/specs/opsx-archive-skill/spec.md` 对应 delta 与模板测试，覆盖 archive-time full verify 不得跳过可执行 Phase 2 的约束
