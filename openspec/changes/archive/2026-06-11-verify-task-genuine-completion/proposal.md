<!-- propose-routing: Design Summary found in conversation (explore session 2026-06-11); detail scoring skipped; multi-subsystem decomposition completed during explore; decision: proceed with Design Summary as primary input -->

## Why

Review（Phase 1 reviewer）的所有判定都是存在性导向：从 spec requirement/scenario 出发在代码中搜索实现证据。删除任务（交付物 = 代码不存在）与重构任务（行为不变、delta spec 为空）在该体系中没有合法的验证锚点——`Verifies` 语法强制要求 Scenario 而 REMOVED 条目 names-only、`parseSpecRequirements` 不索引 REMOVED 区段、Files 标签没有 `Delete:`。结果是此类任务勾选后 review 产生假阳性 PASS，"task 认真完成"无法被验证。

## What Changes

- `tasks.md` Check 锚点从单一类型扩展为三类：现有 `Verifies`（存在性）、新增 `Verifies ... REMOVED Requirement`（缺失性，无 Scenario 变体）、新增 `Preserves` 字段（等价性，唯一允许指向主 spec `openspec/specs/...` 路径的字段）。
- `task-structure.ts` parser 支持 REMOVED 语法变体、索引 delta spec `## REMOVED Requirements` 区段、解析 `Preserves` 字段（独立 `isValidMainSpecPath`，不放宽 `Verifies`）。
- Files 标签清单新增 `Delete:`；schema.yaml 任务转换规则补删除工作与重构等价检查两条；tasks 模板补删除任务示例。
- Reviewer 协议按锚点类型分派判定：缺失性判定（Search→Absent→Cite，残留即 CRITICAL）、双支等价性判定（行为不变 ∧ 旧形态消失，新旧并存 = half migration → CRITICAL）；Completeness 增加 `Delete:` 声明 vs git diff 逐项核对。
- Cleanliness 新增第五项检测"规格外改动"：diff 中无法归因到任何 task 的文件必须被读取并判定，行为代码 → CRITICAL（remediation 走 `artifact_fix` 补呈现或 `code_fix` revert），机械性良性 → WARNING/SUGGESTION。
- Reviewer 输出 schema 仅 additive 扩展：`summary.cleanliness.unaccountedChangesFound` 计数；`writeBackPlan.taskLine` 对规格外发现允许 `null`。
- verify-change 模板 subagent/reread 两套骨架同步三类锚点判定语义；propose 结构检查 fragment 与 parser 新语法同步。

不改动：`freshness.ts`（被删文件 ENOENT→skippedFiles、复活→STALE 的现状语义已正确）、`validator.ts` 的 REMOVED 校验、verify-cli-gate。

## Capabilities

### New Capabilities

（无——全部为现有 capability 的 requirement 扩展）

### Modified Capabilities

- `cli-artifact-workflow`: `Verifies` 合约新增 REMOVED 锚定语法变体（无 Scenario）；新增 `Preserves` 字段合约（主 spec 路径白名单）；Files 标签新增 `Delete:`；任务转换规则新增删除工作与重构等价检查映射
- `openspec-reviewer-skill`: 验证维度按锚点类型分派判定模式；Completeness 新增 `Delete:` 声明核对；输出 schema additive 扩展
- `opsx-verify-skill`: Completeness/Correctness 验证措辞从纯存在性搜索改为按锚点类型判定（存在性/缺失性/等价性）
- `reviewer-cleanliness-dimension`: 新增第五项检测"规格外改动"及归因宇宙定义；cleanliness summary schema 扩展

## Impact

- 代码：`src/core/parsers/task-structure.ts`、`schemas/spec-driven/schema.yaml`、`schemas/spec-driven/templates/tasks.md`、`src/core/templates/workflows/reviewer.ts`、`src/core/templates/workflows/verify-change.ts`、`src/core/templates/fragments/opsx-fragments.ts`
- 生成面：reviewer/verify skill 模板改动经 `skill-generation.ts` 管线再生成 25+ 工具适配器
- 测试：`test/core/parsers/task-structure.test.ts`、`test/skills/reviewer-*.test.ts`、`test/skills/verify-change-strictness.test.ts`、`test/commands/artifact-workflow.test.ts` 等内容钉死测试需同步更新
- 兼容性：现有 `Verifies` 语义零改动（仅新增变体）；输出 schema 为 additive 扩展，不影响 verify-cli-gate / freshness / archive 门禁消费方
