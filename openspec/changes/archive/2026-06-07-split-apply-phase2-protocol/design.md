## Context

当前 apply command 模板已经写明 `git stash push -u -m "apply-opt-checkpoint-r0"`，但 `openspec-apply-change` skill 的压缩版 Phase 2 指令只写 `create apply-opt-checkpoint-r0`。这不是行为模型缺失，而是 skill surface 为满足 200 行限制过度压缩，丢掉了可执行命令。

影响面来自 impact sweep：apply Phase 2、workflow template 生成、skill referenceFiles 写入、skill 长度校验和 parity/content 测试。用户已确认 500 行限制是所有 `referenceFiles[]` 的全局限制，`SKILL.md` 本体继续保持 200 行限制。

## Goals / Non-Goals

**Goals:**
- 让 `openspec-apply-change` skill 在 Phase 2 前强制读取 apply 专属 reference。
- 在 reference 中保留 apply 的栈式 git stash checkpoint 语义。
- 将 `referenceFiles[]` 全局行数限制从 200 放宽到 500，避免复杂流程被压缩到不可执行。
- 通过模板测试、长度测试和生成产物同步验证防止回归。

**Non-Goals:**
- 不改变 `openspec verify` 的单 checkpoint reference 协议。
- 不抽象通用 checkpoint 协议；apply 与 verify 的 checkpoint 生命周期不同。
- 不手工维护生成产物；生成产物通过 `openspec update` 刷新。
- 不改变 `SKILL.md` 的 200 行限制。

## Decisions

### Decision 1: apply 使用独立 `references/apply-phase2-optimization.md`

apply Phase 2 是多轮优化循环，成功后会继续 `git stash push -u -m "apply-opt-checkpoint-r<N>"`，失败时回滚到 `stash@{0}`。verify 的 `references/phase2-checkpoint-protocol.md` 是单 checkpoint 状态机，直接复用会混淆生命周期。

备选方案：复用 verify reference。拒绝，因为它会把 apply 的栈式 checkpoint 语义降级成 verify 的单 checkpoint 语义。

### Decision 2: 主 `SKILL.md` 只保留强入口

主指令保留 Phase 0-3 总流程，并在 Phase 2 写明必须读取 `references/apply-phase2-optimization.md`。主文件还应保留一句不可误解的 guardrail：checkpoint 是 git stash entry，不是 git tag。

备选方案：继续把 Phase 2 压成一句摘要。拒绝，因为这正是 `git tag apply-opt-checkpoint-r0` 的触发条件。

### Decision 3: referenceFiles 全局限制改为 500

`SKILL.md` 维持 200 行，有利于入口简洁；`referenceFiles[]` 是承载详细协议的地方，500 行能容纳完整流程而不鼓励无限膨胀。长度测试应分别使用 `MAX_SKILL_LINES = 200` 和 `MAX_REFERENCE_LINES = 500`。

备选方案：只对 apply Phase 2 reference 放宽。拒绝，因为行数校验当前模型是针对 `template.referenceFiles[]` 文件类别，不应给单个文件引入特殊规则。

### Decision 4: 生成产物通过 `openspec update` 刷新

模板源是事实来源。修改 `.codex/skills/...` 或 `.claude/skills/...` 生成文件无法防止下一次 update 回退。实现应修改模板源和测试，然后运行 `openspec update` 生成一致产物。

## Risks / Trade-offs

- [Risk] reference 文件变长后可能藏入过多实现细节 → Mitigation: `SKILL.md` 仍限 200，reference 仍限 500，并由 contract tests 约束关键语义。
- [Risk] parity hash 变化造成测试失败 → Mitigation: 将 hash 更新作为显式任务，确保变化被审查。
- [Risk] reference path 使用硬编码分隔符影响跨平台写入 → Mitigation: 只在模板协议中使用 POSIX artifact path；生成写入继续依赖现有 `referenceFiles` 和 sync engine 的路径校验。

## Migration Plan

1. 修改 apply skill 模板源并增加 referenceFiles。
2. 修改长度校验测试为 200/500 双阈值。
3. 更新相关 contract/parity 测试。
4. 运行相关测试。
5. 运行 `openspec update` 刷新生成工具产物并检查生成 reference。

## Open Questions

无。
