## Why

propose/apply 自归档变更 `2026-06-04-unify-cli-query-interface` 起仅依赖 CLI 点查询获取 OPSX 上下文，但 `openspec opsx query` 必须先知道 node-id，agent 无法获得全局 domains→capabilities 地图与 project intent/scope，导致工作流启动阶段上下文丢失。同时该归档变更未交付 `opsx-shared-context` 的 spec delta，spec 与代码已经漂移（spec 仍要求三个工作流统一引用 `OPSX_SHARED_CONTEXT`，且要求 fragment 包含 `project:` 块 intent/scope 指引，二者均已被代码违反）。

本变更显式取代（supersede）unify 变更中"模板不直读 OPSX YAML"的部分理由：CLI 仍是节点细节的唯一稳定数据接口，但全局图获取回归整读 `openspec/project.opsx.yaml`——两者互补而非互斥。

## What Changes

- 重写 `OPSX_SHARED_CONTEXT` fragment 为单文件协议：整读 `openspec/project.opsx.yaml`（仅此一个文件），先读 `project:` 块 intent/scope（紧跟 domains 指引后），不再指引读取 `project.opsx.relations.yaml`、`project.opsx.code-map.yaml` 或 `openspec/specs/`；保留"导航上下文，不替代 change artifacts"定位
- explore / propose / apply 三个工作流模板（skill + command 双模板）统一注入 `OPSX_SHARED_CONTEXT`：propose 在 artifact 生成循环前，apply 在读取 change artifacts 前
- `OPSX_CLI_QUERY_CONTEXT` 保留但定位降级为点查询补充，首句"instead of reading OPSX YAML files directly"改为互补措辞
- `OPSX_NAVIGATION_GUIDANCE` 不变，仍为 explore 专属宽视野
- 翻转 `test/core/templates/opsx-fragments.test.ts` 中"propose/apply 不得含直读措辞"的断言
- 经 `openspec update` 再生 `.claude/skills/` 与 `.claude/commands/` 生成物

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `opsx-shared-context`: "统一加载协议"改为单文件协议（intent/scope 指引位置改为"domains 指引后"，删除 code-map 前置条件）；explore 场景"三件套"措辞改为"共享单文件 + explore 专属导航"；"Fragment 一致性"要求保留（代码将重新满足）；新增"CLI 点查询互补定位"要求约束 `OPSX_CLI_QUERY_CONTEXT` 措辞

（核实说明：`ai-workflow-templates` 的两条 "CLI 查询接口" 要求仅规定以 `openspec list --specs --json` 替代 deprecated 命令，未禁止直读 YAML，本变更后依然成立，故不修改该 spec。）

## Impact

- **模板层**：`src/core/templates/fragments/opsx-fragments.ts`（`OPSX_SHARED_CONTEXT` 重写、`OPSX_CLI_QUERY_CONTEXT` 措辞）、`src/core/templates/workflows/propose.ts`、`src/core/templates/workflows/apply-change.ts`（注入点）；`explore.ts` 零改动
- **测试**：`test/core/templates/opsx-fragments.test.ts`（断言翻转）、`test/core/templates/propose-template.test.ts`、`test/core/templates/explore-template.test.ts`（受牵连断言检查）
- **生成物**：`.claude/skills/openspec-{explore,propose,apply-change}/SKILL.md`、`.claude/commands/opsx/{explore,propose,apply}.md` 需再生
- **CLI 代码零改动**：`openspec opsx query` / `openspec list --specs --json` 保留为节点细节接口
- **范围边界**：`ai-workflow-templates` spec 中 sweeper 直读措辞漂移（L249）不在本次范围；`opsx-shared-context` spec 漂移的 git 考古由独立处理流程承担，修复本身由本变更交付

<!-- Smart Routing Decision: Design Summary found and used -->
