<!-- propose-routing: design-summary-found; input-length=20; detail-score=n/a; multi-subsystem=no; decision=proceed-with-design-summary; depends-on=unify-references-home -->
## Why

[业务背景] archive 自动 git 流程中，当实现 diff 已由 `wip: opt-*` checkpoint commits 承载时，semantic boundary commit 的 body 只记录 diff 范围、checkpoint 列表和"本提交有意为空"的 meta 说明——git history 中代表整个 change 的提交不包含任何 change 叙事（业务背景、技术决策、逐文件改动描述），在 main 直接工作（无 merge commit）的主流程里，change 级别的总结在历史中完全缺位。

[技术决策] 将 boundary commit 无条件化：每次 archive 固定以 `--allow-empty` 创建实现边界提交，message 采用与 merge summary 同构的完整 change 总结格式（`## Why` 业务背景/技术决策 + `## Changes` 逐文件描述），并以 `Implementation:` footer 保留 diff 范围与承载 commits 的审计信息；格式由 `openspec/references/openspec-boundary-commit-message.md` 受管模板定义，支持 `git.commitMessage.boundary` 路径覆盖（schema 键已由 `unify-references-home` 预留）。

## What Changes

- archive 自动 git 流程的实现边界改为顺序语义：先提交残余实现 diff（如有，行为不变），然后**无条件**创建 `--allow-empty` 的 semantic boundary commit。
- boundary commit message 格式从内联 meta 说明改为完整 change 总结：`<type>(<scope>): <中文标题>` subject、`## Why`（来自归档 proposal.md/design.md 的业务背景与技术决策）、`## Changes`（以 `git diff --name-only <base>..<head>` 为准的逐文件描述）、`Implementation: <base>..<head> (carried by <commits>)` footer。
- 新增受管模板 `openspec/references/openspec-boundary-commit-message.md` 定义上述格式；archive skill 指令按 `git.commitMessage.boundary` 覆盖路由读取。
- archive Step 8 删除内联的 boundary commit body 规则 prose，改为路由到模板文件。
- branch 流程下 boundary commit 与 no-ff merge commit 的总结内容重复属预期行为（`--first-parent` 视角下 merge commit 是 main 历史唯一可见总结）。

## Capabilities

### New Capabilities

### Modified Capabilities
- `opsx-archive-skill`: 实现边界提交语义改为"残余 diff 提交（如有）→ 无条件 boundary commit"，boundary commit message 改为模板驱动的完整 change 总结 + Implementation footer。
- `skill-template-length-check`: archive skill 物化的受管 reference 清单增加 `openspec/references/openspec-boundary-commit-message.md`。

（`git.commitMessage.boundary` 的覆盖路由行为已由 `unify-references-home` 的 `references-home` 规约定义，本变更只补充其消费方，不修改该规约。）

## Impact

- 代码：`src/core/templates/workflows/archive-change.ts`（新增 BOUNDARY_COMMIT_MESSAGE_REFERENCE 常量、注册 referenceFiles、重写 Step 8 实现边界段落）。
- 测试：`test/skills/archive-skill-content.test.ts`（删除 intentionally-empty 内联 prose 与条件分支断言，新增无条件 boundary、模板路由、footer 断言）、`test/skills/skill-template-length-validation.test.ts`。
- 生成产物：`openspec/references/openspec-boundary-commit-message.md` 物化；三个工具目录 skill 经 `openspec update --force` 刷新。
- 依赖：基于 `unify-references-home` 落地后的 references 布局与 `git.commitMessage.boundary` schema 键。
