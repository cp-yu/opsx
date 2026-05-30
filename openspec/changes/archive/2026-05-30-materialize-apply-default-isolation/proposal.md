<!-- propose-routing: Design Summary found; inputLength=41; detailScore=5/5; multiSubsystem=false; decision=proceed-with-design-summary -->
## Why

`apply.defaultIsolation` 已经控制 main/master 上 apply 的隔离选择，但 `openspec/config.yaml` 默认输出没有暴露这个可调项。用户只能从生成的 apply 指令里看到行为，无法在 init/update 后的项目配置中直接发现并设置默认隔离策略。

## What Changes

- 将 `apply.defaultIsolation: ask` 纳入项目配置的功能性磁盘默认值。
- `openspec init` 生成的 `openspec/config.yaml` SHALL 包含 `apply.defaultIsolation: ask  # ask / branch / worktree / none`。
- `openspec update` 对既有 `openspec/config.yaml` 或 `openspec/config.yml` 做 missing-only migration，缺失时补齐 `apply.defaultIsolation: ask`，不覆盖用户已有值。
- 保持现有运行时语义：`ask` 继续交互询问；`branch`、`worktree`、`none` 继续作为非交互默认策略。

## Capabilities

### New Capabilities

- `apply-default-isolation-config`: 项目配置默认物化 `apply.defaultIsolation`，并让 init/update 以 missing-only 方式写出该默认值。

### Modified Capabilities

- `config-loading`: Materialized functional defaults now include the runtime-consumed `apply.defaultIsolation` node.
- `cli-init`: Generated `openspec/config.yaml` includes the visible apply isolation default.
- `cli-update`: Project config default migration adds the missing apply isolation default without overwriting existing user configuration.

## Impact

- Affected code: `src/core/project-config.ts`, `src/core/config-prompts.ts`.
- Affected tests: `test/core/project-config.test.ts`, `test/core/init.test.ts`, `test/core/update.test.ts`.
- Affected specs: `openspec/specs/config-loading/spec.md`, `openspec/specs/cli-init/spec.md`, `openspec/specs/cli-update/spec.md`.
- No new dependencies, commands, or public API shapes.
