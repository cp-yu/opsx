## 1. Freshness 引擎核心模块

- [x] 1.1 创建 `src/core/verify/` 目录和 `types.ts` — 定义 `FreshnessResult`、`ArchiveCompatibility`、`VerifyResult`、`Phase1Input`、`Phase2Input`、`SealReport` 等 TypeScript 接口
- [x] 1.2 实现 `src/core/verify/freshness.ts` — `computeTasksFileHash(tasksPath)` 计算 tasks.md 的 SHA-256
- [x] 1.3 实现 `src/core/verify/freshness.ts` — `computeEvidenceFingerprint(evidenceFiles, projectRoot)` 基于 (路径+mtime+size) 排序后计算 SHA-256
- [x] 1.4 实现 `src/core/verify/freshness.ts` — `checkFreshness(changeDir, projectRoot)` 判定 FRESH / STALE / MISSING
- [x] 1.5 实现 `src/core/verify/freshness.ts` — `checkArchiveCompatibility(verifyResult)` 检查 optimization.status 是否可归档，含 PENDING_VERIFICATION 拒绝逻辑

## 2. Verify CLI 命令族

- [x] 2.1 创建 `src/core/verify/result-validator.ts` — `validatePhase1Input(input)` 校验 Phase 1 JSON（result 枚举、issues[]、evidenceFiles[]）
- [x] 2.2 实现 `src/core/verify/result-validator.ts` — `validatePhase2Input(input, type)` 校验 Phase 2 JSON（按 --type=optimization|verification）
- [x] 2.3 实现 `src/core/verify/result-validator.ts` — `validateVerifyResult(result)` 校验 .verify-result.json 结构完整性
- [x] 2.4 实现 `src/core/verify/result-validator.ts` — `generateSealHash(result)` 生成防篡改 seal hash
- [x] 2.5 创建 `src/commands/verify.ts` — `registerVerifyCommand(program)` 注册 `openspec verify` 子命令组
- [x] 2.6 实现 `openspec verify phase1 <change-name>` 命令 — 入口条件校验 + JSON 输入接受 + canonical Phase 1 payload 写入 + 下一步指令输出
- [x] 2.7 实现 `openspec verify phase2 <change-name>` 命令 — 支持 `--type=optimization` 调用（校验 entry + 写入 optimization.attempts + 设置 PENDING_VERIFICATION 或 NOT_NEEDED）
- [x] 2.8 实现 `openspec verify phase2 <change-name>` 命令 — 支持 `--type=verification` 调用（校验 PENDING_VERIFICATION 状态 + 处理 PASS/FAIL/DEGRADED 分支）
- [x] 2.8.1 实现 `--files` 参数支持：`--type=optimization` 时接受逗号分隔文件路径，计算 SHA-256 存入 `optimization.affectedFileHashes`；`--type=verification` 时重新计算哈希比对，未变更则拒绝 (exit 1)
- [x] 2.9 实现 `openspec verify seal <change-name>` 命令 — 结构校验 + seal hash 输出
- [x] 2.10 实现 `--input` 参数 JSON 解析（同时支持 stdin fallback）
- [x] 2.11 实现 `--json` flag 输出模式（所有子命令）

## 3. CLI 入口注册

- [x] 3.1 修改 `src/cli/index.ts` — 导入并调用 `registerVerifyCommand(program)`，在 `registerSyncCommand` 附近注册

## 4. Sync Verify Gate

- [x] 4.1 修改 `src/commands/sync.ts` — `syncCommand()` 中增加 verify gate 预检查（调用 `checkFreshness` + `checkArchiveCompatibility`）
- [x] 4.2 verify gate 不通过时 exit 1 + 输出详细状态（verify 结果 + optimization 状态）
- [x] 4.3 增加 `--no-verify` flag 允许跳过 verify gate（不推荐，需用户确认）

## 5. Archive Verify + Sync Dual Gate

- [x] 5.1 修改 `src/core/archive.ts` — `ArchiveCommand.execute()` 中增加 verify gate 预检查
- [x] 5.2 修改 `src/core/archive.ts` — 增加 sync gate 预检查（调用 `assessChangeSyncState` 判断 `requiresSync`）
- [x] 5.3 双重门禁不通过时 exit 1 + 合并输出两个门禁状态
- [x] 5.4 增加 `--no-verify` flag 允许跳过 verify+sync gate（不推荐，需用户确认）

## 6. Agent 模板更新

- [x] 6.1 修改 `src/core/templates/workflows/verify-change.ts` — Step 8 (`buildCanonicalPhase1Step`) 替换为 `openspec verify phase1` CLI 调用指令
- [x] 6.2 修改 `src/core/templates/workflows/verify-change.ts` — Step 9 (`buildPhase2Step`) 替换为 `openspec verify phase2 --type=optimization` CLI 调用指令
- [x] 6.3 修改 `src/core/templates/workflows/verify-change.ts` — Step 10 (`buildReverifyStep`) 替换为 `openspec verify phase2 --type=verification` CLI 调用指令
- [x] 6.4 修改 `src/core/templates/workflows/verify-change.ts` — Step 11 (`buildPersistStep`) 移除持久化文本（CLI 已处理），替换为 `openspec verify seal` 调用
- [x] 6.5 修改 `src/core/templates/workflows/archive-change.ts` — Step 2 "Unified Full Verify Gate" 替换文本 freshness 检查为 `openspec verify status` 或等价 CLI 调用
- [x] 6.6 修改 `src/core/templates/workflows/archive-change.ts` — Step 5 删除 "Do not require /opsx:sync"，改为 `Run openspec sync <change-name>`
- [x] 6.7 修改 `.claude/commands/opsx/archive.md` — 同步 Step 2 和 Step 5 的文本替换
- [x] 6.8 修改 `src/core/templates/workflows/sync-specs.ts` — 增加 verify gate 检查提示

## 7. 测试

- [x] 7.1 创建 `test/core/verify/freshness.test.ts` — 测试 `computeTasksFileHash`、`computeEvidenceFingerprint`、`checkFreshness`、`checkArchiveCompatibility`
- [x] 7.2 创建 `test/core/verify/result-validator.test.ts` — 测试 Phase 1/Phase 2 输入校验、`.verify-result.json` 结构校验、seal 生成
- [x] 7.3 创建 `test/commands/verify.test.ts` — 参考 `test/commands/sync.test.ts` 模式测试各子命令的 JSON 输出和退出码
- [x] 7.3.1 在 `test/commands/verify.test.ts` 中增加文件哈希追踪测试 — 测试 --files 参数、哈希存储/比对、未变更拒绝、已变更放行
- [x] 7.4 更新 `test/commands/sync.test.ts` — 增加 verify gate 相关测试用例
- [x] 7.5 更新 `test/core/archive.test.ts` — 增加 verify+sync gate 相关测试用例（如存在）
- [x] 7.6 运行 `pnpm test` 确保所有测试通过且无回归
