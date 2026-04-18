## Why

当前 bootstrap 明确把 `formal-opsx` 仓库视为不支持场景，这让已经完成首轮建模、但后续仍有大量非 OpenSpec 开发发生的团队，无法用现有五阶段工作流做受控增量刷新。结果是团队只能手工维护 `project.opsx*.yaml`，或者被迫从头扫描并承担覆盖人工修订的风险。

现在需要一条显式的增量路径：对已有 formal OPSX 项目引入 `refresh` 模式，在能利用 git 的仓库里优先用基线提交和 diff 缩小扫描范围，在没有 git 的仓库里退化为全量扫描，但始终以现有 formal OPSX、现存 specs 和保留的 bootstrap 工作区作为约束，避免把人工维护内容静默覆写。

## What Changes

- 为 bootstrap 引入仅适用于 `formal-opsx` baseline 的显式 `refresh` mode，而不是继续把该场景拒绝为不支持。
- 在 bootstrap metadata 中记录 refresh 锚点信息；当仓库可用 git 时，记录最近一次 bootstrap/refresh promote 对应提交，用于后续 diff-aware 扫描。
- 为 refresh 模式增加增量扫描合同：有 git 时优先用锚点提交到当前工作树的变更路径缩小扫描范围；没有 git、锚点缺失或 diff 不可信时，退化为全量扫描。
- 将 refresh 的 review/promotion 合同改为 delta-first：review 聚焦 ADDED / MODIFIED / REMOVED 变化，promote 通过 merge/delta 更新 formal OPSX，而不是整包覆盖 candidate 三文件。
- 保持 `invalid-partial-opsx` baseline 继续拒绝，避免把损坏或不完整的 formal OPSX 仓库带入 refresh 流程。
- 明确 refresh 对 specs 的写回规则：保留已有 formal specs，仅补充新增 capability 的缺失 spec；对冲突目标显式失败，不做隐式 merge。

## Capabilities

### New Capabilities
- `bootstrap-refresh-mode`: 为已有 formal OPSX 项目提供显式 refresh 生命周期，涵盖 git-aware 增量扫描、delta review 和 merge-based promote。

### Modified Capabilities
- `bootstrap`: 调整 bootstrap 合同，使 `formal-opsx` baseline 通过 `refresh` mode 进入五阶段工作流，并定义 refresh 的状态、review 和 promote 语义。
- `bootstrap-baseline`: 调整 baseline/mode 映射，使 `formal-opsx` 只允许 `refresh`，`invalid-partial-opsx` 继续被拒绝。

## Impact

- 影响命令与状态模型：`src/commands/bootstrap.ts`、`src/utils/bootstrap-utils.ts`
- 影响 OPSX 合并路径：`src/utils/opsx-utils.ts`、可能复用 `src/core/change-sync.ts` 的 dry-run merge 语义
- 影响 bootstrap workflow 模板与文档：`src/core/templates/workflows/bootstrap-opsx.ts`、`docs/opsx-bootstrap.md`
- 影响 bootstrap 相关 specs 与测试，尤其是 git 可用/不可用、Windows 路径处理、增量与全量回退场景
