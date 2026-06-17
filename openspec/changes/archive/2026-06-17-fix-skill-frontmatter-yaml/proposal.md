## Why

skill 生成管线会把模板字段直接写入 YAML frontmatter。包含 `sync:` 等 YAML 敏感字符的 description 会导致生成的 `SKILL.md` 无法被 AI 工具加载。

## What Changes

- 生成 skill frontmatter 时对所有字符串字段执行 YAML 字符串转义。
- 将相关测试改为解析 YAML frontmatter 后校验语义，避免依赖未加引号的表面格式。
- 为包含冒号、引号和换行的 frontmatter 字段增加回归覆盖。

## Capabilities

### New Capabilities
- `skill-frontmatter-yaml`: skill 文件生成时的 YAML frontmatter 合法性约束，覆盖 YAML 敏感字符和语义校验。

### Modified Capabilities

## Impact

- 受影响代码：`src/core/shared/skill-generation.ts`
- 受影响测试：`test/core/shared/skill-generation.test.ts`、`test/core/init.test.ts`、`test/core/update.test.ts`、`test/integration/snack-workflow.test.ts`、`test/core/templates/skill-templates-parity.test.ts`
- 受影响系统：所有通过 `generateSkillContent()` 生成的 AI tool skill files
