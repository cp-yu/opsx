## Why

当前 workflow handoff 文案存在工具适配断层：apply 完成提示写死 `/opsx-archive`，Pi 生成路径仍复用 OpenCode 的 `/opsx-<commandSlug>` 语法，导致 Codex 与 Pi 用户看到不可直接调用的下一步指令。

## What Changes

- 将 workflow 模板中的下一步 handoff 收敛为 canonical `/opsx:<slug>` 引用，由 transform/invocation utility 统一渲染工具语法。
- 为 Pi 增加精确 skill invocation 规则：`/skill:<skillDirName>`。
- 保持 Codex `$<skillDirName>`、Claude `/<skillDirName>`、OpenCode `/opsx-<commandSlug>` 和未知工具中性 skill 文案的既有边界。
- 更新 apply archive-ready 输出要求，禁止在模板中硬编码 `/opsx-archive` 这类工具专用语法。

## Capabilities

### New Capabilities

### Modified Capabilities

- `tool-invocation-references`: 增加 Pi `/skill:<skillDirName>` 渲染规则，并明确 OpenCode 保持 command-backed `/opsx-<commandSlug>`。
- `opsx-apply-skill`: archive-ready call-to-action 从固定 `/opsx-archive` 改为按工具适配后的 archive workflow invocation。

## Impact

- Affected code: `src/core/templates/transforms/builtin-transforms.ts`, `src/utils/command-references.ts`, `src/core/templates/workflows/apply-change.ts`
- Affected tests: `test/core/templates/transforms.test.ts`, `test/utils/command-references.test.ts`, `test/core/templates/apply-change.test.ts`
- Affected specs: `tool-invocation-references`, `opsx-apply-skill`
- Dependencies: none
