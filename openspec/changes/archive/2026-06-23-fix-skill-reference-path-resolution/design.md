## Context

OpenSpec 的 workflow skill 模板（`src/core/templates/workflows/`）中包含 `openspec/references/` 路径引用。Pi 系统规则要求 skill 文件中的相对路径相对于 skill 目录解析（`.pi/skills/<skill-name>/`），但这些路径实际上是相对于项目根目录的 `openspec/references/` 目录。这导致 agent 读取 skill 时无法正确找到引用文件。

## Goals / Non-Goals

**Goals:**
- 所有 `openspec/references/` 路径引用附带显式的 project-root 标记，消除路径解析歧义

**Non-Goals:**
- 不改变 Pi 系统提示词中的相对路径解析规则
- 不改变文件系统结构
- 不改变 `openspec update` 的物化逻辑

## Decisions

- **标记形式**：[INFERRED FROM CODE] inline 引用加 `project-root file` 前缀（如 `read the project-root file \`openspec/references/foo.md\``），列表引用加 `(project-root relative)` 后缀（如 `- openspec/references/foo.md (project-root relative)`）。前者适合嵌入语句中的路径，后者适合清单场景。
- **源码 vs 生成文件**：[INFERRED FROM CODE] 直接修改模板源码 `src/core/templates/workflows/*.ts`，同时同步更新已生成的 `.pi/skills/*/SKILL.md`。后续 `openspec update` 重新生成时自动携带标记。
- **不修改常量**：[INFERRED FROM CODE] `archive-change.ts` 中的 `*_SHARED_PATH` 常量保持纯路径字串不变，只在其模板插值处添加 `project-root file` 前缀。常量本身是正确的项目相对路径，问题在于使用场景的表述不明确。

## Risks / Trade-offs

- **生成文件同步**：本次直接修改了 `.pi/skills/*/SKILL.md`，但下次 `openspec update` 会从模板重新生成。只要模板已修复，重新生成后标记仍然保留。无风险。
- **跨 skill 一致性**：5 个 skill 使用了两种标记格式（`project-root file` 前缀和 `(project-root relative)` 后缀），需要 agent 理解两种格式等价。这是合理的——前者嵌入自然语言描述，后者适合结构化列表。
