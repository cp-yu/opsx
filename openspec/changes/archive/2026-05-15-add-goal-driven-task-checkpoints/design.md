## Context

OpenSpec 当前有两套不同的校验边界：CLI 负责确定性结构和规约合法性，Agent workflow 负责生成、体检和必要时修正文档。`tasks.md` 目前只要求 checkbox 和“可验证”，对复杂任务不够强，不能稳定阻止空泛任务进入 apply 阶段。

## Goals / Non-Goals

Goals:
- 让 spec-driven `tasks` 指令默认生成分离的 `Actions` 和 `Checks` sections。
- 让 `$openspec-propose` 在 post-propose warning validation 中程序化检查 `tasks.md` 的 Actions/Checks 结构。
- 保持简单任务快速路径，避免 typo 等 trivial 修改被流程拖慢。

Non-Goals:
- 不新增 CLI 阻断式语义 lint。
- 不改变 apply/verify 的执行模型。
- 不要求所有任务都测试优先；只对 bugfix、validation、refactor 等复杂任务给出更强默认分解。

## Decisions

### Decision: 生成约束放在 schema tasks instruction

修改 `schemas/spec-driven/schema.yaml` 的 `tasks.instruction`，而不是只改 `$openspec-propose` skill 文案。

Rationale: `openspec instructions tasks --json` 是 artifact 生成的共享入口。把规则放在 schema 中，`propose`、`continue` 和其他消费 artifact instructions 的流程都会得到同一行为。

Alternatives considered:
- 只改 propose skill：拒绝。它只覆盖一个入口，`continue` 仍可能生成空泛 `tasks.md`。
- 放进 `openspec/config.yaml` 项目规则：拒绝。该规则应成为 spec-driven 默认行为，而不是本项目局部偏好。

### Decision: tasks.md 内部分离 Actions 和 Checks

`tasks.md` 保持单文件，但前半部分记录 implementation actions，后半部分记录 goal-driven checks。两类条目都使用 checkbox：action checkbox 表示实现动作完成，check checkbox 表示验证已执行并通过。

Rationale: 新增 `checks.md` 会牵动 schema graph、apply tracking、verify freshness 和 reviewer writeback。单文件分段保留现有 `apply.tracks: tasks.md` 和 checkbox 进度机制，同时避免把验证计划塞进行内 `verify:` 文案。

Alternatives considered:
- 行内 `→ verify:`：拒绝。可读性差，测试/check 容易被混在 action 描述里。
- 新增 `checks.md` artifact：暂不采用。建模更纯，但实现面过大，适合后续独立变更。

### Decision: post-propose 只做程序化结构校验

在 post-propose warning validation 中加入 `tasks.md` 结构校验，只检查程序可判定的内容：`Actions` / `Checks` sections、`A*` / `C*` ID、`Covers:` 引用、每个 action 至少被一个 check 覆盖、以及 `Command:` / `Evidence:` / `Expect:` 字段存在性。

Rationale: propose 阶段的 validation 应当可复现、可解释。它可以检查结构和引用完整性，但不应让大语言模型判断 “check 是否合适”。生成质量由 `tasks` prompt 前置约束，真正语义判断留给 verify/reviewer。

Alternatives considered:
- 使用大语言模型做 semantic self-check：拒绝。post-propose validation 不应依赖不可复现的语义判断。
- 完全不检查 `tasks.md`：拒绝。结构和引用问题可以程序化发现，应尽早 warning 并单轮修复。

### Decision: trivial 任务保留快速路径

指令和结构检查都明确 typo、文案、注释等 trivial 修改不需要完整测试优先拆分。

Rationale: 目标驱动规则是为了防复杂任务出错，不是给简单改动增加仪式。

## Risks / Trade-offs

[任务文本更长] → Mitigation: 使用固定的 `Actions` / `Checks` 两段，避免每个 action 行内塞长验证描述。

[Agent 可能把 Checks 写成说明文字] → Mitigation: post-propose 程序化检查每个 check 至少包含 `Command:`、`Evidence:` 或 `Expect:` 字段。

[程序化检查无法判断 check 是否真的合适] → Mitigation: 这是刻意边界；语义充分性由 verify/reviewer 基于实现证据判断。

[结构检查被实现成手工提示] → Mitigation: 实现或复用 deterministic Markdown task-structure checker，并用测试覆盖缺失 section、悬空 `Covers:`、未覆盖 action 和缺失 evidence 字段。

## Migration Plan

1. 更新 spec-driven schema 的 `tasks` 指令和 `tasks.md` template。
2. 更新 propose workflow/post-propose fragment 文案，并实现或复用 deterministic Markdown task-structure checker。
3. 补充测试，确认 `openspec instructions tasks --json`、生成的 propose skill 文案和 task-structure checker 包含新规则。
4. 运行相关测试和 artifact generation 检查。

## Open Questions

- 是否需要让 reviewer writeback 区分 action remediation 和 check remediation？当前变更先不改变 writeback 机制，只要求 reviewer 能读懂 `A*` / `C*` 前缀。
