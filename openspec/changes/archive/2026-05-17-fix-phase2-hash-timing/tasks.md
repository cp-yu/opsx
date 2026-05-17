## 1. Actions

- [x] A1 重排 `APPLY_VERIFY_PHASES` 中 Step 8 的时序指令，将 `phase2 --type=optimization` CLI 调用移到 patch 应用之前，并增加显式时序约束注释

## 2. Checks

- [x] C1 验证 template 文本时序正确且构建通过
  - Covers: A1
  - Command: `pnpm build`
  - Expect: 构建成功，无 TypeScript 错误

- [x] C2 验证修改后的 template 文本包含正确的时序约束
  - Covers: A1
  - Evidence: `src/core/templates/workflows/apply-change.ts` 中 Step 8 文本
  - Expect: `phase2 --type=optimization` 调用指令出现在 "apply Search/Replace blocks" 指令之前；包含显式注释说明 hash 采样必须在 pre-patch 状态执行

- [x] C3 验证现有测试不受影响
  - Covers: A1
  - Command: `pnpm test`
  - Expect: 所有测试通过
