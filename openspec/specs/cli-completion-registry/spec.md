# Spec: cli-completion-registry

## Purpose

补齐 CLI 命令补全注册表中缺失的命令定义。

## Requirements

### Requirement: 所有 CLI 命令必须注册到 COMMAND_REGISTRY

#### Scenario: 顶层命令补全
- **GIVEN** 用户已安装 shell completion
- **WHEN** 输入 `openspec <TAB>`
- **THEN** 补全列表包含 `sync`、`status`、`instructions`、`templates`、`schemas`、`new`、`bootstrap`
- **AND** 包含已有的 `init`、`update`、`list`、`view`、`validate`、`show`、`archive`、`feedback`、`change`、`spec`、`completion`、`config`、`schema`

#### Scenario: bootstrap 子命令补全
- **WHEN** 输入 `openspec bootstrap <TAB>`
- **THEN** 补全列表包含 `init`、`status`、`instructions`、`validate`、`promote`

#### Scenario: bootstrap init flags 补全
- **WHEN** 输入 `openspec bootstrap init --<TAB>`
- **THEN** 补全列表包含 `--mode`、`--scope`

#### Scenario: new 子命令补全
- **WHEN** 输入 `openspec new <TAB>`
- **THEN** 补全列表包含 `change`

#### Scenario: sync positional 补全
- **WHEN** 输入 `openspec sync <TAB>`
- **THEN** 补全列表包含活跃 change ID

### Requirement: COMMAND_REGISTRY 与 CLI 命令树保持一致

#### Scenario: 注册表完整性
- **GIVEN** `src/cli/index.ts` 中注册的所有非 hidden 命令
- **THEN** `COMMAND_REGISTRY` 中存在对应条目
- **AND** flags 定义与 CLI 注册一致

## PBT Properties

### Property 1: Registry 覆盖率
- **INVARIANT**: CLI 中每个非 hidden 命令在 COMMAND_REGISTRY 中都有对应条目
- **FALSIFICATION**: 解析 CLI 命令树，与 COMMAND_REGISTRY 名称集合做差集，差集必须为空
