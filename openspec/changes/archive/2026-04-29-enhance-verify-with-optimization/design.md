## Context

当前 OpenSpec 工作流为 `propose → apply → verify → sync → archive`。`verify` 通过 clean-context subagent 执行一致性检验，输出 `.verify-result.json`（顶层 `result` 为 `PASS` / `PASS_WITH_WARNINGS` / `FAIL_NEEDS_REMEDIATION`）。

现有 `add-code-review-command` 设计引入了独立的 `refine` 命令族作为 verify 之后的可选质量子循环。该方案存在以下问题：

- 命令膨胀：4 个新 CLI 命令（review、fix、status、context）
- 文件碎片化：3 种新持久化文件（`.refine-review-result.json`、`.refine-fix-result.json`、`quality-context.yaml`）
- 工作流复杂度：用户需理解"主管线"和"可选子循环"的区别
- 冗余抽象：quality-scorecard 与 verify 已有的 Completeness/Correctness/Coherence 评分体系并行但未整合

经四轮深入分析，决定将代码质量诊断与修复的职责合并到现有 `verify` 中，升级为两阶段质量门禁。

### 约束

- 不修改 CLI 命令结构（不新增命令）
- 不新增持久化文件类型，只扩展 `.verify-result.json`
- 顶层 `result` 三值语义不变（消费者：archive、apply 模板）
- 当前 worktree 非空时不能仅凭 dirty 判定阻止 Phase 2；需要依赖 checkpoint 保留并恢复 Phase 1 基线
- 跨平台兼容（Windows/Linux/macOS）

## Goals / Non-Goals

**Goals:**
- 将 verify 升级为两阶段质量门禁：Phase 1 一致性检验 + Phase 2 最优性检验
- Phase 2 使用 Search/Replace 块替代 unified diff（容忍 LLM 格式误差）
- 使用 `git stash` checkpoint 完整保存并恢复 Phase 1 基线
- 三类预算控制防止无限循环
- 不因当前 worktree 非空而自动跳过 Phase 2；显式跳过仅由 config/CLI 控制
- 扩展 `.verify-result.json` 的 `optimization` 对象，不影响现有 consumers

**Non-Goals:**
- 不创建任何新的 CLI 命令
- 不创建 feedback-loop 持久化学习机制（`quality-context.yaml`）
- 不创建独立的三维评分模型（内联到 verify 引擎即可）
- 不支持多轮迭代修复（单轮修复，3 次失败后降级通过）
- 不支持 standalone 模式（仅 change-scoped pipeline 模式）

## Decisions

### Decision 1: 使用 Search/Replace 块替代 Unified Diff

**选择**: Subagent 输出 Search/Replace 块（`<<<SEARCH...REPLACE>>>` 格式），由主 agent 进行模糊匹配应用。

**替代方案**: Unified diff patch 通过 `git apply` 应用。

**理由**: LLM 生成 unified diff 时存在行号偏移、上下文匹配错误等历史问题。Search/Replace 块允许主 agent 做 whitespace 归一化后的字符串匹配，容忍缩进差异，提高一次性成功率。同时格式错误不计入行为重试次数，由独立的格式重试预算控制。

**实现要点**:
- 每个 Search/Replace block 必须带显式文件路径
- 匹配策略：先 exact match，失败后 whitespace 归一化（行尾空白 + 缩进 + 换行风格）再匹配
- 匹配结果必须恰好 1 处
- 所有 blocks 先预校验再原子应用
- 禁止 rename/create/delete（只允许修改既有 tracked 文件）

### Decision 2: 使用 git stash checkpoint 保存并恢复 Phase 1 基线

**选择**: `git stash push -u -m "verify-phase2-checkpoint"` 创建 checkpoint，随后 `git stash apply` 将 Phase 1 基线恢复回工作区；优化失败时通过丢弃 speculative edits 后再次 `git stash apply` 完整恢复。

**替代方案**: `git commit-tree` + `git write-tree`（隐式快照）、`git restore` 回滚到 HEAD。

**理由**: git stash 对用户更直观，可以同时保存 tracked 和 untracked 文件（`-u` 标志），并且允许主 agent 在保留 checkpoint 的同时继续工作于同一份 Phase 1 基线。相比 `commit-tree`/`write-tree` 不会创建孤儿引用。主要风险是嵌套 stash 和并发操作，需要在 Phase 2 启动前记录 stash 栈顶 hash，并在成功时 drop、失败时精确恢复。

### Decision 3: P1 拆分为 canonical 和 speculative 两种模式

**选择**: Phase 1 的验证逻辑共享同一个 `assess()` 函数，但包装为两种模式：
- `P1_CANONICAL`: 允许 write-back (`tasks.md`) 和 persist (`.verify-result.json`)
- `P1_SPECULATIVE_FENCE`: 只读 fence，禁止 write-back 和 persist

**理由**: Phase 2 内部调用 Phase 1 做 re-verify 时绝不能污染正式状态。如果 speculative re-verify 失败，将 CRITICAL issue 写入 `tasks.md` 或持久化 `FAIL_NEEDS_REMEDIATION` 到 `.verify-result.json` 会破坏 canonical 结论。

### Decision 4: 三类预算控制

**选择**:
- `maxBehaviorFailures = 3`：优化思路/方法错误（计入重试）
- `maxFormatRetries = 2`：Search/Replace 块格式/语法错误
- `maxMatchRetries = 2`：匹配不唯一/找不到锚点

**理由**: 格式错误与文件行数弱相关，与 LLM 输出格式强相关。固定小常数预算比按文件行数计算更合理。总共最多 7 次 subagent 调用的熔断机制防止无限循环。

### Decision 5: Degraded Pass 降级策略

**选择**: 3 次行为失败后静默回滚到 Phase 1 基线，输出 `PASS_WITH_WARNINGS`，`optimization.status = "DEGRADED"`。

**理由**: 不阻塞 archive 流程。"丑陋但正确的代码"优于"优雅但错误的代码"。用户获得的是"优化未成功但代码功能正确"的安心感。

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| git stash 嵌套/并发冲突 | 工作区状态丢失 | Phase 2 前记录栈顶 hash；成功时 drop，失败时丢弃 speculative edits 后精确 apply 恢复 |
| Search/Replace 匹配到多个位置 | 误修改错误代码 | 唯一性约束，失败降级到格式重试 |
| P1_SPECULATIVE 意外 write-back | 污染 canonical 状态 | 显式禁止指令 + coordinator 层二次检查 |
| Phase 2 增加 verify 延迟 | 用户体验下降 | `--skip-optimization` flag + `config.yaml` 开关 |
| Windows 路径处理 | stash/pop 路径分隔符差异 | 使用 `path.join()` 构建所有路径 |

## Open Questions

- `optimization.enabled` 在 `config.yaml` 中的默认值：建议 `true`（默认启用 Phase 2）
- 是否需要 `--verbose` 输出优化失败详情：建议默认简短总结，`--verbose` 展开
