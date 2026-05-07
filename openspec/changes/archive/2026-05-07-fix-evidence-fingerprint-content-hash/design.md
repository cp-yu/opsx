## Context

`computeEvidenceFingerprint` at `src/core/verify/freshness.ts:30-71` 使用 `fs.stat` 收集每个证据文件的 `(path, mtimeMs, size)` 元组，然后 `JSON.stringify` + `sha256` 生成整体指纹。`checkFreshness` 仅比对最终哈希值，不比对单个 entries。

问题：`mtimeMs` 随任何文件系统触碰而变化 — git checkout/reset, 编辑器保存, 测试运行 — 导致指纹失效。`tasksFileHash` 在同一文件中已使用 `sha256(file content)`，不一致。

影响范围极小：`EvidenceFingerprint.entries` 仅在其产生函数内部使用，下游只消费 `.hash` 字符串。类型的 `entries` 字段无外部消费者。

## Goals / Non-Goals

**Goals:**
- `computeEvidenceFingerprint` 改为基于文件内容哈希，消除元数据敏感性
- `EvidenceFingerprint.entries` 条目从 `{path, mtimeMs, size}` 改为 `{path, hash}`
- 从 `checkFreshness` 移除 `tasksFileHash` 校验，解决 verify 后标记完成导致误报 STALE 的鸡生蛋问题
- 更新相关规约和模板中的描述文本

**Non-Goals:**
- 不改变 `checkFreshness` 的比较架构（仍为多条件 AND，仅移除 tasksFileHash 条件）
- 不改变 `hashFiles` 函数（独立用途，已使用内容哈希）
- 不改变 `computeTasksFileHash` 函数（保留给需要独立校验 tasks.md 的场景）
- 不提供现有 `.verify-result.json` 的迁移脚本（自然失效后重新验证即可）
- 不改变证据文件的选定机制（由 agent 决定）

## Decisions

### 1. entries 条目改为 `{path, hash}`

`hash` = `sha256(fs.readFile(filePath))`，与 `hashFiles()` 输出格式一致。

**替代方案**：仅哈希文件内容拼接（不保留 per-file entry）。拒绝 — 保留 entries 结构便于未来可能的分文件变更诊断。

### 2. `.verify-result.json` 过滤提前到 `fs.stat` 之前

将 `path.basename(filePath) === '.verify-result.json'` 检查从 `stat + isFile` 之后移到之前，减少不必要的系统调用。行为等价（原本 `.verify-result.json` 也会被跳过）。

### 3. 不实现流式哈希

证据文件为源代码/测试/配置文件（通常 < 1MB），`fs.readFile` 全量读入内存足够。与 `hashFiles()` 保持一致。

### 4. 移除 tasksFileHash 校验

`checkFreshness` 中移除 `tasksFileHash` 比对。理由：
- tasks.md 已在 evidenceFiles 中，被 evidenceFingerprint 覆盖 — 双重计数无额外保护
- verify 后标记任务完成是正常操作，tasksFileHash 必然变化 — 这是一个无解的鸡生蛋问题
- archive 流程第 4 步已单独检查任务完成状态，不依赖 hash

## Risks / Trade-offs

- [现有 `.verify-result.json` 全部变 STALE] → 预期行为，用户重新验证即可，影响一次性
- [内容哈希比 stat 慢] → 证据文件数量少（通常 < 30），文件小，开销可忽略
- [TOCTOU] → 原实现已有相同的时间窗口，不引入新问题
- [EACCES 权限错误] → 原实现未处理，新实现保持一致
