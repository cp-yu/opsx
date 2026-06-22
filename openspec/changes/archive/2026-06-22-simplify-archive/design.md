## Context

当前 archive 命令的 `execute()` 方法将 verify gate、sync 校验、validation、task check、archive-time sync 写入、目录移动全部耦合在一个平铺方法中。其中的 archive-time sync（`prepareChangeSync` + `applyPreparedChangeSync`）在 `--no-verify` 路径下会主动将 change delta 写入 main spec 和 OPSX 主文件。这导致：

- **职责越界**：archive 的语义是归档 change 目录，却顺手修改 main spec
- **错误传染**：sync 路径的 bug 通过这条副作用路径污染 archive
- **可预测性差**：用户执行 archive，发现 main spec 被修改但无预期
- **选项耦合**：`--no-verify` 同时跳过 freshness 检查和 sync 检查，两个独立门禁被捆绑

目标是将 archive 精简为纯归档操作，sync 职责完全归还给 `openspec sync`。

## Goals / Non-Goals

**Goals:**
- 删除 archive-time sync 写入路径，archive 不再调用 `prepareChangeSync` / `applyPreparedChangeSync`
- sync 检查从 verify gate 解耦为独立 `runSyncGate`，与 verify gate 正交
- 新增 `--no-sync` flag 控制 sync gate，`--no-verify` 不再隐含跳过 sync 检查
- 将 `execute()` 重构为 4 个独立 gate 方法的 pipeline
- 移除 `--skip-specs` flag（其控制的行为代码已不存在）

**Non-Goals:**
- 不修改 `change-sync.ts` 中的 `prepareChangeSync` / `applyPreparedChangeSync`（sync 命令独立使用）
- 不修改 `sync` 命令本身
- 不修改 verify gate 的 freshness 检查逻辑
- 不修改 archive 的目录移动逻辑
- 不改变 task gate、validation gate 的核心行为

## Decisions

### Decision 1: Gate 方法签名与 Pipeline 结构

每个 gate 方法签名统一为 `Promise<void>`：成功返回（隐式 continue），失败 throw Error 中断 pipeline，用户取消 return（early exit）。`execute()` 变为清晰的顺序调用链，不再使用嵌套 if-else。

**替代方案**：使用策略模式或 state machine 管理 pipeline。拒绝理由：4 个 gate 顺序固定，无运行时切换需求，策略模式引入不必要的抽象。

### Decision 2: Sync gate 检查使用现有 `getPendingChangeSync`

`getPendingChangeSync` 已完整实现"检测未合并 delta"逻辑（包括 already-applied 过滤、removal-only delta 幂等），不需要新增检查代码。sync gate 直接复用。

### Decision 3: `--no-sync` 确认交互风格与 `--no-verify` 一致

非 `--yes` 模式下 `--no-sync` 弹出 `@inquirer/prompts` confirm 警告，提示跳过 sync gate 的风险。`--yes` 模式下静默跳过。

### Decision 4: `--skip-specs` 彻底删除，不保留 deprecated alias

`--skip-specs` 控制的行为代码（archive-time sync 写入）已完全删除，保留 alias 会产生误导——用户以为某种"skip"功能仍存在。直接移除，依赖 CLI 报 unknown option 提供反馈。

### Decision 5: 测试策略—删旧添新

删除 6 个测试（archive-time sync 行为不再存在），新增 5 个 sync gate 测试（阻塞 + `--no-sync` 跳过 + 确认交互）。已有测试中依赖 `skipSpecs: true` 的改为 `noSync: true`。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 现有工作流隐式依赖 `--no-verify` 的 archive-time sync 自动合并 delta | 错误消息明确指引 `openspec sync <change-name>`；升级说明记录行为变更 |
| `--skip-specs` flag 移除后脚本报 unknown option | Changelog 标注 `--skip-specs → --no-sync` |
| 测试文件 1462 行，大规模删/增可能引入 mock 状态污染 | 分步验证：每个 gate 方法 + 对应测试独立跑通 |
| Gate 执行顺序变更可能影响错误消息 | 保持现有顺序 verify → sync → validation → task，不重新排列 |
