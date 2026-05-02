## Context

`computeEvidenceFingerprint` 函数遍历 `evidenceFiles` 列表，对每个文件收集 `(path, mtimeMs, size)` 元组，排序后计算 SHA-256。当 Agent 将 `.verify-result.json` 自身作为 evidenceFile 传入时，出现时序问题：

1. `verify` 命令调用 `computeEvidenceFingerprint` 时 `.verify-result.json` 尚不存在 → 落入 `skippedFiles`
2. 写入 `.verify-result.json` 后，该文件诞生
3. 后续 `checkFreshness` 调用 `computeEvidenceFingerprint` 时该文件已存在 → 被纳入 `entries` 参与哈希 → 指纹不匹配 → STALE

## Goals / Non-Goals

**Goals:**
- 阻止 `.verify-result.json` 参与 `evidenceFingerprint` 哈希计算，消除自指循环

**Non-Goals:**
- 不修改 `EvidenceFingerprint` 类型定义
- 不改变 `computeEvidenceFingerprint` 的函数签名
- 不影响其他 evidenceFile 的指纹计算逻辑

## Decisions

### 在 `computeEvidenceFingerprint` 中按文件名精确跳过

在文件遍历循环中，`fs.stat` 成功后，检查解析后的路径是否以 `.verify-result.json` 结尾。若是，则跳过该文件（不加入 `entries`）。

**为什么不是按目录边界排除：**
用户明确判断其他 `openspec/changes/` 下的文件不会产生类似的自指问题。按文件名精确排除是最小改动。

### 使用 `path.basename` 而非路径子串匹配

```typescript
if (path.basename(filePath) === '.verify-result.json') {
    skippedFiles.push(toPosixRelative(root, filePath));
    continue;
}
```

`path.basename` 跨平台安全，避免硬编码路径分隔符。

**为什么跳过而非报错：**
`computeEvidenceFingerprint` 对不存在的文件使用 `ENOENT` 跳过策略，而非抛出。对 `.verify-result.json` 保持同样的容错语义——记录到 `skippedFiles`，不影响其他文件的指纹计算。

## Risks / Trade-offs

- [Risk] 如果未来需要将 `.verify-result.json` 作为合法证据文件纳入指纹 → 当前修复阻止了这种可能性。但自指循环使其在数学上不可能，故此风险不存在。
