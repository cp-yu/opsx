# Design: opsx-query-batch-depth

## Context

`openspec opsx query`（`src/commands/opsx.ts`）当前签名为 `query <node-id>`，relations 输出固定为查询节点的一跳 incoming/outgoing。agent 消费者（impact-sweeper 证据协议、propose/apply 模板）对每个节点单独调用，二跳展开由模板中 "one-hop/second-hop" 手工规则承载。`restore-unified-opsx-read/design.md` 将"扩展 query 接受多 node-id 输出子图"记录为演进路径方案 C 并显式不实现；本变更是该路径的落地，主要消费者为 agent 工作流（explore 会话决策）。

术语决议（explore 会话）：用户的"多级搜索"与 specs 中 "one-hop/second-hop"、"一跳邻居"为同一概念，统一收编为 **depth**。

## Goals / Non-Goals

**Goals:**
- 一次 CLI 调用获取多个节点 + N 跳关系子图，替代 agent 连环点查询
- 单节点默认输出形态零变化（向后兼容）
- 模板层（fragment + sweeper 证据协议）迁移到批量 + depth 调用

**Non-Goals:**
- 不做关系类型过滤、方向过滤等图查询参数（explore 决策：纯深度展开，YAGNI）
- 不修改数据层 `readProjectOpsx()`（spec 强制复用，`bundle.relations` 已含全量边表）
- 不修改 `opsx-shared-context` spec（批量仍是"点查询补充"定位，措辞不冲突）
- 不触碰 `openspec-optimizer-skill` 的"一跳邻居"协议（另一 skill 的独立机制）

## Decisions

### D1: 双轨输出形态，而非统一子图形态

单 ID 且未显式指定 `--depth` → 维持 `{node, relations, codeMap}`；多 ID 或显式 `--depth` → 子图形态 `{seeds, nodes, relations, codeMap, missing}`。

- 备选：全部统一为子图形态。否决——现有 spec、单元/e2e 测试、sweeper 协议均依赖单节点形态，破坏兼容收益为零。
- 备选：批量返回 per-node 数组 `{results: [...]}`。否决——depth 展开下节点重复出现，去重合并的子图（`design.md` 方案 C 原文即"输出子图"）对 agent 信息密度更高。
- 子图形态字段：`seeds`（请求的有效 ID 数组）、`nodes`（去重节点数组，含 seed 与展开节点）、`relations`（去重边数组，平铺 `{from, to, type}`，不再分 incoming/outgoing——合并子图中方向相对每个 seed 不同，分桶无意义）、`codeMap`（`id → refs[]` 对象）、`missing`（未找到的请求 ID）。

### D2: depth 语义——双向 BFS、全关系类型、默认 1、上限 5

- 从全部 seeds 出发，沿 `bundle.relations` 双向（from→to 与 to→from）BFS 展开 ≤ depth 跳，节点与边去重。
- 遍历所有关系类型（KISS）；`contains` 边会带入 domain 节点，对导航场景可接受，agent 可自行忽略。备选 depends_on/relates_to 白名单——否决，引入第二个语义旋钮且与"纯深度展开"决策冲突。
- 默认 `--depth 1` 等价现状一跳；上限 5 防御性截断（OPSX 图直径小，>5 等价全图）。超出上限报参数错误。
- 非法值（非正整数）以非零退出码报错。

### D3: 部分失败语义

- 部分 seed 不存在：返回子图 + `missing` 数组，退出码 0——agent 批量探测 plausible node IDs 是常态，整体失败会迫使 agent 退回逐个查询。
- 全部 seed 不存在：退出码 1，错误信息保持现有格式（含前 5 个可用节点提示）。
- 单 ID 不存在：行为完全不变（退出码 1），由"单 ID 走旧轨"自然保证。

### D4: 过滤器作用于整个子图

`--relations` 省略 `codeMap` 字段，`--code-map` 省略 `relations` 字段，`nodes`/`seeds`/`missing` 恒在。与现有单节点过滤语义同构，无 per-node 粒度。

### D5: 模板层收编与 L249 漂移修复

- `OPSX_CLI_QUERY_CONTEXT`、`OPSX_GENERATE_DELTA` 改为批量调用指引（`openspec opsx query <node-id...> --json`，需要展开时加 `--depth 2`）。
- impact-sweeper 证据协议（`src/core/templates/workflows/impact-sweeper.ts`）：步骤 1 的 "For each plausible node ID" 循环改为单次批量调用；步骤 3-4 的 one-hop/second-hop 手工规则改写为 "默认 `--depth 1`，满足原二跳条件（共享基础设施/跨域/外向运行时使用）时改用 `--depth 2`"——展开**判据**保留，展开**机制**由 CLI 承载。
- `ai-workflow-templates` spec 的 "Impact sweeper evidence collection" requirement 需整块 MODIFIED：除 hop 句外，其首句 "SHALL read 三个 YAML 文件" 与 `ai-impact-sweeper` spec 的 MUST NOT 直读早已矛盾（restore-unified-opsx-read proposal 标记的 L249 漂移）。既然整块重写，一并改为 CLI 查询措辞，使该块自洽。这是本变更对该漂移的显式收编，不是范围蔓延。

### D6: 实现时序

`restore-unified-opsx-read` 正在 apply 中途（fragment 测试断言已翻转、源码未改），与本变更共同触碰 `opsx-fragments.ts` 及 `opsx-fragments.test.ts`。本变更的实现（/opsx:apply）MUST 在其归档后启动；制品先行生成不受影响。本变更模板措辞基于其确立的 "After reading shared `project.opsx.yaml` context" 互补定位演进。

## Risks / Trade-offs

- [双轨输出形态增加心智负担] → spec 以两组 Scenario 显式钉死分轨条件；`--depth 1` 显式传参即进入子图轨，规则单一
- [`contains` 全类型遍历在大图上输出膨胀] → depth 上限 5 + 默认 1；agent 指引中仅在满足二跳判据时用 `--depth 2`
- [与活跃变更的文件竞争] → D6 时序约束；归档前不启动 apply
- [模板措辞修改牵连生成物] → `openspec update` 再生 `.claude/`、`.codex/`，纳入 tasks 验收
- [completion.test.ts 的 arrayContaining 断言对新增 flag 静默通过] → 任务中显式扩展断言锁定 `--depth`

## Migration Plan

1. 等待 `restore-unified-opsx-read` 归档
2. CLI 层实现（旧轨行为不动，新轨增量）+ 单元/e2e 测试
3. 补全注册 + 测试
4. 模板层改写 + 模板测试翻转
5. `openspec update` 再生生成物
6. 回滚策略：单 commit 粒度按 TDD 循环提交，新轨独立于旧轨，revert 不影响现有消费者

## Open Questions

（无——explore 会话已决议主要消费者、深度语义、术语；其余语义由 D1-D5 钉死）
