## 1. Actions

- [x] A1 在 `src/core/templates/workflows/apply-change.ts:43` 的 Phase 2 TIMING CONSTRAINT 命令模板中补充 `--files "<affected-files>"` 参数
- [x] A2 在 `src/core/templates/fragments/opsx-fragments.ts` 的 `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 常量中，`OPTIMIZATION_PROPOSED` 行的 CLI call 列补充 `--files "<affected-files>"`
- [x] A3 在 `src/core/templates/fragments/opsx-fragments.ts` 的 `VERIFY_ERROR_RECOVERY_GUIDE` 常量中增加 `FILES_REQUIRED` 恢复条目

## 2. Checks

- [x] C1 验证 apply-change 模板包含 --files
  - Covers: A1
  - Command: `grep -n 'files.*affected' src/core/templates/workflows/apply-change.ts`
  - Expect: TIMING CONSTRAINT 步骤 1 的命令模板包含 `--files "<affected-files>"`

- [x] C2 验证 JSON Schema Reference 表包含 --files
  - Covers: A2
  - Command: `grep -n 'OPTIMIZATION_PROPOSED' src/core/templates/fragments/opsx-fragments.ts`
  - Expect: `OPTIMIZATION_PROPOSED` 行的 CLI call 列包含 `--files`

- [x] C3 验证 Error Recovery Guide 包含 FILES_REQUIRED 条目
  - Covers: A3
  - Command: `grep -n 'FILES_REQUIRED' src/core/templates/fragments/opsx-fragments.ts`
  - Expect: 存在一条包含 `FILES_REQUIRED` 的恢复指引

- [x] C4 验证现有测试通过
  - Covers: A1, A2, A3
  - Command: `pnpm test`
  - Expect: 所有测试通过，无回归
