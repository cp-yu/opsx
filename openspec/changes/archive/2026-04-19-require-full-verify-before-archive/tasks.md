## 1. 收敛归档前验证合同

- [x] 1.1 在 `src/core/templates/fragments/opsx-fragments.ts` 中新增 `VERIFY_FRESHNESS_RULES` fragment
- [x] 1.2 完全重写 `src/core/templates/workflows/archive-change.ts` Step 2 为 "Unified Full Verify Gate"，引用 `VERIFY_FRESHNESS_RULES`
- [x] 1.3 在 archive Step 2 中实现：fresh result 复用、stale/missing 时执行 full verify、`FAIL_NEEDS_REMEDIATION` 时 hard-block
- [x] 1.4 删除 `src/core/templates/workflows/archive-change.ts` Step 4.5（Core mode inline conformance check）
- [x] 1.5 确保 archive Step 2 对 `core` 和 `expanded` 模式使用相同的 verify gate 逻辑
- [x] 1.6 确保 `src/core/workflow-surface.ts` 中 `CORE_WORKFLOWS` 不包含 `verify`（保持四个 surface）
- [x] 1.7 验证 archive 在 `FAIL_NEEDS_REMEDIATION` 时 hard-block，无 skip/continue 选项

## 2. 强化 verify 执行语义

- [x] 2.1 在 `src/core/templates/fragments/opsx-fragments.ts` 中新增 `GIT_EVIDENCE_PROTOCOL` fragment
- [x] 2.2 在 `src/core/templates/fragments/opsx-fragments.ts` 中新增 `CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT` fragment（Claude Code/Codex）
- [x] 2.3 在 `src/core/templates/fragments/opsx-fragments.ts` 中新增 `CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD` fragment（其他工具）
- [x] 2.4 更新 `src/core/templates/fragments/opsx-fragments.ts` 中的 `CONFORMANCE_CHECK_RULES`，增加 "Step-by-Step Objective Verification" 和 "Evidence Standards"
- [x] 2.5 在 `src/core/templates/workflows/verify-change.ts` 中 Step 1 后插入 Step 1.5：引用 `CLEAN_CONTEXT_VERIFY_PROTOCOL_REREAD`（默认版本）
- [x] 2.6 在 `src/core/templates/workflows/verify-change.ts` 中 Step 5 后插入 Step 5.5：引用 `GIT_EVIDENCE_PROTOCOL`
- [x] 2.7 修改 `src/core/templates/workflows/verify-change.ts` Step 10，扩展 `.verify-result.json` 以包含 `verificationContext` 字段
- [x] 2.8 创建 `src/core/templates/workflows/.claude/verify-change.ts`，Step 1.5 引用 `CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT`
- [x] 2.9 创建 `src/core/templates/workflows/.codex/verify-change.ts`，Step 1.5 引用 `CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT`

## 3. 扩展 verify result 与 freshness 判定

- [x] 3.1 在 verify-change.ts Step 10 中扩展 `.verify-result.json` 写入逻辑，增加 `verificationContext` 对象
- [x] 3.2 在 `verificationContext` 中记录：`contractVersion: "1.0"`、`executionMode`、`evidenceFiles`、`evidenceFingerprint`、`gitHeadCommit`（可选）、`gitDiffSummary`（可选）
- [x] 3.3 实现 `evidenceFingerprint` 计算逻辑：排序 evidenceFiles → 获取每个文件的 path+mtime+size → SHA-256 hash
- [x] 3.4 在 archive-change.ts Step 2 中实现 freshness 判定逻辑，引用 `VERIFY_FRESHNESS_RULES`
- [x] 3.5 确保所有路径处理使用 `path.join()` / `path.resolve()` / `path.normalize()`
- [x] 3.6 检查 `src/core/templates/workflows/apply-change.ts` 是否需要展示新的 verify context 字段；如不需要，保留只消费 CRITICAL issues 的现有行为

## 4. 更新测试覆盖

- [x] 4.1 增加或更新 workflow surface 测试，断言 `CORE_WORKFLOWS` 不包含 `verify`，`EXPANDED_WORKFLOWS` 仍包含 `verify`
- [x] 4.2 增加 archive template 测试，覆盖统一 verify gate 逻辑（fresh 复用、stale 重跑、FAIL hard-block）
- [x] 4.3 增加 verify template 测试，覆盖 clean-context protocol（subagent 和 reread 两种模式）
- [x] 4.4 增加 verify template 测试，覆盖 git evidence protocol（git 作为线索、最终文件内容作为判断依据）
- [x] 4.5 增加 verify result 持久化测试，覆盖 `verificationContext` 字段完整性
- [x] 4.6 增加 freshness 判定测试，覆盖 missing、stale（多种原因）、fresh 三类路径
- [x] 4.7 增加跨平台路径测试，确保 evidence file 路径在 Windows 下正确处理

## 5. 修正文档叙事漂移

- [x] 5.1 更新 `README.md`，说明 `core` 仍为四个 surface（propose/explore/apply/archive），但 archive 前会自动执行 full verify
- [x] 5.2 更新 `docs/getting-started.md`，说明 core 默认流程为 `propose → apply → archive`，archive 内置 verify gate
- [x] 5.3 更新 `docs/workflows.md`，增加 “Verification in Core vs Expanded” 章节，说明两种模式的 verify 执行方式和统一标准
- [x] 5.4 更新 `docs/commands.md`，说明 `/opsx:archive` 的 verification gate 行为、freshness 判定标准、可能变慢的预期
- [x] 5.5 更新 `docs/opsx.md`，增加 “Verification System” 章节，说明 clean-context review、evidence priority、工具差异
- [x] 5.6 用 `rg` 搜索并清理旧表述：`optional verify`、`lightweight conformance`、`soft-prompt`、`skip verify`

## 6. 验证

- [x] 6.1 运行 `openspec validate "require-full-verify-before-archive" --type change --json`
- [x] 6.2 运行受影响的单元测试：workflow surface、fragments、archive/verify templates
- [x] 6.3 运行 TypeScript 类型检查，确认所有改动没有类型错误
- [x] 6.4 手动测试 core 模式：propose → apply → archive（验证 archive 自动执行 verify）
- [x] 6.5 手动测试 expanded 模式：propose → apply → verify → archive（验证 fresh result 复用）
- [x] 6.6 手动测试 stale result：修改 tasks.md 后 archive（验证重新执行 verify）
- [x] 6.7 手动测试 FAIL_NEEDS_REMEDIATION：verify 失败后 archive（验证 hard-block）
- [x] 6.8 在最终汇总中说明：Claude Code 和 Codex 使用 subagent，其他工具使用 reread protocol
