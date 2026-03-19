## ADDED Requirements

### Requirement: TTY 环境下的模式提问

当用户在交互式终端中执行 `bootstrap init` 且未传 `--mode` 时，应提问选择模式。

#### Scenario: TTY 且未传 --mode
- **GIVEN** `process.stdout.isTTY` 为 `true`
- **AND** 用户未传 `--mode` 参数
- **WHEN** 执行 `openspec bootstrap init`
- **THEN** 显示交互式 prompt 让用户选择模式
- **AND** 可选项来自 `getAllowedBootstrapModes(baselineType)`
- **AND** 不包含 baseline 不允许的模式

#### Scenario: TTY 且已传 --mode
- **GIVEN** `process.stdout.isTTY` 为 `true`
- **AND** 用户传了 `--mode full`
- **WHEN** 执行 `openspec bootstrap init --mode full`
- **THEN** 直接使用指定模式，不提问

### Requirement: 非交互环境下 fail fast

#### Scenario: non-TTY 且未传 --mode
- **GIVEN** `process.stdout.isTTY` 为 `false` 或 `undefined`
- **AND** 用户未传 `--mode` 参数
- **WHEN** 执行 `openspec bootstrap init`
- **THEN** 立即报错退出
- **AND** 错误信息包含 `--mode` 参数提示
- **AND** 不挂起等待输入

#### Scenario: non-TTY 且已传 --mode
- **GIVEN** `process.stdout.isTTY` 为 `false`
- **AND** 用户传了 `--mode opsx-first`
- **WHEN** 执行 `openspec bootstrap init --mode opsx-first`
- **THEN** 正常执行，不报错

### Requirement: 模式选项来源

#### Scenario: 选项集与 baseline 一致
- **GIVEN** baseline 类型为 `no-spec`
- **AND** `getAllowedBootstrapModes('no-spec')` 返回 `['full', 'opsx-first']`
- **WHEN** 显示交互式 prompt
- **THEN** 可选项恰好为 `['full', 'opsx-first']`
- **AND** 不多不少

#### Scenario: baseline 仅允许单一模式
- **GIVEN** baseline 类型仅允许一种模式
- **WHEN** 在 TTY 环境下执行 `bootstrap init`（未传 --mode）
- **THEN** 仍然提问（即使只有一个选项），保持行为一致性
