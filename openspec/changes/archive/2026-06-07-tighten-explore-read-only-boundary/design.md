## Context

`openspec-explore` 当前同时承担思考、影响面调查和制品捕获提示，prompt 中存在可写措辞。默认 agent 执行倾向会把用户的方案确认理解为继续实现或更新制品，导致 explore 越过只读思考边界。

现有 `openspec-impact-sweeper` 已有明确写边界：它只写 `openspec/sweeper/*.json` 报告。该例外属于 explore workflow 内部的 subagent 行为，不应扩展为 main explore agent 的文件写权限。

## Goals / Non-Goals

**Goals:**

- 将 main explore agent 定义为只读思考 workflow。
- 保留 `openspec-impact-sweeper` 写 JSON report 的内部例外。
- 将 active-change insight 从直接 artifact update 文案改为 future capture target 分类。
- 让 `$openspec-propose <change-name>` 承担从 `Design Summary` 生成制品的责任。
- 用正向模板测试锁定新边界。

**Non-Goals:**

- 不刷新 `.codex/skills/openspec-explore/SKILL.md` 或其他 generated surface。
- 不改 `openspec-impact-sweeper` 的 report 写边界。
- 不引入运行时权限强制机制。
- 不改 manifest、skill generation 或 command slug 机制。

## Decisions

1. **把 explore 主代理边界写成 read-only，而不是制品 allowlist**

   选择：模板明确 main explore agent 不创建、编辑、删除、格式化、重新生成或 patch 项目文件和 OpenSpec 制品。

   理由：allowlist 仍然让主代理进入“解释授权”的陷阱。read-only 语义更短、更硬，也符合 explore 的职责。

   替代方案：保留制品更新但要求显式用户确认。拒绝，因为“选 2 / 可以”这类确认仍会被误读。

2. **把 sweeper 例外绑定到 subagent，而不是 explore 主代理**

   选择：prompt 只允许 `openspec-impact-sweeper` subagent 写 `openspec/sweeper/*.json`。

   理由：sweeper report 是 explore 内部证据产物，不是 proposal/design/spec/tasks 制品。这个例外已经由 sweeper skill 自身的 write boundary 约束。

   替代方案：移除 sweeper 写入。拒绝，因为现有 impact sweep contract 依赖 JSON report 路径。

3. **active-change insight 只分类为 future capture target**

   选择：Existing Changes 文案改成分类未来应由哪个制品或 workflow 捕获，不在 explore 中提出直接写入。

   理由：这保留了 capture boundary 的价值，同时切断“Capture it in design.md?”这类直接写入暗示。

   替代方案：完全删除 Existing Changes 指引。拒绝，因为已有 change 场景仍需要把 insight 类型分清楚。

4. **测试只加正向断言**

   选择：模板测试断言必须包含 read-only、设计确认非授权、sweeper JSON 写例外和 future capture target 语义。

   理由：按本次范围要求，避免通过 `not.toContain(...)` 绑定旧文案删除细节。

## Risks / Trade-offs

- [Risk] 不增加负向断言可能无法捕获旧 permissive 文案残留 → Mitigation: 正向断言覆盖关键新语义，review 时检查模板连贯性。
- [Risk] generated skill surface 暂时仍旧 → Mitigation: 本变更明确不刷新 generated surface，后续运行 `openspec update` 同步。
- [Risk] active-change 用户仍可能要求立即更新制品 → Mitigation: explore prompt 指向 `$openspec-propose <change-name>` 或合适的非-explore workflow，而不是在 explore 内执行写入。

## Migration Plan

1. 更新 canonical explore workflow template。
2. 更新 `explore-brainstorming` 和 `ai-workflow-templates` delta specs。
3. 更新模板测试的正向断言。
4. 后续单独运行 `openspec update` 刷新 generated surfaces。

## Open Questions

无。
