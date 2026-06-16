# Proposal: fix-verify-phase2-timestamp-sync

## 目标

修复 `verify phase2 --type=verification` 的时间线不一致问题：Phase 2 验证通过后更新 `evidenceFingerprintEntries` 为优化后文件哈希，但未同步更新 `gitHeadCommit` 和 `timestamp`，导致顶层 `verificationContext` 三字段（gitHead、evidenceHash、timestamp）不自洽，无法对应任何真实 git 提交。

## 范围

**涉及文件：**
- `src/commands/verify.ts` - Phase 2 verification 处理逻辑
- `src/core/verify/types.ts` - `VerificationContext` 类型定义

**影响能力：**
- `cap.verify.freshness-engine` - freshness 检查依赖顶层 `verificationContext` 的一致性

**不在范围：**
- Phase 1 逻辑（无需修改）
- baseline 保存机制（保持不变）
- seal 验证逻辑（受益于修复，无需调整）

## 价值

**修复前问题：**
1. 顶层 `verificationContext` 自相矛盾：`gitHeadCommit` 指向优化前提交，但 `evidenceFingerprintEntries` 包含优化后哈希
2. `verify status` freshness 检查误判为 STALE（gitHead 与当前 HEAD 不匹配）
3. 审计链断裂：无法从记录重建"哪个提交通过了验证"

**修复后效果：**
1. 顶层 `verificationContext` 三字段自洽，对应最终优化后的真实提交
2. freshness 检查正确判定为 FRESH（三字段匹配当前状态）
3. baseline 独立保存 Phase 1 快照，审计链完整

## 实现策略

在 `handleVerification` 函数的 Phase 2 PASS 分支中，同步更新 `verificationContext` 的三个字段：
- `evidenceFingerprint` 和 `evidenceFingerprintEntries`（已有）
- `gitHeadCommit` 到当前 HEAD（新增）
- `timestamp` 到当前时刻（新增）

## 风险

- **类型变更**：`VerificationContext` 接口新增 `timestamp` 字段（可选），已有记录兼容
- **语义变更**：顶层快照从"Phase 1 时刻"变为"最终态"，但 baseline 保留了 Phase 1 快照
