<!-- propose-routing: Design Summary found; input length: 6; detail score: 5/5 from confirmed explore summary; multi-subsystem: false; decision: proceed using Design Summary. -->
## Why

`openspec/config.yaml` 的读取层已经有 `optimization` 和 `git` 默认值，但 `openspec init` 不会把这些生效字段写入新配置，`openspec update` 也不会把旧项目迁移到当前配置形态。版本升级后用户的磁盘配置会落后于实际运行时行为，尤其是 archive merge 与 verify optimization 这类可调策略。

## What Changes

- `openspec init` 生成的新 `openspec/config.yaml` SHALL 包含生效的 `optimization` 与 `git` 默认节点。
- `openspec update` SHALL 在已有 OpenSpec 项目中迁移项目配置默认值：缺失 config 时创建 `openspec/config.yaml`，已有 config 时只补缺失的 `optimization` 与 `git` 字段。
- 迁移 SHALL 采用 deep missing-only 合并，保留用户已有字段、注释和自定义值。
- 非对象或无法解析的 YAML SHALL 不被重写；`update` 继续刷新工具制品。
- 不新增依赖，不迁移 `propose` / `apply`，不把旧 config 改造成完整注释模板。

## Capabilities

### New Capabilities

### Modified Capabilities
- `cli-init`: `openspec init` 生成的项目配置需要包含当前生效的功能性默认节点。
- `cli-update`: `openspec update` 需要执行非覆盖的项目配置默认值迁移。
- `config-loading`: 项目配置默认值需要有共享的磁盘物化契约，用于 init 创建与 update 迁移。

## Impact

- Affected code: `src/core/init.ts`, `src/core/update.ts`, `src/core/project-config.ts`, `src/core/config-prompts.ts`.
- Affected tests: `test/core/init.test.ts`, `test/core/update.test.ts`, optionally focused project-config helper tests.
- Affected specs: `cli-init`, `cli-update`, `config-loading`.
- No new runtime dependency or CLI flag.
