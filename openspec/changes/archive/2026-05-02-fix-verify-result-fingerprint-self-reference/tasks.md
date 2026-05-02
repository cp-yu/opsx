## 1. 核心实现

- [x] 1.1 在 `computeEvidenceFingerprint` 的 `fs.stat` 成功后，使用 `path.basename` 检查文件名是否为 `.verify-result.json`，若是则放入 `skippedFiles` 并 `continue` 跳过

## 2. 测试

- [x] 2.1 在 `test/core/verify/freshness.test.ts` 中添加测试：当 evidenceFiles 包含 `.verify-result.json` 时，该文件被排除在 entries 之外，放入 skippedFiles
- [x] 2.2 添加测试：`.verify-result.json` 文件不存在时（ENOENT），也正常跳过（覆盖时序窗口场景）
- [x] 2.3 运行 `pnpm test verify-freshness` 确保现有测试不受影响

## 3. 验证

- [x] 3.1 运行 `pnpm test` 全量测试确认无回归
