## Context

现行 apply 设计来自 Superpowers-style workflow：Master agent 将 `tasks.md` 拆成 `.apply-steps`，再把 step file 交给 cheap implementer subagent 执行。这个模型适合把复杂任务转交给另一个上下文，但对单个 change 的连续编码不合适：Master 已经拥有完整 change 语义，强制序列化为 step file 会重复 `tasks.md`、specs 和 design 的信息，并让实际编码反馈绕回一个过期计划。

验证和优化 subagent 不是同一类问题。Reviewer/optimizer 的 clean-context 价值是避免 Master 自审，必须保留。

## Goals / Non-Goals

**Goals:**
- apply Phase 0 由 Master agent 直接执行 `tasks.md` 中的 pending task。
- 删除 `.apply-steps` 正式中间制品和 `openspec-implementer` internal skill。
- 保留 Phase 1 reviewer、Phase 2 optimizer、Phase 3 seal 的质量门禁。
- 让 active specs、workflow templates、schema instruction、tests、docs 和 OPSX 对同一执行模型达成一致。

**Non-Goals:**
- 不改变 reviewer/optimizer clean-context verify contract。
- 不新增 master executor skill、`.apply-plan` 或其他替代中间制品。
- 不修改 archived change 历史。
- 不改变 branch/worktree isolation 行为。

## Decisions

1. Master agent 直接编码，而不是生成 `.apply-steps`

   原因：`tasks.md` 已经是计划和进度源，specs/design 已经是语义源。`.apply-steps` 只在跨上下文 handoff 中有价值；删除 implementer 后继续保留它会形成冗余和过期计划。

   替代方案：保留 `.apply-steps` 作为可选 working note。拒绝该方案，因为 optional artifact 很容易被 agent 重新当成流程门槛。

2. 删除 `openspec-implementer`，而不是 legacy 保留

   原因：apply 不再 dispatch coding subagent 后，implementer skill 没有正式调用方。保留 legacy path 会让用户和 tests 继续感知一套已废弃模型。

   替代方案：保留但不生成命令。拒绝该方案，因为 internal skill 安装面仍会泄漏旧概念。

3. 保留 reviewer/optimizer subagent

   原因：编码上下文连续性和判断上下文隔离是两个不同目标。Master 可以负责实现和 patch 应用，但不能替代 reviewer 的完整性/正确性/一致性判断，也不能替代 optimizer 的优化机会判断。

   替代方案：Master 自行 verify/optimize。拒绝该方案，因为会破坏现有 verify gate 的职责分离。

4. 使用显式列表删除生成项

   原因：项目配置要求生成物用显式名称跟踪。实现应从 `INTERNAL_SKILL_TEMPLATES` 等显式列表移除 `openspec-implementer`，而不是靠目录扫描或正则清理。

## Risks / Trade-offs

- [Risk] 旧文案残留继续提到 `.apply-steps` 或 implementer subagent -> Mitigation: repo-wide 搜索 active docs/templates/tests/schema，不修改 archive 历史。
- [Risk] 清理 implementer 时误伤 reviewer/optimizer -> Mitigation: 模板测试加入负向 implementer 断言和正向 reviewer/optimizer 断言。
- [Risk] 删除 cheap model implementer 增加单次 Master 会话负担 -> Mitigation: 这是有意取舍；单 change 上下文连续性优先，质量判断仍由 clean-context subagent 完成。
- [Risk] Windows 路径验证遗漏 -> Mitigation: 涉及 skill 安装路径和生成目录的测试继续用 `path.join()` 预期，不硬编码 POSIX 或 Windows 分隔符。

## Migration Plan

1. 更新 apply workflow template 和 schema instruction，移除 `.apply-steps` 与 implementer dispatch。
2. 移除 `openspec-implementer` skill template、导出、internal skill 注册和对应测试。
3. 更新 apply/task specs、tests、docs 和 OPSX。
4. 运行 change validation、模板/skill generation 相关测试和 build。

Rollback 策略：恢复 `openspec-implementer` 模板、internal skill 注册和 apply dispatch 文案即可回到旧模型；不涉及持久化数据迁移。

## Open Questions

无。
