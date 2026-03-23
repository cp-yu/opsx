## Why

当前 `/opsx:propose` 在生成 `proposal.md`、`specs/`、`design.md`、`tasks.md` 以及 `opsx-delta.yaml` 之后，会直接宣告可进入 `/opsx:apply`。这让明显失真的 planning artifacts 过早流入后续流程：

- `specs` 若不符合 delta spec 规范，后续 `validate`、`sync`、`archive` 才会暴露问题
- `opsx-delta.yaml` 若结构或引用关系有误，通常要到同步或归档阶段才失败
- `proposal.md`、`design.md`、`tasks.md` 若偏离模板结构，也缺少一个统一的收尾检查点

我们不想把 `propose` 变成新的硬 gate。它仍然应该是提示词工作流，而不是一个重程序化的阻断命令。但它需要一个最小、清晰、可修复的收尾体检步骤。

## What Changes

- 为 `/opsx:propose` 增加一次 post-propose 文档体检步骤
- 该体检为 warning-only，不阻断 “Ready for implementation”
- `specs` 校验契约与后续 `sync`、`archive` 使用的 spec 校验方法保持基本一致
- `opsx-delta.yaml` 校验契约与后续 `sync`、`archive` 的 OPSX dry-run 合并校验保持基本一致
- `proposal.md`、`design.md`、`tasks.md` 仅做基于当前 schema template 的轻量结构检查
- 发现 warning 后，agent 只进行单轮修复，再报告“已修复项 / 剩余 warning”

## Capabilities

### New Capabilities
- `opsx-propose-skill`: 定义 `/opsx:propose` 在 planning artifacts 生成后的 warning-only 校验与单轮修复行为

### Modified Capabilities
- `cli-artifact-workflow`: 明确 artifact-ready 并不意味着跳过收尾体检，但 post-propose 校验仍属于工作流层而非 CLI gate

## Impact

- Affected specs:
  - `opsx-propose-skill`（新增）
  - `cli-artifact-workflow`（可能需要补充交叉引用或边界说明）
- Affected code:
  - `src/core/templates/workflows/propose.ts`
  - 与 change/spec 校验复用相关的 validation helpers
  - 与 OPSX dry-run 合并校验复用相关的 sync/archive 基础设施
- Affected docs:
  - `/opsx:propose` 的命令文档与工作流说明
  - 必要时补充 warning-only 行为示例
