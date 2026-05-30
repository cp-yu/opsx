## 1. Actions

- [x] A1 Schema: 在 `schemas/spec-driven/schema.yaml` 注册 `opsx-delta` artifact
- [x] A2 Template: 创建 `schemas/spec-driven/templates/opsx-delta.yaml` 骨架文件
- [x] A3 Fragment: 更新 `OPSX_GENERATE_DELTA` — 替换歧义文本为具体 YAML 结构示例和 `openspec instructions` 引用
- [x] A4 Fragment: 更新 `OPSX_POST_PROPOSE_VALIDATION` — 替换手动 dry-run 指令为程序化 CLI（`Validator.validateOpsxDelta()`）引用
- [x] A5 Workflow: 更新 `propose.ts` 步骤 4d — skill 模板和 command 模板两处
- [x] A6 Workflow: 更新 `ff-change.ts` 步骤 4d — skill 模板和 command 模板两处
- [x] A7 Validator: 新增 `validateOpsxDelta()` 方法，执行 dry-run merge + referential + code-map integrity 校验
- [x] A8 Command: 更新 `validate.ts` — `validateByType()` 和 `runBulkValidation()` 中并行执行 spec + OPSX 校验
- [x] A9 Test: 更新 `propose-template.test.ts` 片段断言
- [x] A10 Test: 新增 `validateOpsxDelta` 单元测试（valid、skip-no-project、skip-no-delta、MODIFIED-not-found、ref-integrity-fail、code-map-integrity-fail）

## 2. Checks

- [x] C1 artifact 注册后 instructions 可用
  - Covers: A1, A2
  - Command: `pnpm build && openspec instructions opsx-delta --change "fix-opsx-delta-artifact-and-validation" --json`
  - Expect: 返回 JSON 包含 template、instruction、outputPath、dependencies（specs）

- [x] C2 artifact 不在 apply 关键路径
  - Covers: A1
  - Evidence: `schemas/spec-driven/schema.yaml` apply.requires 字段
  - Expect: apply.requires 仍为 [tasks]，不含 opsx-delta

- [x] C3 模板文件是合法 YAML object
  - Covers: A2
  - Command: `node -e "const {parse} = require('yaml'); const fs = require('fs'); const d = parse(fs.readFileSync('schemas/spec-driven/templates/opsx-delta.yaml','utf-8')); console.log(typeof d, Array.isArray(d));"`
  - Expect: 输出 `object false`（object 非 array）

- [x] C4 片段包含具体 YAML 示例
  - Covers: A3
  - Command: `grep -c 'schema_version:' src/core/templates/fragments/opsx-fragments.ts`
  - Expect: 匹配次数 >= 1（OPSX_GENERATE_DELTA 片段中含具体 YAML 结构）

- [x] C5 片段引用程序化 CLI 校验
  - Covers: A4
  - Command: `grep -c 'validateOpsxDelta' src/core/templates/fragments/opsx-fragments.ts`
  - Expect: 匹配次数 >= 1（OPSX_POST_PROPOSE_VALIDATION 中引用该方法）

- [x] C6 propose 模板使用 artifact 系统生成 opsx-delta
  - Covers: A5
  - Command: `grep -c 'openspec instructions opsx-delta' src/core/templates/workflows/propose.ts`
  - Expect: 匹配次数 >= 2（skill 和 command 模板各一处）

- [x] C7 ff-change 模板同步更新
  - Covers: A6
  - Command: `grep -c 'openspec instructions opsx-delta' src/core/templates/workflows/ff-change.ts`
  - Expect: 匹配次数 >= 2（skill 和 command 模板各一处）

- [x] C8 validate 命令并行执行 spec + OPSX 校验
  - Covers: A7, A8
  - Command: `grep -A5 'validateOpsxDelta' src/commands/validate.ts`
  - Expect: 在 validateByType 和 runBulkValidation 中各出现一次

- [x] C9 有效的 opsx-delta 通过 validate
  - Covers: A7, A8
  - Command: `pnpm build && openspec validate "fix-opsx-delta-artifact-and-validation" --type change --json`
  - Expect: valid: true 或 issues 中不含 OPSX 相关 ERROR

- [x] C10 现有测试通过
  - Covers: A1, A2, A3, A4, A5, A6, A7, A8, A9, A10
  - Command: `pnpm test`
  - Expect: 所有现有测试通过，新增测试通过

- [x] C11 build 编译通过
  - Covers: A7, A8
  - Command: `pnpm build`
  - Expect: TypeScript 编译成功，无错误
