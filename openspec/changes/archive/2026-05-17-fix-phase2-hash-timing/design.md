## Context

Phase 2 优化循环中，`phase2 --type=optimization` CLI 调用 `hashFiles()` 从磁盘采样文件 hash 并记录为 `affectedFileHashes`。后续 `phase2 --type=verification` 通过 `findUnchangedOptimizationFiles()` 对比当前磁盘 hash 与 `affectedFileHashes`，若相同则判定 patch 未应用。

当前 `apply-change.ts` template Step 8 的指令时序为：
1. Optimizer 输出 blocks
2. 主 agent 应用 blocks（磁盘变为 post-patch）
3. Reviewer 验证
4. 记录 `OPTIMIZATION_PROPOSED`（采样 post-patch hash）
5. 记录 `verification PASS`（对比 hash 相同 → 误报 `PATCH_NOT_APPLIED`）

## Goals / Non-Goals

**Goals:**
- 修正 template 指令时序，使 `affectedFileHashes` 采样发生在 patch 应用之前
- 在 template 文本中显式标注时序约束，防止未来误改

**Non-Goals:**
- 不修改 CLI 代码（`hashFiles()`、`findUnchangedOptimizationFiles()` 逻辑不变）
- 不修改 optimizer/reviewer skill 定义
- 不扩展 `VerifyResult` 数据模型

## Decisions

### Decision 1: 仅修改 template 文本时序（C1 方案）

**选择**: 重排 `APPLY_VERIFY_PHASES` 常量中 Step 8 的指令顺序。

**替代方案**:
- C2: CLI 接受 `--pre-hashes` 输入参数 → 需要扩展 CLI 接口，改动范围大
- Optimizer subagent 内部调用 CLI → 需要扩展 optimizer 输入 bundle 和角色约束

**理由**: CLI 的 `hashFiles()` 设计意图本身正确（采样磁盘当前状态作为 baseline）。问题出在调用者时序，修正调用者指令即可。

### Decision 2: 正确时序

```
1. Optimizer 输出 Search/Replace blocks
2. 主 agent 调用 phase2 --type=optimization（磁盘 = pre-patch，hash 正确）
3. 主 agent 应用 blocks（磁盘变为 post-patch）
4. Reviewer 验证
5. 主 agent 调用 phase2 --type=verification（当前 hash ≠ affectedFileHashes → PASS）
```

### Decision 3: FAIL 路径安全性

Git checkpoint（`git stash push -u`）在第一次 optimization 之前创建，包含 Phase 1 状态的 `.verify-result.json`。FAIL 时 `git reset --hard` + `git clean -fd` + `git stash apply` 会恢复 `.verify-result.json` 到 Phase 1 状态，不会残留错误的 `PENDING_VERIFICATION` 状态。

## Risks / Trade-offs

- [依赖调用者纪律] 时序约束仍由 template 文本表达，LLM agent 可能不严格遵循 → 通过显式注释和明确的步骤编号缓解
- [template 文本重复] `apply-change.ts` 中 skill template 和 command template 共享 `APPLY_VERIFY_PHASES` 常量，修改一处即覆盖两处 → 无额外风险
