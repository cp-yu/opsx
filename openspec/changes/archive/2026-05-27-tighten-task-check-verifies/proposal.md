## Why

当前 `tasks.md` 的 `Checks` 只需要通过 `Covers:` 绑定实现动作，容易生成结构合规但测试广度和深度不足的浅层检查项。需要让每个检查项显式绑定本次 change 的 requirement 和 scenario，同时保持校验逻辑确定性、轻量、不进入语义充分性判断。

## What Changes

- **任务生成提示词收紧**: `tasks` artifact instruction 和模板要求每个 `C` check 必填 `Verifies:`
- **change-local spec 引用**: `Verifies:` 使用相对 change 目录的 `specs/<capability>/spec.md`，不得使用主规约路径、绝对路径或反斜杠路径
- **结构校验增强**: `validateTaskStructure` 增加 `Verifies:` 的确定性校验；有 change-local specs 时检查 requirement/scenario 引用存在；无 specs 时只给 warning 并跳过交叉校验

## Capabilities

### New Capabilities

### Modified Capabilities
- `cli-artifact-workflow`: `tasks` artifact instruction 和模板新增 `Verifies:` 规则，要求 checks 锚定 change-local spec requirement/scenario
- `opsx-propose-skill`: post-propose task structure validation 新增 `Verifies:` 字段、路径和 requirement/scenario 引用校验规则

## Impact

- Affected code: `schemas/spec-driven/schema.yaml`, `schemas/spec-driven/templates/tasks.md`, `src/core/parsers/task-structure.ts`, task instruction/template/parser tests
- No change to `apply` or `verify` workflow runtime semantics
- Existing no-spec maintenance changes remain allowed, but their `Verifies:` cross-check degrades to warning
