## Context

当前 OpenSpec 的 verify → sync → archive 工作流完全依赖 AI agent 模板文本指令。Phase 2 被跳过、freshness 判定由 agent 手动计算、archive/sync 不校验 verify 结果等问题反复出现。需要引入 CLI 程序化门禁工具，将关键流程校验从"文本建议"提升为"CLI 强制执行"。

现有架构：verify-change.ts 和 archive-change.ts 中的 AI 模板通过文本指令描述 freshness 检查、Phase 2 执行、结果持久化等步骤。`src/core/archive.ts` 的 `ArchiveCommand` 完全不引用 `.verify-result.json`。

## Goals / Non-Goals

**Goals:**
- 新增 `openspec verify` CLI 命令族（`phase1`、`phase2`、`seal` 子命令），每个子命令是确定性状态门禁
- 将 freshness 判定（`tasksFileHash`、`evidenceFingerprint`）从 AI 文本指令迁移到 TypeScript 代码
- Phase 2 强制双调用机制：agent 必须分别提交优化结果和 speculative fence 验证结果
- `openspec sync` 和 `openspec archive` 增加 verify gate 入口校验
- Core 模式下 sync 改用 `openspec sync` CLI 工具，废弃手动内联 sync

**Non-Goals:**
- 不替代 AI agent 的推理判断（completeness/correctness/coherence 仍由 subagent 执行）
- 不改变 `.verify-result.json` 的顶层结构（向后兼容）
- 不改变 sync 和 archive 的核心逻辑（只增加入口门禁）
- 不控制 subagent 是否真的 spawn（CLI 只校验结果，不控制 AI 行为）

## Decisions

### 决策 1：CLI 命令族采用子命令结构

选择 `openspec verify phase1|phase2|seal` 嵌套子命令，而非独立顶层命令。

**理由**：与现有 `openspec change show|list|validate` 和 `openspec bootstrap init|status|validate` 模式一致。`registerVerifyCommand(program)` 注册函数与 `registerSyncCommand` 同模式。

**备选方案**：独立顶层命令 — 拒绝，因为与现有 CLI 组织方式不一致。

### 决策 2：Phase 2 双调用通过 CLI 状态追踪实现

Phase 2 需要 agent 至少调用 2 次 CLI：
1. `openspec verify phase2 --type=optimization` — 提交优化 subagent 结果
2. `openspec verify phase2 --type=verification` — 提交 speculative fence 结果

**理由**：引入新中间状态 `optimization.status = PENDING_VERIFICATION`，CLI 通过读取 `.verify-result.json` 中的当前状态来判断 agent 应该调用哪个 type。这从程序层面杜绝了跳过 P1_SPECULATIVE_FENCE 的行为。

**备选方案**：单次调用一次性提交所有 Phase 2 结果 — 拒绝，因为无法区分"优化未被尝试"和"优化后未验证"。

**Phase 2 优化状态转换表：**

```
┌──────────────────────────┬──────────────────────┬──────────────────────────────────┐
│ 当前 optimization.status │ --input type         │ 新 optimization.status            │
├──────────────────────────┼──────────────────────┼──────────────────────────────────┤
│ (首次调用,无 --input)     │ (无)                 │ PENDING_VERIFICATION             │
│ PENDING_VERIFICATION     │ optimization:applied │ PENDING_VERIFICATION (保持)       │
│                          │                      │   + affectedFileHashes 已记录     │
│ PENDING_VERIFICATION     │ optimization:not_..  │ NOT_NEEDED                       │
│ PENDING_VERIFICATION     │ reverify:PASS        │ IMPROVED                         │
│ PENDING_VERIFICATION     │ reverify:FAIL(+retry)│ PENDING_VERIFICATION (回退重试)    │
│ PENDING_VERIFICATION     │ reverify:FAIL(耗尽)   │ DEGRADED                         │
│ (配置禁用/--skip)         │ (无)                 │ SKIPPED                          │
│ ABORTED_UNSAFE           │ (任何)               │ (拒绝,保持 ABORTED_UNSAFE)        │
└──────────────────────────┴──────────────────────┴──────────────────────────────────┘
```

**非法状态转换（CLI 拒绝）：**
- `PENDING_VERIFICATION` + `optimization.affectedFileHashes` 已存在时提交 optimization → 错误："应提交 re-verify 结果"
- `PENDING_VERIFICATION` 无 `affectedFileHashes` 时提交 reverify → 错误："应先提交优化结果"
- `IMPROVED`/`DEGRADED`/`NOT_NEEDED` 时提交任何 → 错误："Phase 2 已完成"
- `SKIPPED`(config 未禁用) 时提交 → 错误："SKIPPED 仅当 config 禁用或 --skip-optimization 时合法"
- `--type=verification` 时 `--files` 文件哈希未变更 → 错误："检测到优化 patch 未应用"

### 决策 3：JSON 输入通过 --input 参数传递

Agent 将 AI 结果以 JSON 格式通过 `--input` 参数传给 CLI。

**理由**：与 Commander.js 的 `.option()` 模式一致。`openspec verify phase1 <change> --input '{"result":"PASS",...}' --json`

**备选方案**：stdin 管道 — 保留为备选，`--input` 更直观且与现有 CLI 选项模式一致。可同时支持两种方式（`--input` 优先，无 `--input` 时读 stdin）。

### 决策 4：Freshness 引擎独立模块

将 `computeTasksFileHash`、`computeEvidenceFingerprint`、`checkFreshness` 实现为独立 TypeScript 模块 `src/core/verify/freshness.ts`。

**理由**：CLI 命令、archive sync gate 等多处需要复用。与 `src/core/change-sync.ts` 的核心逻辑分离模式一致。

### 决策 5：Archive 和 Sync 的 Verify Gate 通过 CLI 工具实现

`openspec sync` 和 `openspec archive` 在执行前调用 freshness checker 校验 `.verify-result.json`。

**理由**：确保门禁逻辑集中在一处，而非分散在 AI 模板和 CLI 代码中。`syncCommand` 和 `ArchiveCommand.execute` 中增加预检查步骤。

**不通过时的行为**：exit 1 + 详细状态输出，agent 应展示给用户选择（运行 verify / 强制继续 / 放弃）。

### 决策 6：Core 模式 Sync 统一使用 CLI 工具

移除 `archive-change.ts:146` 和 `archive.md:154` 中的 "Do not require a separate `/opsx:sync` skill"。

**理由**：统一 agent 行为，避免 core/expanded 模式的 sync 路径分歧。`openspec sync` CLI 工具已存在且功能完备。

## Risks / Trade-offs

- **[Risk] CLI 工具增加 agent 调用延迟** → Mitigation: 每个子命令执行轻量（主要是文件读取和 JSON 解析），延迟在毫秒级
- **[Risk] `--input` JSON 可能很大（evidenceFiles 列表、issues 数组）** → Mitigation: 设置合理的 JSON 大小限制（如 1MB），超限时引导 agent 使用 `--input-file` 替代
- **[Risk] `PENDING_VERIFICATION` 中间状态如果 agent 崩溃会残留** → Mitigation: 下次调用 `phase2 --type=optimization` 时检测到 `PENDING_VERIFICATION` 状态，提示 agent 先完成验证或重置
- **[Trade-off] 增加了 CLI 命令数量** → 每个子命令职责单一，与现有 `bootstrap` 命令族复杂度相当
