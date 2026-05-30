<!--
Propose routing:
- Design Summary found: yes
- Input length: 0 explicit characters after command
- Detail score: satisfied by confirmed Design Summary
- Multi-subsystem: yes, but already explored and confirmed
- Decision: proceed using the confirmed Design Summary
-->
## Why

当前 apply 将单个 change 的编码执行切成 Master agent 生成 `.apply-steps`、Implementer subagent 再执行的两段流程。这个模型为跨上下文传包服务，但在单 change 连续实现时制造冗余中间制品、上下文丢失和旧概念噪音。

## What Changes

- **BREAKING**: 删除 apply Phase 0 的 `openspec-implementer` coding subagent 执行模型。
- **BREAKING**: 删除 `.apply-steps` 作为正式 apply 中间制品的生成、读取和恢复语义。
- apply Phase 0 改为 Master agent 直接读取 `tasks.md`、specs、design 和代码上下文，完成实现、测试、任务勾选和 remediation 修复。
- 保留 Phase 1 `openspec-reviewer` 和 Phase 2 `openspec-optimizer` clean-context 判断角色。
- internal skill 生成和安装不再包含 `openspec-implementer`。
- 清理模板、schema instruction、测试和文档中关于 implementer subagent、`.apply-steps`、cheap model implementer 的引用。

## Capabilities

### New Capabilities

### Modified Capabilities

- `apply-change-workflow`: apply Phase 0 改为 Master agent 直接编码执行，不再生成 `.apply-steps` 或 dispatch `openspec-implementer`。
- `apply-task-decomposition`: 任务执行计划从详细 step file/TDD handoff 改为 Master agent 基于 `tasks.md` 的直接实现和恢复循环。
- `apply-implementer-subagent`: 删除 implementer subagent 正式能力和所有行为要求。
- `internal-skill-installation`: internal skill 生成和安装集合明确排除 `openspec-implementer`。

## Impact

- Affected workflow templates: `src/core/templates/workflows/apply-change.ts`, `src/core/templates/workflows/implementer.ts`, `src/core/templates/skill-templates.ts`
- Affected generation: `src/core/shared/skill-generation.ts`
- Affected schema instruction: `schemas/spec-driven/schema.yaml`
- Affected tests: apply template tests, implementer template tests, skill generation tests, artifact workflow instruction tests
- Affected docs and OPSX: active docs, README, `openspec/project.opsx.yaml`, `openspec/project.opsx.relations.yaml`, `openspec/project.opsx.code-map.yaml`
