## Context

`archive-semantic-boundary-commit`（2026-06-10 归档）确立了实现已由 `wip: opt-*` 承载时创建 `--allow-empty` boundary commit 的机制，但 body 内容是 meta 化的（diff 范围 + checkpoint 列表 + intentionally empty 说明）。用户主流程是 main 直接工作，无 merge commit，change 级叙事在 git history 中缺位。

`unify-references-home` 已建立 `openspec/references/` 受管模板布局与 `git.commitMessage.{boundary,archive,merge}` 路径覆盖 schema，其中 `boundary` 键预留无消费方。本变更补上消费方。

## Goals / Non-Goals

**Goals:**
- boundary commit 无条件化，成为每次 archive 的固定语义边界。
- boundary commit message 承载完整 change 总结（Why/Changes）+ `Implementation:` 审计 footer。
- 格式由受管模板定义，与 archive/merge 模板同构，三种 commit 各一个 reference 文件，Step 8 退化为纯路由。

**Non-Goals:**
- 不 squash 或清理 `wip: opt-*` checkpoint commits（它们承载真实 diff，是 Phase 2 回滚机制）。
- 不消除 branch 流程下 boundary commit 与 merge commit 的总结重复。
- 不为残余实现 diff 的普通提交引入 message convention。

## Decisions

1. **boundary commit 无条件化，而非保留"仅当 checkpoint 承载实现"的条件分支。**
   - 理由：消除 Step 8 的 if/elif 分支——顺序执行"先清残余 diff（如有），然后总是创建 boundary commit"；footer 语义稳定（永远列出实际承载 diff 的 commits，含刚创建的普通提交）。
   - 替代方案：维持条件分支，仅改 message 格式。被否：两条路径两种 body 语义，复杂度没有收益。

2. **新建独立模板而非复用 merge-summary 模板。**
   - 理由：延续仓库已有决策（archive 与 merge reference 拆分，"职责不同不混入同一 convention"）；merge-summary 的 Rules 为 merge/squash 场景所写，复用会让一个文件服务两种场景。
   - 取舍：与 merge-summary 约 80% 格式重复，属声明性重复，两者独立演化。

3. **`## Changes` 文件清单以 `git diff --name-only <base>..<head>` 为事实来源。**
   - 理由：防止 message 与实际 diff 脱节；逐文件描述从归档 tasks.md 的 Files/Goal 与 opsx-delta 交叉提取，diff 中存在但制品未提及的文件必须如实列出。
   - `<base>` 为上一个 change 边界（上一次 archive/boundary commit），agent 从 git history 推断——与现状一致。

4. **接受 branch 流程下与 merge commit 的总结重复。**
   - 理由：`--first-parent` 视角下 merge commit 是 main 历史唯一可见总结，必须保持完整；boundary commit 是分支内实现边界。降级任一侧都需要引入按 `.apply-isolation.json` 判断流程的条件逻辑，复杂度大于重复的代价。

5. **时序：boundary commit 在 OpenSpec/docs archive commit 之前。**
   - 理由：先封实现边界，归档制品提交不混入实现叙事；与现有 Step 8 顺序一致。

## Risks / Trade-offs

- [Risk] agent 推断 effective diff base 出错导致 Changes 清单失真 → Mitigation: 模板强制以 `git diff --name-only` 输出为准并与 tasks.md 交叉；列出全部 diff 文件。
- [Risk] 空提交被某些 CI/工具误处理 → 现状已存在（`archive-semantic-boundary-commit` 引入），本变更不扩大风险面。
- [Trade-off] 每次 archive 固定多一个 empty commit → 这正是需求本身：空提交携带完整 change 叙事，是信息而非噪音。

## Migration Plan

1. 在 `unify-references-home` 落地后实施（依赖其 references 布局与 boundary schema 键）。
2. 模板常量 + Step 8 重写 + 测试，单 commit 可 revert。
3. `openspec update --force` 刷新生成产物。

## Open Questions

无——设计决策已在 explore 阶段逐节确认。
