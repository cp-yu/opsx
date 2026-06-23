# snack-skill-generation Specification

## Purpose
此规约记录变更 snack-workflow 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: snack skill 纳入生成管线

skill 生成管线 SHALL 包含 snack skill，与现有 5 个核心工作流（propose、explore、apply、archive、bootstrap-opsx）一致。

#### Scenario: 生成 snack skill 文件

- **WHEN** 运行 `openspec update` 或 `openspec init`
- **THEN** 生成 `.claude/skills/openspec-snack/SKILL.md`，包含：
  1. Frontmatter（name、description、license、compatibility、metadata）
  2. 输入检测逻辑（change-name 可选，默认检测 active）
  3. 共享 OPSX 上下文加载指令（复用 explore/propose/apply 片段）
  4. Git diff 分析步骤
  5. Code-map 反查步骤
  6. Spec 覆盖扫描步骤（`openspec list --specs --json`）
  7. Specs 生成策略（中层推断）
  8. Design 简化生成策略
  9. OPSX delta 启发式规则
  10. 输出提示（完成路径 vs 修正路径）
  11. 明确不生成 tasks.md 的说明

#### Scenario: skill 文件长度验证

- **WHEN** 生成 snack skill 文件后
- **THEN** 验证 `SKILL.md` instructions 部分不超过 200 行

### Requirement: snack skill 描述

snack skill description SHALL 为 "Quick code-first sync: generate or update proposal + specs + simplified design from git diff when the code is already written. Use after iterative coding to back-fill specs and OPSX delta without redoing propose→apply. Does not generate tasks.md."

#### Scenario: skill description 用于触发检测

- **WHEN** AI 工具加载 skill 列表
- **THEN** snack skill 的 description 清晰表达其适用场景（代码已完成、从 git diff 反向同步 specs 与 OPSX delta，不生成 tasks.md）

