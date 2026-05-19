## 1. Actions

- [x] A1 类型系统: `shared.ts` 的 `ApplyInstructions.state` 新增 `'needs_verify'` 和 `'needs_seal'` 两个取值
- [x] A2 `generateApplyInstructions`: 在 `remaining === 0` 时调用 `checkFreshness` + `checkArchiveCompatibility`，根据 freshness/archiveCompatibility 结果设置正确的 state 和差异化 instruction 文本
- [x] A3 `printApplyInstructionsText`: 处理 `needs_verify` / `needs_seal` 的展示输出
- [x] A4 `apply-change.ts` 模板: 步骤 3 的状态处理增加 `needs_verify` → 进入 Phase 1、`needs_seal` → 进入 Phase 2/3 的分支
- [x] A5 `list.ts`: JSON 输出新增 `verifyStatus` 字段 (调用 `checkFreshness`)
- [x] A6 `view.ts`: Dashboard "Completed Changes" 分类标签改为 "Tasks Done"
- [x] A7 `continue-change.ts` 模板: `isComplete: true` 时的建议文案去掉 "or archive it"

## 2. Checks

- [x] C1 验证 `needs_verify` 状态: 删除 `.verify-result.json` 且全部 tasks 完成后 `instructions apply --json` 返回 `state: 'needs_verify'`
  - Covers: A1, A2
  - Command: `openspec instructions apply --change fix-apply-instructions-verify-gate --json`
  - Expect: `state` 为 `'needs_verify'`，`instruction` 包含验证引导文本

- [x] C2 验证 `needs_seal` 状态: 构造 Phase1 PASS + `PENDING_VERIFICATION` 的 `.verify-result.json`，运行 apply 指令
  - Covers: A2
  - Command: `openspec instructions apply --change <test-change> --json`
  - Expect: `state` 为 `'needs_seal'`

- [x] C3 验证 `all_done` 状态未退化: FRESH + compatible 的 verify result 下 apply 指令仍返回 `'all_done'`
  - Covers: A2
  - Command: `openspec instructions apply --change <test-change> --json`
  - Expect: `state` 为 `'all_done'`

- [x] C4 验证 `list --json` 包含 `verifyStatus` 字段
  - Covers: A5
  - Command: `openspec list --json`
  - Expect: 每个 change 的 JSON 对象包含 `verifyStatus` 字段，取值 MISSING/STALE/FRESH

- [x] C5 验证 continue-change 模板不含 "or archive it"
  - Covers: A7
  - Evidence: `src/core/templates/workflows/continue-change.ts` 文件中 `isComplete: true` 分支的文本
  - Expect: 不包含 "or archive it"，建议进入 apply

- [x] C6 验证 Dashboard 分类标签为 "Tasks Done"
  - Covers: A6
  - Evidence: `src/core/view.ts` 中 `completed` 区域的标题
  - Expect: 标题为 "Tasks Done"，非 "Completed Changes"

- [x] C7 验证 apply-change 模板包含 needs_verify/needs_seal 处理分支
  - Covers: A4
  - Evidence: `src/core/templates/workflows/apply-change.ts`
  - Expect: 步骤 3 的状态处理包含 `needs_verify` 和 `needs_seal` 分支

- [x] C8 类型编译通过: `pnpm build` 无类型错误

## Remediation

- [x] [code_fix] 明确将 continue-change skill 的完成态引导到 `openspec-apply-change`，并用模板断言覆盖该文案
  - Covers: A1, A2, A3, A5
  - Command: `pnpm build`
  - Expect: 编译成功，无 TypeScript 错误
