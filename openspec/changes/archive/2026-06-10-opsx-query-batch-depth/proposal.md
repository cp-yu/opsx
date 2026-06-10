# opsx-query-batch-depth

## Why

`openspec opsx query` 当前只接受单个 node-id 且 relations 固定一跳，agent（impact-sweeper / propose / apply）为凑齐上下文必须连环点查询：每个节点一次进程启动、一次全量读文件，二跳展开靠模板中的 "one-hop/second-hop" 手工规则模拟。`restore-unified-opsx-read/design.md` 已将"多 node-id 子图切片"记录为演进路径方案 C 并显式推迟，本变更落地该路径。

## What Changes

- `openspec opsx query` 接受变长 node-id 参数（`query <node-id...>`），一次调用返回多个节点
- 新增 `--depth <n>` 选项（默认 1，上限 5），沿关系图双向 BFS 展开 N 跳，遍历所有关系类型并去重
- 输出形态双轨：单 ID 且未指定 `--depth` 时保持现有 `{node, relations, codeMap}` 形态完全不变；多 ID 或显式 `--depth` 时输出去重合并的子图形态 `{seeds, nodes, relations, codeMap, missing}`
- 批量部分失败语义：部分 ID 不存在 → 返回已找到结果 + `missing` 数组，退出码 0；全部不存在 → 退出码 1
- `--relations` / `--code-map` 过滤器对子图内所有节点生效
- 补全注册（command-registry）新增 `--depth` flag
- 模板层收编：`OPSX_CLI_QUERY_CONTEXT`、`OPSX_GENERATE_DELTA`、impact-sweeper 证据协议改为批量 + depth 调用指引，"one-hop/second-hop" 手工展开规则由 `--depth` 统一替代（术语决议：统一用 depth）
- 经 `openspec update` 再生 `.claude/` 与 `.codex/` 生成物

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `cli-opsx-query`: 命令签名从单 node-id 扩展为变长参数 + `--depth`；新增子图输出形态、部分失败语义、过滤器作用域三组 requirement；单节点默认形态保持不变（向后兼容钉死为 Scenario）
- `ai-impact-sweeper`: 证据协议数据访问路径从"每个节点执行一次 `openspec opsx query <node-id> --json`"改为单次批量 + depth 调用
- `ai-workflow-templates`: sweeper 证据协议中 one-hop/second-hop 手工展开规则改写为 depth 语义（原 spec 中 "inspect one-hop OPSX neighbors / expand to second-hop only when…" 的规则由 `--depth` 参数承载）

## Impact

- **CLI 层**：`src/commands/opsx.ts`（变长参数、BFS 展开、子图输出）、`src/core/completions/command-registry.ts`（`--depth` 补全）
- **数据层零改动**：复用 `readProjectOpsx()`，`bundle.relations` 已提供全量边表
- **模板层**：`src/core/templates/fragments/opsx-fragments.ts`（`OPSX_CLI_QUERY_CONTEXT`、`OPSX_GENERATE_DELTA`）、`src/core/templates/workflows/impact-sweeper.ts`（证据协议）、`propose.ts` / `apply-change.ts` 内联指引
- **测试**：`test/commands/opsx.test.ts`、`test/cli-e2e/opsx-query.test.ts`、`test/core/templates/opsx-fragments.test.ts`、`test/core/templates/impact-sweeper-template.test.ts`、`test/commands/completion.test.ts`
- **生成物**：`.claude/skills/`、`.claude/commands/opsx/`、`.codex/skills/` 经 `openspec update` 再生
- **时序约束**：活跃变更 `restore-unified-opsx-read` 正在 apply 中途且同样修改 `opsx-fragments.ts` 及其测试，本变更实现必须在其归档后启动（制品生成不受影响）
- **范围边界**：`opsx-shared-context` spec 不修改——批量调用仍是"点查询补充"定位，与其 "CLI 点查询互补定位" requirement 不冲突；`openspec-optimizer-skill` 的"一跳邻居"措辞属另一 skill 的独立协议，不在本次范围

<!-- Smart Routing Decision: Design Summary found and used (explore 会话, 2026-06-10) -->
