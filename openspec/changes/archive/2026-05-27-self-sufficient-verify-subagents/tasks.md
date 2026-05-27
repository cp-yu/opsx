## 1. Actions

- [x] A1 更新 `src/core/templates/workflows/reviewer.ts` 中的 skill instructions：将 Input Contract 从 5 字段 bundle 改为 3 字段定位信息（changeName、changeDir、projectRoot）；新增 Hard Constraint 声明 Read+Bash 工具权限和文件修改禁止；新增自主文件读取流程描述；新增 L1 测试策略
- [x] A2 更新 `src/core/templates/workflows/optimizer.ts` 中的 skill instructions：将 Input Contract 从 7 字段 bundle 改为 3 字段定位信息；新增 Hard Constraint 声明 Read+Bash 工具权限；新增从 `.verify-result.json` 自主读取 Phase 1 结果的流程
- [x] A3 更新 `src/core/templates/workflows/verify-change.ts`：简化 `[Mode: Evidence]` 步骤为确定路径；简化 `[Mode: Delegate Review]` 步骤为传递 3 字符串并声明 subagent 工具能力；简化 `[Mode: Optimize]` 步骤同理
- [x] A4 同步更新 `.claude/skills/openspec-reviewer/SKILL.md` 和 `.codex/skills/openspec-reviewer/SKILL.md`：内容与 A1 生成的 instructions 一致
- [x] A5 同步更新 `.claude/skills/openspec-optimizer/SKILL.md` 和 `.codex/skills/openspec-optimizer/SKILL.md`：内容与 A2 生成的 instructions 一致
- [x] A6 运行 `pnpm test` 确保现有测试通过
- [x] A7 运行 `pnpm run build` 和 `openspec update --force` 重新生成所有 AI 工具制品，确保 skill 文件与模板源码同步

## 2. Checks

- [x] C1 Reviewer skill 的 Input Contract 已改为 3 字段
  - Covers: A1, A4
  - Evidence: `.claude/skills/openspec-reviewer/SKILL.md`
  - Expect: Input Contract 表格仅包含 changeName、changeDir、projectRoot 三行；无 finalFileContents、gitEvidence 等旧字段

- [x] C2 Reviewer skill 包含 Read+Bash 工具权限声明
  - Covers: A1, A4
  - Evidence: `.claude/skills/openspec-reviewer/SKILL.md`
  - Expect: Hard Constraints 中包含 "MAY 通过 Bash 执行测试命令和 git 只读命令" 和 "MUST NOT 通过 Bash 执行文件修改操作"

- [x] C3 Optimizer skill 的 Input Contract 已改为 3 字段
  - Covers: A2, A5
  - Evidence: `.claude/skills/openspec-optimizer/SKILL.md`
  - Expect: Input Contract 表格仅包含 changeName、changeDir、projectRoot 三行

- [x] C4 Verify workflow 的 Evidence 步骤已简化
  - Covers: A3
  - Evidence: `src/core/templates/workflows/verify-change.ts`
  - Expect: `[Mode: Evidence]` 步骤不再包含 "Read the final file contents" 或 "Read every available artifact" 指令

- [x] C5 Verify workflow 的 Delegate Review 步骤只传定位信息
  - Covers: A3
  - Evidence: `src/core/templates/workflows/verify-change.ts`
  - Expect: Step 5 传入 changeName、changeDir、projectRoot；声明 subagent 拥有 Read + Bash 工具能力

- [x] C6 所有测试通过
  - Covers: A6
  - Command: `pnpm test`
  - Expect: exit code 0，无 failing tests

- [x] C7 Skill 文件与模板源码同步
  - Covers: A7
  - Command: `pnpm run build` then `openspec update --force`
  - Expect: 无 error，skill 文件已更新
