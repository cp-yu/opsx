## Why

当前 OpenSpec 的 verify → sync → archive 工作流的阶段推进和状态校验完全依赖 AI agent 自觉遵守文本指令。Phase 2 最优性检验被静默跳过、`.verify-result.json` 的 freshness 判定由 agent 手动计算、archive/sync 不校验 verify 结果是否合法等问题反复出现。需要引入程序化的 CLI 门禁工具，将关键流程校验从"AI 文本建议"提升为"CLI 强制执行"，确保 agent 每一步都必须通过程序校验才能进入下一阶段。

## What Changes

- **新增 `openspec verify` CLI 命令族**：`phase1`、`phase2`（双调用：`--type=optimization` + `--type=verification`）、`seal` 子命令。每个子命令都是状态门禁，agent 必须调用并传入 JSON 结果，CLI 校验通过后写入 `.verify-result.json` 并输出下一步指令
- **Phase 2 强制双调用机制**：Phase 2 要求 agent 至少调用 2 次（优化 subagent 结果 → CLI 记录；speculative fence subagent 结果 → CLI 记录），从程序层面杜绝跳过 P1_SPECULATIVE_FENCE 的行为
- **`openspec sync` 增加 verify 入口门禁**：同步前校验 `.verify-result.json` 是否 FRESH + archive-compatible，不通过则 exit 1 + 询问用户如何操作
- **`openspec archive` 增加 verify + sync 双重入口门禁**：归档前校验 verify 和 sync 状态，不通过则合并询问用户。**BREAKING**: core 模式下改为调用 `openspec sync` CLI 工具，废弃手动内联 sync
- **Freshness 判定从 AI 文本指令迁移到 TypeScript 代码**：`tasksFileHash`、`evidenceFingerprint` 等由 CLI 工具确定性计算，不再依赖 agent 手动执行
- **新增 `optimization.status = PENDING_VERIFICATION` 中间状态**：用于跟踪 Phase 2 双调用间的状态转换

## Capabilities

### New Capabilities
- `verify-cli-gate`: 程序化 verify 门禁 CLI 工具，为 Phase 1/Phase 2/sync/archive 提供入口条件校验、JSON 输入接受、结果写回和下一步指令输出
- `verify-freshness-engine`: 确定性 freshness 判定引擎，用代码实现 tasksFileHash、evidenceFingerprint 计算，替代 AI 文本指令

### Modified Capabilities
- `verify-optimization`: Phase 2 最优性检验增加 PENDING_VERIFICATION 中间状态和双调用强制机制
- `archive-verify-gate`: archive 入口校验从 AI 文本指令迁移为 CLI 工具调用，增加 sync 状态联合校验
- `change-specs-sync`: core 模式下 sync 从手动内联改为调用 `openspec sync` CLI 工具

## Impact

- 受影响的代码：`src/commands/verify.ts` (新), `src/core/verify/` (新), `src/cli/index.ts` (注册), `src/commands/sync.ts` (增加 verify gate), `src/core/archive.ts` (增加 verify+sync gate)
- 受影响的模板：`src/core/templates/workflows/verify-change.ts` (Step 8-11 替换为 CLI 调用), `src/core/templates/workflows/archive-change.ts` (Step 2/5 替换), `.claude/commands/opsx/archive.md` (同步更新)
- 受影响的 spec：`openspec/specs/verify-optimization/spec.md` (新增 PENDING_VERIFICATION 状态), `openspec/specs/archive-verify-gate/spec.md` (sync gate 联合校验)
- 向后兼容：`.verify-result.json` 结构保持兼容，新增 `PENDING_VERIFICATION` 不影响现有 consumers；无 optimization 字段的 legacy 结果仍被接受
