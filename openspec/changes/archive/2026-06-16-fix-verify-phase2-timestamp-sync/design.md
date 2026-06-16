# Design: fix-verify-phase2-timestamp-sync

## Context

OpenSpec 的 verify 工作流分为两阶段：
1. **Phase 1**: 功能性验证（实现完整性、正确性、一致性）
2. **Phase 2**: 优化验证（代码优化 + 行为重验证）

Phase 2 流程：
1. `verify phase2 --type=optimization` 记录优化前文件哈希到 `affectedFileHashes`
2. 应用优化 patch，磁盘文件变为优化后状态
3. `verify phase2 --type=verification` 重新验证行为

**发现问题**：Phase 2 verification PASS 时，代码更新了 `evidenceFingerprintEntries` 为优化后哈希，但未同步更新 `gitHeadCommit` 和 `timestamp`。结果顶层 `verificationContext` 出现：
- `gitHeadCommit`: 指向优化前提交 C1
- `evidenceFingerprintEntries`: 包含优化后哈希 H_post（来自未来提交 C1p）
- `timestamp`: Phase 1 时刻

这三者无法对应任何真实 git 提交，导致 freshness 检查误判、审计链断裂。

## Decisions

### 选择方案 C：顶层重锚到最终 HEAD [INFERRED FROM CODE]

**已实现路径**：在 `handleVerification` 中即时更新三字段

```typescript
// src/commands/verify.ts:324-335
if (input.result === 'PASS' || input.result === 'PASS_WITH_WARNINGS') {
  current.optimization.status = 'IMPROVED';
  current.optimization.final = input;
  const evidence = await computeEvidenceFingerprint(...);
  current.verificationContext.evidenceFingerprint = evidence.hash;
  current.verificationContext.evidenceFingerprintEntries = evidence.entries;
  // 新增 ↓
  current.verificationContext.gitHeadCommit = await getGitHead(projectRoot);
  current.verificationContext.timestamp = new Date().toISOString();
  await writeVerifyResult(changeDir, current);
}
```

**权衡**：
- ✅ 顶层快照三字段自洽，对应最终优化后的真实提交
- ✅ freshness 检查无需调整（继续使用顶层快照判定）
- ✅ baseline 独立保存了 Phase 1 快照，审计完整
- ⚠️ 顶层语义从"Phase 1 时刻"变为"最终态"（但这是正确的）

**替代方案（未选择）**：
- **方案 A**：顶层冻结为 Phase 1，优化后状态独立锚定在 `optimization.final`
  - 需修改 freshness 检查逻辑
  - 顶层 `result` 语义模糊（PASS 指哪个阶段？）
- **方案 B**：字段重命名（`affectedFileHashes` → `preOptimizationFileHashes`）
  - 不解决根本问题（顶层仍不自洽）

### 类型定义扩展 [INFERRED FROM CODE]

在 `VerificationContext` 接口新增可选 `timestamp` 字段：

```typescript
// src/core/verify/types.ts:66-75
export interface VerificationContext {
  contractVersion: '1.0' | string;
  executionMode?: string;
  evidenceFiles: string[];
  evidenceFingerprint: string;
  evidenceFingerprintEntries?: EvidenceFingerprintEntry[];
  skippedEvidenceFiles?: string[];
  gitHeadCommit?: string;
  gitDiffSummary?: string;
  timestamp?: string;  // 新增
}
```

**权衡**：
- ✅ 可选字段保证向后兼容（已有记录无 `timestamp` 仍可读取）
- ✅ 语义明确：记录快照的时刻

## Risks / Trade-offs

1. **语义变更** [REVIEW NEEDED]
   - 顶层 `verificationContext` 从"Phase 1 快照"变为"最终态快照"
   - 依赖顶层表示 Phase 1 状态的代码可能需要改为读取 `optimization.baseline`
   - **缓解**：baseline 完整保存了 Phase 1 快照，信息无丢失

2. **已归档 change 的历史记录** [REVIEW NEEDED]
   - 修复前归档的 change 中，`.verify-result.json` 顶层快照仍是不一致的
   - 这些记录无法追溯对应的真实提交
   - **缓解**：仅影响审计追溯，不影响功能；可文档化说明修复前的记录格式差异

3. **类型兼容性**
   - 新增可选字段不破坏已有代码
   - freshness 检查不依赖 `timestamp`（只检查 gitHead 和 evidenceHash）

## Open Questions

无（代码已实现）
