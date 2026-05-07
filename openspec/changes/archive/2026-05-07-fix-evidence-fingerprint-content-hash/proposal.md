## Why

`computeEvidenceFingerprint` 当前使用文件元数据 (`mtimeMs` + `size`) 计算证据指纹，而非文件内容哈希。任何文件系统触碰 (git checkout/reset, 编辑器保存, 测试运行) 都会改变 mtime 导致指纹失效 — 即使文件内容完全未变。这使 verify freshness 判定不可靠，apply→archive 流程中频繁出现误报 STALE。

`tasksFileHash` 在同一模块中已使用内容哈希 (`sha256(file content)`)，修复后两者保持一致。

## What Changes

- **BREAKING**: `EvidenceFingerprint.entries` 条目形状从 `{path, mtimeMs, size}` 改为 `{path, hash}`，其中 `hash` 为文件内容 SHA-256
- `computeEvidenceFingerprint` 实现从 `fs.stat` + 元数据收集改为 `fs.readFile` + 内容哈希
- 从 `checkFreshness` 中移除 `tasksFileHash` 校验 — tasks.md 已在 evidenceFiles 中被 evidenceFingerprint 覆盖，且 verify 后标记完成任务导致 hash 必然变化（鸡生蛋问题）
- 所有现有 `.verify-result.json` 文件将在修复后变为 STALE，需重新验证

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `verify-freshness-engine`: `evidenceFingerprint` 计算方式从元数据哈希改为文件内容哈希，entries 形状变更；FRESH 判定移除 tasksFileHash 条件
- `verify-cli-gate`: Phase 1 入口描述中 `evidenceFingerprint` 的计算说明更新

## Impact

- `src/core/verify/types.ts` — `EvidenceFingerprint` 接口
- `src/core/verify/freshness.ts` — `computeEvidenceFingerprint` 实现 + `checkFreshness` 移除 tasksFileHash 校验
- `src/core/templates/workflows/verify-change.ts` — 模板中的指纹描述文本
- `test/core/verify/freshness.test.ts` — 测试断言
- `openspec/specs/verify-freshness-engine/spec.md` — 规约
- `openspec/specs/verify-cli-gate/spec.md` — 规约
