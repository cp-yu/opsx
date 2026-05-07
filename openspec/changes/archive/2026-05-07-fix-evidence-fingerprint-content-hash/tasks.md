## 1. 类型定义

- [x] 1.1 修改 `src/core/verify/types.ts` — `EvidenceFingerprint.entries` 条目从 `{path, mtimeMs, size}` 改为 `{path, hash}`

## 2. 核心实现

- [x] 2.1 重写 `src/core/verify/freshness.ts` — `computeEvidenceFingerprint` 函数体，用 `fs.readFile` + 内容哈希替换 `fs.stat` + 元数据收集
- [x] 2.2 将 `.verify-result.json` 文件名检查提前到 `fs.stat` 之前
- [x] 2.3 从 `checkFreshness` 移除 `tasksFileHash` 校验（行 107-112），保留 `computeTasksFileHash` 函数不动

## 3. 测试

- [x] 3.1 更新 `test/core/verify/freshness.test.ts` — 将 `size` 断言改为 `hash` 断言（`expect.stringMatching(/^[a-f0-9]{64}$/)`）
- [x] 3.2 运行 `npx vitest run test/core/verify/freshness.test.ts test/core/verify/result-validator.test.ts` 确认通过

## 4. 规约同步

- [x] 4.1 更新 `openspec/specs/verify-freshness-engine/spec.md` — 指纹计算描述改为内容哈希；FRESH 判定移除 tasksFileHash 条件
- [x] 4.2 更新 `openspec/specs/verify-cli-gate/spec.md` — Phase 1 入口描述改为内容哈希

## 5. 模板文本

- [x] 5.1 更新 `src/core/templates/workflows/verify-change.ts:100` — 指纹描述改为 "relative POSIX path + content hash"

## 6. 验证

- [x] 6.1 运行 `pnpm test` 确保全量测试通过
