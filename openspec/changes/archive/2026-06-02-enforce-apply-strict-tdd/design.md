## Context

当前 apply 主流程已经移除 `.apply-steps` 和 `openspec-implementer`，改为 Master agent 在当前上下文中直接执行任务。这保留了上下文连续性，但模板只要求 "smallest useful test/code loop"，不足以保证 TDD。与此同时，schema、README、测试和已生成 skill surface 仍残留旧的 TDD cycles、mechanical TDD、implementer subagent 文案，形成冲突指令。

## Goals / Non-Goals

**Goals:**
- 将 Phase 0 定义为 Master agent 严格 TDD：行为/代码 Check 必须先 red 后 green。
- 保留 reviewer/optimizer/seal 质量门禁。
- 清理 active surface 中的 stale implementer、`.apply-steps`、direct implementation 和含糊 TDD 文案。
- 通过模板、schema instruction、active specs 和测试防止残留再生。

**Non-Goals:**
- 不恢复 `openspec-implementer`。
- 不恢复 `.apply-steps`。
- 不新增 executor skill、DSL 或运行时调度器。
- 不修改 `openspec/changes/archive/**` 历史记录。

## Decisions

1. Master agent 执行严格 TDD，而不是恢复 implementer

   原因：旧 implementer 模型会重新引入 step file handoff 和上下文割裂。当前 Master agent 已经拥有完整 change 语义，正确修复是把 Phase 0 执行纪律收紧为 red/green checkpoint。

   替代方案：恢复 `.apply-steps` + `openspec-implementer`。拒绝该方案，因为它会撤销现有架构取舍并扩大脏残留面。

2. Check 是 TDD 执行单位

   行为/代码 Check 的顺序固定为：新增或更新目标测试、运行命令确认预期失败、最小实现、重跑命令确认通过、勾选 Check。`tasks.md` 仍是进度源。

3. 非运行时文本制品只做最终证据

   文档、说明性文本或无 runtime consumer 的制品不伪造 red failure。配置、schema、template、workflow template 和 agent instruction template 默认按行为变更处理，除非任务明确证明没有 runtime 或 generated-surface consumer。

4. 清理 managed stale implementer 使用显式名称

   `openspec update` 应删除 managed generated surfaces 中旧版本生成的 `openspec-implementer`。删除目标使用显式 stale skill directory name list，不使用目录扫描、glob filtering 或 regex inference。

## Risks / Trade-offs

- [Risk] 模板语言过软导致 agent 继续先实现。Mitigation: 用 red/green checkpoint 的 MUST-style 指令和测试断言约束模板内容。
- [Risk] text-only 例外被滥用。Mitigation: config/schema/template 默认归入行为 Check，只有证明无 consumer 才能走最终证据。
- [Risk] 清理误伤历史或用户 skill。Mitigation: 排除 `openspec/changes/archive/**`，managed stale 删除仅使用显式目录名。
- [Risk] 只能以 prompt/template 合同约束 agent 行为。Mitigation: 后置 Phase 1 reviewer、Phase 2 optimizer、Phase 3 seal 保持不变，模板和 CLI instruction tests 覆盖合同。

## Migration Plan

1. 更新 apply workflow template 和生成 surface，使 Phase 0 明确 strict TDD。
2. 更新 `schemas/spec-driven/schema.yaml` 的 tasks/apply instruction，删除冲突文案。
3. 更新 active specs、README/docs 和 tests。
4. 更新 skill generation/update 清理 stale `openspec-implementer` managed directory。
5. 运行 targeted tests、build 和 change validation。

Rollback 策略：恢复 apply template、schema instruction、tests 和 stale cleanup 变更即可；不涉及数据迁移。

## Open Questions

无。
