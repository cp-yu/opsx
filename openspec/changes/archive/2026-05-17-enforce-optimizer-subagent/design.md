## Context

Phase 2 优化循环的判断权分配存在缺陷。当前 `VERIFY_SIMPLE_CHANGE_FAST_PATH` prompt fragment 允许 master agent 自行决定跳过 optimizer subagent，而 CLI `handleOptimization()` 无条件接受 `NO_OPTIMIZATION_NEEDED` status。实际运行中 master agent 几乎总是自我合理化跳过优化，导致 Phase 2 形同虚设。

涉及文件：
- `src/core/templates/fragments/opsx-fragments.ts` — `VERIFY_SIMPLE_CHANGE_FAST_PATH` 常量
- `src/commands/verify.ts` — `handleOptimization()` 函数
- `src/core/templates/workflows/apply-change.ts` — Phase 2 编排文本
- `src/core/templates/workflows/verify-change.ts` — Phase 2 相关引用

## Goals / Non-Goals

**Goals:**
- 确保 optimizer subagent 始终被调用至少一次（除非 `--skip-optimization` 或 `optimization.enabled: false`）
- CLI 层提供 runtime enforcement，拒绝无证据的 `NO_OPTIMIZATION_NEEDED`
- Prompt 层明确 master agent 角色为 evidence collector，不得替代 optimizer 做判断

**Non-Goals:**
- 不修改 optimizer subagent 自身的逻辑（它已经能正确返回 "No optimization opportunities found"）
- 不修改 Phase 1 reviewer 的行为
- 不引入新的 CLI 子命令或 status 枚举
- 不改变 `SKIPPED` 路径的语义（用户显式跳过仍然有效）

## Decisions

### Decision 1: CLI enforcement 使用 `summary` 非空校验

**选择**: 要求 `NO_OPTIMIZATION_NEEDED` 的 `--input` JSON 必须包含非空 `summary` 字段

**理由**: 最小侵入方案。`summary` 字段已存在于 `Phase2OptimizationInput` 类型中，只需从 optional 变为 required-when-NOT_NEEDED。master agent 如果没调用 subagent，就没有 optimizer 的结论可填入 summary。

**替代方案**:
- 新增 status 枚举值（如 `OPTIMIZER_CONFIRMED_NOT_NEEDED`）— 过度设计，增加协议复杂度
- 检查 Phase 1 result 是否有 warnings — 不够通用，即使 clean PASS 也应强制调用 subagent

### Decision 2: 重写 fragment 而非新增 fragment

**选择**: 直接重写 `VERIFY_SIMPLE_CHANGE_FAST_PATH` 常量内容，保持常量名不变

**理由**: 该常量已被 `apply-change.ts`、`verify-change.ts`、`archive-change.ts` 三处引用。保持常量名不变避免修改引用点。语义从"允许跳过"变为"强制委托"。

**替代方案**:
- 删除常量并在各引用点内联新文本 — 违反 DRY，增加维护成本
- 新增常量并废弃旧常量 — 不必要的间接层

### Decision 3: 始终强制调用，不区分 Phase 1 result

**选择**: 无论 Phase 1 是 `PASS` 还是 `PASS_WITH_WARNINGS`，都强制 spawn optimizer subagent

**理由**: 一致性。master agent 永远不做"是否需要优化"的判断，消除所有越权路径。对于简单 change（纯删除），optimizer subagent 读完 artifacts 后快速返回 "No optimization opportunities found"，开销可接受。

## Risks / Trade-offs

- [每次 apply 多一次 subagent 调用] → 对简单 change 增加少量延迟；optimizer 读完 artifacts 后快速返回，实际影响有限
- [现有 apply session 中断后恢复] → CLI 已有 `PENDING_VERIFICATION` 状态检测，不受影响
- [summary 字段可被 master agent 编造] → 编造成本远高于当前零成本跳过；且 prompt 层已明确禁止自行判断，双重约束降低风险

## Migration Plan

1. 修改 CLI `handleOptimization()` 增加 summary 校验 — 向后不兼容：旧版 agent 调用 `NO_OPTIMIZATION_NEEDED` 不带 summary 将被拒绝
2. 重写 `VERIFY_SIMPLE_CHANGE_FAST_PATH` fragment — 下次 `openspec update` 后生效
3. 更新 apply 编排文本 — 同步生效
4. 无需数据迁移：已 sealed 的 `.verify-result.json` 不受影响
