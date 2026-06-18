## Context

OpenSpec 最早在 `merge-superpowers-capabilities` 中把 explore 增强为 brainstorming workflow：探索上下文、一次一问、2-3 方案、分段设计和 `Design Summary`。后续为满足 skill 长度限制，将长 prompt 拆到 `referenceFiles`，但当前 `openspec-explore-supperpowers-style.md` 只保留 stance、动作空间、入口示例和收束模板，缺少原始 Superpowers `brainstorming` skill 最关键的设计前置纪律。

原始 Superpowers `skills/brainstorming/SKILL.md` 不能原样搬入 OpenSpec。它会写 design doc、commit、等待用户审查并进入 `writing-plans`。OpenSpec explore 的现行边界是 main agent 只读，制品写入由 `openspec-propose` 或其他非 explore workflow 完成。因此本变更要恢复行为纪律，而不是恢复写文件权限。

## Goals / Non-Goals

**Goals:**
- 让 `explore-supperpowers-style` reference 以原始 Superpowers `brainstorming` skill 为行为来源。
- 将 Superpowers 写文档和实现计划交接步骤映射为 OpenSpec `Design Summary` 和 `openspec-propose`。
- 保持主 `SKILL.md` 精简，避免主 prompt 与 reference 双重构建 Superpowers 行为。
- 保留 `supperpowers` 路径拼写，避免破坏现有生成链。

**Non-Goals:**
- 不引入 Superpowers browser/server visual companion。
- 不恢复 explore 写 `design.md`、commit 或直接修改 OpenSpec artifacts 的能力。
- 不重命名 `references/explore-supperpowers-style.md`。
- 不改变 propose/apply/archive workflow 的执行模型。

## Decisions

### Decision 1: reference 内容重建为 OpenSpec-adapted Superpowers brainstorming protocol

选择重写 `EXPLORE_SUPPERPOWERS_STYLE_REFERENCE`，主体覆盖原始 `brainstorming` skill 的 hard gate、checklist、分段设计、自检和用户审查 gate，并明确 OpenSpec 映射。

替代方案：
- 直接保留当前四段示例。拒绝，因为它没有恢复 Superpowers 的设计前置纪律。
- 原样复制 Superpowers `brainstorming/SKILL.md`。拒绝，因为写 design doc、commit 和 `writing-plans` 与 OpenSpec explore 只读边界冲突。

### Decision 2: 主 instructions 只保留边界和路由

主 `SKILL.md` 继续声明 Required References，并保留只读边界、OPSX 上下文、sweeper 委托、Brainstorming Checklist 和 Existing Changes 分类。Superpowers 的展开行为只放在 reference 中。

这避免 agent 同时阅读 reference 和主 prompt 中另一套 Superpowers 行为，从根源上减少混乱。

### Decision 3: visual companion 只保留判断规则

原始 Superpowers 有浏览器 visual companion。OpenSpec explore 不引入 server/browser 机制，只在 reference 中保留 just-in-time 判断：当视觉表达比文本更清楚时使用 ASCII 图、表格、流程图或轻量可视化；普通 scope、API、数据模型和技术取舍问题继续在终端文本中处理。

### Decision 4: 物化 reference 不是源头

`openspec/references/openspec-explore-supperpowers-style.md` 是 `openspec update` 输出。实现只修改 `src/core/templates/workflows/explore.ts` 的模板常量，并通过 update 刷新物化文件。

## Risks / Trade-offs

[Risk] reference 内容变长导致长度校验失败。
Mitigation: 保持 reference ≤500 行，主 `SKILL.md` ≤200 行，并运行 skill length validation。

[Risk] reference 中出现 `$openspec-` 或 `/opsx:` 导致工具中立校验失败。
Mitigation: 在 reference 内容中使用逻辑 workflow 名称 `openspec-propose`，具体调用语法只保留在主 instructions。

[Risk] 过度复制主 Brainstorming Checklist。
Mitigation: reference 说明 Superpowers 行为纪律和 OpenSpec 映射，不复制 OPSX/sweeper/Future Capture Target 机制。

[Risk] `supperpowers` 拼写继续存在。
Mitigation: 文件路径保留兼容拼写，正文统一使用 `Superpowers`。

## Migration Plan

1. 更新 `src/core/templates/workflows/explore.ts` 中的 `EXPLORE_SUPPERPOWERS_STYLE_REFERENCE`。
2. 更新 `test/core/templates/explore-template.test.ts` 的 reference 内容契约断言。
3. 运行 `openspec update` 刷新 `openspec/references/openspec-explore-supperpowers-style.md` 和 managed skill。
4. 运行 explore template 测试、skill length validation 和模板 parity/hash 相关测试。

回滚策略：恢复旧 reference 常量和测试断言，再运行 `openspec update`。

## Open Questions

无。已确认 visual companion 只保留判断规则，不引入 browser/server 机制。
