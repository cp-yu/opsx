## Context

当前 `generateApplyInstructions` 在全部 task checkbox 为 `[x]` 时直接返回 `state: 'all_done'`，不检查 `.verify-result.json` 的存在性与 freshness。`checkFreshness` 和 `checkArchiveCompatibility` 已存在于 `src/core/verify/freshness.ts`，被 `archive` 和 `sync` 命令复用 — 但 `instructions apply` 未调用它们。

## Goals / Non-Goals

**Goals:**
- `generateApplyInstructions` 在 `remaining === 0` 时集成 verify 状态检查
- `ApplyInstructions.state` 增加 `'needs_verify'`、`'needs_seal'` 两个值
- `openspec list --json` 输出新增 `verifyStatus` 字段
- 模板文案修正 (`apply-change.ts`, `continue-change.ts`, `view.ts`)

**Non-Goals:**
- 不改变 `checkFreshness` / `checkArchiveCompatibility` 的检查逻辑
- 不改变 archive/sync 的 verify gate 行为（它们已经是正确的）
- 不影响 `--no-verify` / `--yes` 等用户显式 bypass 路径

## Decisions

### Decision 1: state 粒度 — 两个新增值

`'needs_verify'` 覆盖 `.verify-result.json` MISSING、STALE（含 Phase1 FAIL）、ABORTED_UNSAFE。
`'needs_seal'` 覆盖 Phase1 PASS 但 `optimization.status` 为 `PENDING_VERIFICATION`。

理由: `needs_verify` → Phase 1 (reviewer subagent)，`needs_seal` → Phase 2/3 (optimize + seal)。指令不同，但子状态通过 `instruction` 文本区分，不引入更多 type 值。

### Decision 2: 复用 checkFreshness 而非轻量检查

直接调用 `checkFreshness(changeDir, projectRoot)` + `checkArchiveCompatibility(result)`。不引入第二个"半 freshness"语义。

理由: evidence 文件为 change 目录下的 markdown artifacts，几十 KB 级别，完整 hash 计算开销可忽略。逻辑一致 > 过早优化。

### Decision 3: list --json 新增 verifyStatus 字段

保留原 `status` 字段不变，新增 `verifyStatus: 'MISSING' | 'STALE' | 'FRESH'`。

理由: 不破坏现有消费方（10+ 模板），新字段按需使用。`checkFreshness` 是 async 的，`list.ts` 的 `getLastModified` 也是 async，无架构冲突。

### Decision 4: needs_verify/needs_seal 时 apply 模板进入对应 Phase

`apply-change.ts` 模板中对 `needs_verify` 直接进入 Phase 1 (reviewer subagent)，对 `needs_seal` 直接进入 Phase 2/3。不打断用户流程。

理由: core 模式下 verify 是 apply 的内置阶段（Phase 1→2→3），无需独立 action 触发。

## Risks / Trade-offs

- `generateApplyInstructions` 新增一次文件读取（`.verify-result.json`）和 evidence hash 计算 → 开销可忽略
- `list --json` 同样增加了 verify 检查 → 对大量 changes 的 list 操作可能稍慢，但通常 change 数量少（<20）
- `ApplyInstructions.state` 类型变更 → 消费方需更新 switch/if-else 分支，编译期即可发现遗漏