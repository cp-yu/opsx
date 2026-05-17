## 1. Actions

- [x] A1 在 `src/commands/verify.ts` 的 `handleOptimization()` 中增加 `NO_OPTIMIZATION_NEEDED` 的 summary 非空校验，缺失或为空时返回 `{ ok: false, reason: "OPTIMIZER_REQUIRED" }` 和 exit code 1
- [x] A2 重写 `src/core/templates/fragments/opsx-fragments.ts` 中 `VERIFY_SIMPLE_CHANGE_FAST_PATH` 常量内容，从"允许跳过"语义改为"强制委托 optimizer subagent"语义
- [x] A3 更新 `src/core/templates/workflows/apply-change.ts` Phase 2 编排段落，在开头增加角色约束文本（master agent 为 evidence collector，不得替代 optimizer 判断）
- [x] A4 更新 `src/core/templates/workflows/verify-change.ts` 中 Phase 2 相关文本，确保与新的强制委托语义一致
- [x] A5 更新 `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 速查表中 `NO_OPTIMIZATION_NEEDED` 条目，增加 `summary` 字段为必填的说明

## 2. Checks

- [x] C1 验证 CLI 拒绝无 summary 的 NO_OPTIMIZATION_NEEDED
  - Covers: A1
  - Command: `pnpm test -- --grep "NO_OPTIMIZATION_NEEDED.*summary"`
  - Expect: 测试通过，验证缺失 summary 时返回 `{ ok: false, reason: "OPTIMIZER_REQUIRED" }` 和 exit code 1

- [x] C2 验证 CLI 接受带 summary 的 NO_OPTIMIZATION_NEEDED
  - Covers: A1
  - Command: `pnpm test -- --grep "NO_OPTIMIZATION_NEEDED.*accept"`
  - Expect: 测试通过，验证非空 summary 时正常记录 `NOT_NEEDED` 状态

- [x] C3 验证 VERIFY_SIMPLE_CHANGE_FAST_PATH 新文本包含强制委托语义
  - Covers: A2
  - Evidence: 读取 `src/core/templates/fragments/opsx-fragments.ts` 中 `VERIFY_SIMPLE_CHANGE_FAST_PATH` 常量
  - Expect: 文本包含 "MUST spawn optimizer subagent" 和 "MUST NOT" 自行判断的约束；不包含旧的 "skip the optimization subagent" 语义

- [x] C4 验证 apply 编排文本包含角色约束
  - Covers: A3
  - Evidence: 读取 `src/core/templates/workflows/apply-change.ts` Phase 2 段落
  - Expect: 包含 "evidence collector" 或等效角色约束文本，明确禁止 master agent 替代 optimizer 判断

- [x] C5 验证 verify-change 模板与新语义一致
  - Covers: A4
  - Evidence: 读取 `src/core/templates/workflows/verify-change.ts` 中引用 `VERIFY_SIMPLE_CHANGE_FAST_PATH` 的上下文
  - Expect: 无冲突的旧语义残留

- [x] C6 验证 JSON schema 速查表更新
  - Covers: A5
  - Evidence: 读取 `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 常量
  - Expect: `NO_OPTIMIZATION_NEEDED` 条目的 JSON 示例包含 `"summary":"..."` 字段

- [x] C7 验证现有测试套件通过
  - Covers: A1, A2, A3, A4, A5
  - Command: `pnpm test`
  - Expect: 所有测试通过，无回归
