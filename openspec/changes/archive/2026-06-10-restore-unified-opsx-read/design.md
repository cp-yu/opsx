# Design: restore-unified-opsx-read

## Context

归档变更 `2026-06-04-unify-cli-query-interface` 将 propose/apply 的 OPSX 上下文获取从直读 YAML 迁移到 CLI 查询，动机是消除 agent 侧重复实现查询逻辑、让 CLI 成为稳定数据接口。副作用：`openspec opsx query` 是点查询，agent 不先知道 node-id 就拿不到全局 domains→capabilities 地图与 project intent/scope，propose/apply 启动阶段出现上下文丢失。该变更还遗漏了 `opsx-shared-context` 的 spec delta，spec 与代码漂移至今。

当前三 fragment 状态（`src/core/templates/fragments/opsx-fragments.ts`）：
- `OPSX_SHARED_CONTEXT`（L12-18）：直读协议，仅 explore 注入；文本含 code-map/specs 指引，缺 spec 要求的 `project:` intent/scope 指引行
- `OPSX_CLI_QUERY_CONTEXT`（L29-34）：propose/apply 注入，首句表述为"替代直读"
- `OPSX_NAVIGATION_GUIDANCE`（L451-458）：explore 专属宽视野

## Goals / Non-Goals

**Goals:**
- explore/propose/apply 统一注入重写后的 `OPSX_SHARED_CONTEXT`（单文件协议：整读 `openspec/project.opsx.yaml`）
- 修复两处 spec/代码漂移：Fragment 一致性、`project:` intent/scope 指引缺失
- `OPSX_CLI_QUERY_CONTEXT` 降级为点查询补充，措辞去冲突

**Non-Goals:**
- 不改任何 CLI 代码（`opsx query` / `list --specs` 原样保留）
- 不修 `ai-workflow-templates` spec L249 的 sweeper 直读措辞漂移（独立问题，已另行记录）
- 不实现 OPSX 子图切片（见演进路径）
- 不为"AI 运行时是否真读了文件"建立验证机制（模板测试边界止于指令存在与位置正确）

## Decisions

### D1：全量直读（方案 A），取代 unify 变更的部分理由

- **取代范围**：仅"模板不直读 OPSX YAML"这一条。unify 的核心动机（sweeper 不重复实现查询逻辑、CLI 作为节点细节稳定接口）不受影响，CLI 点查询保留为唯一的节点 relations/code-map 细节接口。
- **理由**：点查询存在鸡生蛋问题——不知道 node-id 就查不到全局图。`project.opsx.yaml` 当前 397 行，整读成本可忽略。
- **已否决 方案 B（sweeper 报告驱动的 CLI 切片）**：sweeper 报告按概念命名而非 change 命名（一个 change 对应 0..n 个报告，CLI 无法确定输入）；生命周期不受管理（propose 可经 smart routing 跳过 explore，apply 更不保证报告存在）；数据循环（报告中 `opsx.nodes` 本就来自 `opsx query`，再喂回 CLI 是消费自己的输出）。
- **演进路径 方案 C（显式 node-id 子图切片）**：当项目规模大到全量读成本显著超过点查询时，扩展 `openspec opsx query` 接受多 node-id 输出子图；id 来源由各工作流自定（apply 用 opsx-delta、explore 用 sweep 报告），CLI 不耦合任何上游产物格式。本变更不实现。

### D2：单文件协议，relations/code-map 不入共享 fragment

共享基线只需全局结构与项目意图，`project.opsx.yaml`（schema_version + project + domains + capabilities）恰好自足。relations/code-map 属节点细节，走 `opsx query`。explore 例外：保留 `OPSX_NAVIGATION_GUIDANCE`，探索天然需要宽视野（code-map/specs 深挖），差异只在共享基线之上的第二层。

### D3：fragment 保持短小，不拆引用文件

新 `OPSX_SHARED_CONTEXT` 控制在 5 行以内（比现版少：删 code-map、specs 两行，增 intent/scope 一行）。`skill-template-length-check` 长度约束预计碰不到；若触顶优先压措辞，不拆分文件——fragment 本来就不应该长。

### D4：`OPSX_READ_CONTEXT` 别名不动

兼容别名保留，避免波及未知消费者；其值随 `OPSX_SHARED_CONTEXT` 重写自动更新。

### D5：注入位置即语义

- propose：artifact 生成循环开始前 → OPSX 约束 proposal 形成，而非 opsx-delta 阶段才补读
- apply：读取 change artifacts 之前 → 全局边界/依赖模型先入上下文，change 细节叠加其上
- skill 与 command 双模板都注入（两条分发路径行为一致）

## Risks / Trade-offs

- [部分推翻 unify 变更的记录性理由] → proposal.md Why 节显式 supersede，保留决策链
- [大项目全量读撑爆上下文] → 已知规模天花板，触发条件出现时走 D1 中的方案 C
- [模板改动后生成物漂移（`.claude/skills`、`.claude/commands`）] → tasks.md 将 `openspec update` 再生与内容抽查列为独立 Check
- [propose/apply 每次启动 +1 次文件读] → 接受；fragment 保留"导航上下文，不替代 change artifacts"定位句，防止 AI 将其当作权威行为规范
- [测试断言翻转遗漏（旧反向断言残留导致假绿/假红）] → 翻转 `opsx-fragments.test.ts:57-76` 时整体重写该用例，而非逐行修补

## Migration Plan

模板与测试同 PR 落地，`openspec update` 再生生成物后提交。回滚 = revert 单个提交（无数据迁移、无 CLI 接口变化）。

## Open Questions

（无）
