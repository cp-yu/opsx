## Context

当前 `applyPreparedChangeSync` 完成文件写入后，若 `.verify-result.json` 的 evidence fingerprint 中包含这些被改写的主输出文件（`project.opsx.yaml`、`openspec/specs/**`），fingerprint 即失效。调用方（archive CLI、agent 模板）被迫重新 verify。

`PreparedChangeSync` 结构已包含全部所需信息：changeDir 路径、写入的 spec target 列表、是否写入了 OPSX 文件。

## Goals / Non-Goals

**Goals:**
- sync 完成后自动刷新 `.verify-result.json` 中与 sync 输出重叠的 evidence 文件哈希
- 仅刷新 sync 实际改写过的 evidence 条目，不改动其他条目
- 对 `applyPreparedChangeSync` 的所有调用方透明生效

**Non-Goals:**
- 不改变 sync 的核心语义（delta → 主输出）
- 不改变 verify 的 freshness 判定算法
- 不改变 evidenceFiles 的构成规则
- 不新增 CLI 选项

## Decisions

### Decision 1: 刷新逻辑放在 `applyPreparedChangeSync` 内部

`applyPreparedChangeSync` 在 `writeProjectOpsx` 和 `writePreparedSpecs` 均成功后，调用新增的 `refreshVerifyEvidenceAfterSync`。

**选择理由**: 所有调用方（standalone sync、archive CLI、agent 模板）自动受益，无需各自感知此机制。

**备选方案**: 放在 archive.ts 中单独调用。缺点是 standalone `openspec sync` 不会触发刷新，agent 模板路径也需单独处理。

### Decision 2: 使用显式文件列表而非 pattern 匹配

从 `PreparedOpsxWrite` 和 `PreparedSpecWrite[]` 中提取实际写入的文件路径，构造 sync 输出路径集合。然后遍历 `evidenceFingerprintEntries`，只刷新路径在此集合中的条目。

同步写入的路径集合：
- OPSX: `openspec/project.opsx.yaml`, `openspec/project.opsx.relations.yaml`, `openspec/project.opsx.code-map.yaml`（从 OPSX_PATHS 常量获取）
- Specs: `prepared.specs.writes.map(w => w.update.target)`（相对于 projectRoot 的路径）

**选择理由**: 使用现有常量（OPSX_PATHS）和已有数据（SpecWrite.target），不引入 pattern 匹配或 regex，符合项目设计规则。

### Decision 3: 缺失或不完整的 verify-result 时静默跳过

若 `.verify-result.json` 不存在，或缺少 `evidenceFingerprintEntries`，则跳过刷新（no-op），不报错。

**选择理由**: 没有 verify result 是合法状态（change 尚未被 verify 过）。sync 的核心职责是发布 delta，不应因为缺少 verify result 而失败。

### Decision 4: 新增函数放在 freshness.ts 中

`refreshVerifyEvidenceAfterSync` 作为 `freshness.ts` 的导出函数，与 `computeEvidenceFingerprint`、`checkFreshness` 同模块。

函数签名：
```typescript
export async function refreshVerifyEvidenceAfterSync(
  changeDir: string,
  projectRoot: string,
  syncedFiles: string[]
): Promise<void>
```

其中 `syncedFiles` 是相对于 `projectRoot` 的 POSIX 路径数组。

## Risks / Trade-offs

- [sync 写入错误的文件内容] → 刷新后 fingerprint 反映错误状态。Mitigation: sync 在写入前已通过 referential integrity 和 code-map integrity 校验，且 prepare 阶段已做 spec validation。
- [sync 输出文件路径与 evidenceEntries 路径格式不一致] → 刷新遗漏。Mitigation: 统一使用 `toPosixRelative`（与 `computeEvidenceFingerprint` 相同的路径标准化函数）进行比较。