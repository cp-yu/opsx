## Context

OpenSpec 模板生成管线中，workflow 模板使用 `/opsx:<commandSlug>` 规范形引用其他 workflow， 经 `TransformRegistry` 按工具转换为对应的 skill 调用语法（Codex: `$openspec-propose`，OpenCode/Pi: `/opsx-propose`）。 但 explore 模板源码中 `$openspec-propose` 硬编码绕过了 transform 管线， 且 Claude Code 从未注册 transform，导致所有生成的 Claude skill 文件都暴露错误的调用语法。

## Goals / Non-Goals

**Goals:**
- explore 模板中的 workflow 引用使用规范形 `/opsx:propose`，不再硬编码特定工具语法
- Claude Code 生成的 skill 文件中 workflow 引用被正确转换为 `/openspec-<skillDirName>`
- 其他 22+ 工具的 skill 生成行为保持不变

**Non-Goals:**
- 不修改 reference 文件——其已使用工具中立格式
- 不为 Claude 以外的其他未覆盖工具新增 transform
- 不改变 `ReplacementPair` 数据结构
- 不涉及运行时行为变更（纯模板字符串 + transform 注册）

## Decisions

### Decision 1: Claude target 通过复用 `codexTarget` 生成

**选择**: `'/' + pair.codexTarget.slice(1)` — 去掉 `$` 前缀加 `/`

**理由**:
- `codexTarget = "$openspec-propose"`（来自 `entry.skillDirName`），Claude 需要的正是 `/openspec-propose`
- 避免扩展 `ReplacementPair` 增加第四个字段；保持与 Codex/OpenCode/Pi 的 pattern 一致性
- 若未来 skillDirName 命名规则变化，现有 PAIRS 推导自动覆盖

**替代方案**: 在 `ReplacementPair` 中增加 `claudeTarget` 字段 → 拒绝——三字段已在 3 个 transform 中复用足够，不需为单一工具扩展结构。

### Decision 2: explore 模板中 5 处硬编码一次性替换

**选择**: 全部替换为 `/opsx:propose`，包括 instructions 正文和 `ACTIVE_CHANGE_CAPTURE_GUIDANCE` 中的 3 处 example offer

**理由**: 规范形统一，transform 管线自然承接各工具适配。 若仅替换 Design Summary 尾部一处，其他 4 处 example offer 仍输出错误语法。

### Decision 3: 不改 propose 模板

**选择**: propose 模板已使用 `/opsx:propose`、`/opsx:apply` 规范形，无需修改

**理由**: 仅需 Claude transform 覆盖即可生效。Propose 模板无硬编码问题。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| `/opsx:` 被误转为 Claude 语法——如果存在非 workflow 引用的字面 `/opsx:` 文本 | 已审计 explore.ts、propose.ts、snack.ts、apply-change.ts、archive-change.ts，全部 `/opsx:` 均为 workflow 引用 |
| `codexTarget.slice(1)` 隐式依赖 `$` 前缀格式 | `buildReplacementPairs()` 中 `codexTarget` 由 `entry.skillDirName` 固定生成，如该接口变化则 3 个已有测试 + 新增 Claude 测试会失败，形成回归保护 |
| Reference 文件用 `openspec-propose`（工具中立），instructions 经 transform 后用 `/openspec-propose`（Claude 特定），同一 skill 文件内措辞分层不一致 | 设计如此——reference 面向 agent 行为引导，instructions 面向用户操作指令，语义分层清晰 |
