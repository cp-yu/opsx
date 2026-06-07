## Context

`proseLanguage` 已通过 `configProjection` 暴露给 artifact instructions，但当前 projection 和共享 `Document Language Contract` 没有明确哪些 artifact 字段属于 natural-language prose。Agent 在生成 proposal、specs、design、tasks 时容易把普通英文 task/check/Requirement/Scenario 文案误判为 canonical token。

## Goals / Non-Goals

**Goals:**
- 明确所有 artifact-writing workflow surface 共用的 prose language contract。
- 让新写或改写的 natural-language prose 跟随 `proseLanguage` 的值。
- 保留 OpenSpec 结构 token、schema key、BDD/normative keyword、路径、命令、ID 和 code identifier 的 canonical 形式。
- 保留英文术语在目标语言 prose 中的正常使用。

**Non-Goals:**
- 不引入 language lint 或 validator。
- 不增加 `$openspec-propose` per-artifact self-check。
- 不翻译 template headings 或 parse-sensitive 结构标签。
- 不改变 `proseLanguage` / legacy `docLanguage` 的配置解析行为。

## Decisions

- 在 `src/core/config-projection.ts` 收紧 projection 文案，而不是让 workflow 重新解释 raw config。这样 `openspec instructions`、apply runtime projection 和后续 workflow surface 使用同一入口。
- 在 `ARTIFACT_DOC_LANGUAGE_CONTRACT` 中定义 prose 字段和 canonical 例外。该 fragment 已被 propose、continue-change、apply-change、ff-change 共用，改动一次即可覆盖共享 surface。
- 在 `schemas/spec-driven/schema.yaml` 中补充 specs/tasks 的字段边界。schema examples 仍可保留 canonical 结构，但 instruction 必须防止 agent 继承普通英文示例 prose。
- 只用测试固定 prompt/template contract。输出文本最终由 agent 撰写，不用 deterministic lint 承担语言识别。

## Risks / Trade-offs

- 规则过宽可能导致 agent 翻译 `### Requirement:`、`WHEN`、`Command:` 等结构 token。缓解方式是在 shared contract 和 schema instruction 同时列出 canonical 例外。
- 规则过窄可能继续留下 `Task 1: Add ...`、`Verify ...`、`Expect: ...` 等普通英文 prose。缓解方式是明确 task titles、check names、Requirement/Scenario titles、`Expect:` / `Evidence:` descriptions 属于 prose。
- 英文术语边界仍依赖 agent 判断。缓解方式是允许术语嵌入 prose，但禁止普通英文句子或标题因为包含工程词而整体保留英文。

