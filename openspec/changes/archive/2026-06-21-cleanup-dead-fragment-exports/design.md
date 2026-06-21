## Context

系统从 inline-template 模型迁移到 subagent-orchestrated 模型过程中，`src/core/templates/workflows/verify-change.ts` 等 6 个工作流模板被删除（commit `763d9d6f`），但共享 fragment 文件 `opsx-fragments.ts` 中仍有 15 个 exports 的消费方已全部消失。同时多个 spec 文件引用不存在的外部 artifact（`prompts.md`、`verify-change.ts`、`openspec-phase2-checkpoint-protocol.md`）。

## Goals / Non-Goals

**Goals:**
- 删除 `opsx-fragments.ts` 中不再被任何 template import 的 15 个 exports
- 修正 7 个 stale "Used in:" JSDoc 注释使其与实际消费方一致
- 将 7 个 spec 文件中的 stale 引用收敛到当前真实代码位置或标记 `[REMOVED]`
- 清理测试文件中对已删除 fragments 的引用

**Non-Goals:**
- 不修改任何 workflow 模板逻辑
- 不修改 reviewer.ts、CLI 代码
- 不新增或修改 OPSX capability 节点

## Decisions

### 方案选择：收敛到 reviewer.ts 而非直接删除 spec requirement

将 stale spec 引用改为指向 reviewer.ts 当前判定位置，而非直接删除 requirement。理由：保留行为契约的可追溯性，让读者能找到当前真实判定逻辑的位置。

### 标记策略：`[REMOVED]` 而非静默删除

对于引用已删除模板的 requirement/scenario，使用 `[REMOVED: 原因]` 标记而非完全删除。保留历史语义的同时消除对不存在 artifact 的困惑。

## Risks / Trade-offs

- **[Risk]** spec 中新增的 `reviewer.ts` 行号引用可能因后续修改漂移 → **Mitigation**: 引用代码节名称（如 "Correctness 节"）而非具体行号
- **[Risk]** 删除的 fragments 可能有未被 git 追踪的外部消费者 → **Mitigation**: 全文搜索确认 src/ 目录下零引用；外部消费者通过 `dist/` 声明文件访问，重新 build 即可
