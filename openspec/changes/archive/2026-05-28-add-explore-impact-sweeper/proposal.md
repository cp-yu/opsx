## Why

`openspec-explore` 目前鼓励代码库探索，但缺少强制的 OPSX-grounded 影响面扫描方法。结果是 explore/propose 阶段容易把范围圈小，后续 apply 即使严格执行 tasks，也会运行后才暴露漏改点。

## What Changes

- 新增 `openspec-impact-sweeper` skill，用于针对单个项目概念生成轻量 JSON 影响面报告。
- 更新 `openspec-explore` 指令：在探索代码变更概念、术语映射不明确、或准备建议进入 proposal/change artifacts 前，MUST 调用 `openspec-impact-sweeper`。
- `openspec-impact-sweeper` MUST 优先读取 `openspec/project.opsx.yaml`、`openspec/project.opsx.code-map.yaml`、`openspec/project.opsx.relations.yaml`，并结合 git tracked 文件范围执行 repo-wide reverse search。
- sweeper 报告写入 `openspec/sweeper/impact-sweep-<english-project-term-slug>.json`；同一概念覆盖同一路径；仅返回报告路径。
- `openspec/sweeper/` 是工作报告目录，不是正式 OpenSpec artifact；只跟踪 `.gitignore`。
- 不新增 CLI command，不修改 propose/apply/verify 行为，不要求 propose 检查是否存在 Impact Sweep。

## Capabilities

### New Capabilities

### Modified Capabilities
- `ai-workflow-templates`: `openspec-explore` 将获得强制影响面扫描触发规则，并引入可复用的 `openspec-impact-sweeper` skill contract。

## Impact

- `src/core/templates/workflows/explore.ts`
- `src/core/templates/workflows/` 中新增 sweeper skill template 或等价注册位置
- `src/core/templates/index.ts` / `src/core/templates/skill-templates.ts` / `src/core/shared/skill-generation.ts` 等 skill 注册链路
- `test/core/templates/*` 中 explore 与 skill 生成相关测试
- `openspec/sweeper/.gitignore`
- `openspec/project.opsx.yaml` / `openspec/project.opsx.relations.yaml` / `openspec/project.opsx.code-map.yaml` 在归档时通过 `opsx-delta.yaml` 更新
