## Context

`/opsx:propose` 的职责是快速把用户意图收敛为可实施的 planning artifacts。它不是 `sync`，也不是 `archive`。因此这次设计的重点不是增加阻断式校验，而是在不改变工作流本质的前提下，补一个最小可信的收尾体检。

已有能力分布如下：

- `specs` 的结构校验已经存在于 change delta validation
- `opsx-delta.yaml` 的结构与完整性校验已经存在于 sync/archive 的 prepare 阶段
- `proposal.md`、`design.md`、`tasks.md` 没有值得直接复用的强校验器，适合做模板级轻检查

关键约束：

- `propose` 仍然是提示词工作流
- warning 不阻断 apply-ready
- 校验方法必须尽量复用后续 `sync` / `archive` 的契约，而不是另造一套“看起来像”的规则
- 修复只做单轮，不能进入无限改文档循环

## Goals / Non-Goals

**Goals:**

- 在 `propose` 结束前增加一次 warning-only 文档体检
- `specs` 校验与后续 change/spec validation 基本一致
- `opsx-delta` 校验与后续 sync/archive 的 dry-run 合并校验基本一致
- 对 `proposal.md`、`design.md`、`tasks.md` 提供轻量、模板驱动的结构检查
- 让 agent 在同一次 `propose` 中先修一次，再汇报结果

**Non-Goals:**

- 不把 `propose` 改造成阻断式 CLI gate
- 不直接调用 `openspec sync` 作为 post-propose 校验手段
- 不为 `proposal.md`、`design.md`、`tasks.md` 引入复杂语义 lint
- 不进行多轮自动修复直到 warning 清零

## Decisions

### Decision: 校验对齐“契约”，而不是对齐“命令表面”

`openspec sync` 当前会真的写主 specs 和主 OPSX 文件，不适合作为 `propose` 的收尾体检入口。  
因此对齐方式应为：

- `specs` 复用与 `validateChangeDeltaSpecs()` 等价的 delta spec 校验契约
- `opsx-delta` 复用与 `prepareChangeSync()` 中 OPSX prepare 阶段等价的 dry-run merge + integrity 校验契约

也就是说，`propose` 对齐的是后续流程的“校验语义”，不是它们的“副作用命令”。

### Decision: warning-only + 单轮修复

收尾流程固定为：

1. 生成 artifacts
2. 运行 post-propose 体检
3. 若有 warning，agent 进行一轮文档修复
4. 再检查一次
5. 汇报 fixed / remaining warnings

即使仍有 warning，也允许宣告 ready for apply，但必须显式披露剩余问题。

### Decision: 轻量文档检查以当前 schema template 为准

`proposal.md`、`design.md`、`tasks.md` 的轻量检查不得依赖散落文档中的示例章节名，而必须以当前 schema template 为准。  
这样可以避免“文档示例先漂移、校验器后误判”的老问题。

### Decision: 无 formal OPSX 时优雅跳过

若仓库不存在 `openspec/project.opsx.yaml`，则：

- 不对 `opsx-delta.yaml` 做 merge-based integrity warning
- 不报错
- 仅在最终报告中说明 OPSX 校验被跳过

这与现有 OPSX graceful degradation 的方向一致。

## Risks / Trade-offs

- 若 `propose` 提示词与程序化校验输出风格不一致，agent 可能修错方向
- 若没有抽出真正可复用的 OPSX dry-run helper，后续容易把 sync/archive 校验逻辑再复制一份
- 轻量文档检查若超出 template 边界，会快速膨胀成第二套弱规范系统
- 单轮修复意味着部分 warning 会被保留到最终输出，但这比无限回路更可控

## Sketch

```text
propose
  ├─ create proposal/specs/design/tasks
  ├─ create opsx-delta (if applicable)
  ├─ validate specs          ─┐
  ├─ validate opsx-delta     ├─> warnings
  ├─ check proposal/design/tasks ┘
  ├─ agent fixes once
  ├─ re-check once
  └─ final summary
       ├─ fixed warnings
       ├─ remaining warnings
       └─ ready for apply
```
