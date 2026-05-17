## Context

Phase 2 optimizer 修改 evidence files 后，`.verify-result.json` 中的 `verificationContext.evidenceFingerprint` 仍为 Phase 1 时计算的值。`seal` 是纯读操作（验证 + 生成 hash），不更新 fingerprint。后续 `verify status` 从磁盘重算 fingerprint 时必然不匹配，返回 STALE。

当前数据流：
```
Phase 1 → computeEvidenceFingerprint → 存入 result
Phase 2 → 文件变更 → seal（不碰 fingerprint）
archive → verify status → 重算 → 不匹配 → STALE
```

## Goals / Non-Goals

**Goals:**
- Phase 2 verification PASS 时重算 `evidenceFingerprint`，使其反映优化后的文件状态
- seal 后 `verify status` 返回 FRESH，archive 无需重复验证

**Non-Goals:**
- 不修改 `seal` 的只读语义
- 不修改 `checkFreshness` 的判定逻辑
- 不处理 DEGRADED 路径（checkpoint 恢复后原始 fingerprint 仍有效）

## Decisions

### 在 `handleVerification` PASS 路径重算 fingerprint

在 `src/commands/verify.ts` 的 `handleVerification` 函数中，当 `input.result` 为 PASS/PASS_WITH_WARNINGS 时，在 `writeVerifyResult` 之前插入 fingerprint 重算。

**备选方案：在 `seal` 中重算**
- 否决理由：seal 当前是纯读操作（读 result → 验证 → 返回 hash），改为写操作会破坏其幂等语义，且 seal 不接收 `projectRoot` 参数（需要额外重构）

**备选方案：新增独立 CLI 子命令**
- 否决理由：过度设计，问题根因是状态转换点遗漏了 fingerprint 更新，在转换点修复最直接

### 复用已有 `computeEvidenceFingerprint`

`handleVerification` 已能访问 `projectRoot` 参数和 `current.verificationContext.evidenceFiles`，直接调用 `computeEvidenceFingerprint`（已在文件顶部导入）即可。无需新增函数或依赖。

## Risks / Trade-offs

- [fingerprint 重算的 I/O 开销] → 可忽略：evidence files 通常 < 20 个，SHA256 计算在毫秒级。且此路径仅在 Phase 2 PASS 时执行一次
- [DEGRADED 路径 fingerprint 一致性] → 无风险：DEGRADED 时 checkpoint 已恢复文件到 Phase 1 状态，原始 fingerprint 仍有效
