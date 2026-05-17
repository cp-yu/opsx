## Why

Phase 2 `--type=optimization` 在记录 `affectedFileHashes` 时从磁盘采样当前文件 hash。apply-change workflow template 指示主 agent 先应用 patch 再调用 optimization CLI，导致采样到的是 post-patch hash。后续 verification 对比 "当前 hash == affectedFileHashes" 判定为 `PATCH_NOT_APPLIED`，造成误报。

## What Changes

- 重排 `apply-change.ts` Step 8 中 Phase 2 optimization 循环的时序指令：将 `phase2 --type=optimization` 调用移到 patch 应用之前
- 在 template 文本中增加显式时序约束注释，防止未来误改

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `apply-verify-integration`: Phase 2 optimization 循环的时序约束从隐式变为显式——CLI 调用 MUST 在 patch 应用之前执行

## Impact

- 文件：`src/core/templates/workflows/apply-change.ts`（template 文本修改）
- 无 CLI 代码改动、无数据模型改动、无 optimizer/reviewer skill 改动
- 向后兼容：仅影响 AI agent 的行为指令，不影响已有 `.verify-result.json` 数据
