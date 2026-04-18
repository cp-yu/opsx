# Spec: bootstrap-init-ux

## Purpose

更新 `bootstrap init` 的模式提示与后续指引，使其准确反映 `full` 与 `opsx-first` 的新合同。

## Command Syntax

```bash
openspec bootstrap init [--mode <full|opsx-first>] [--scope <path>]
```
## Requirements
### Requirement: TTY 环境下的模式提问
当用户在交互式终端中执行 `bootstrap init` 且未传 `--mode` 时，命令 SHALL 提问选择模式。

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

### Requirement: 模式说明必须准确反映合同
`bootstrap init` 的 mode 说明与后续指引 SHALL 与新的 `full` / `opsx-first` 合同一致：`full` 生成正式 OPSX + 完整合法 specs，`opsx-first` 生成正式 OPSX + README-only starter，`specs-based + full` 采用 preserve-only 并在冲突时 fail-fast。

#### Scenario: Raw baseline shows accurate full mode guidance
- **GIVEN** baseline 类型为 `raw`
- **WHEN** 用户在 TTY 环境查看 `full` 模式说明或读取 init instructions
- **THEN** 文案 SHALL 明确 `full` 会生成正式 OPSX 与完整合法 specs
- **AND** SHALL NOT 再把 `full` 描述为仅生成 starter specs

#### Scenario: Raw baseline shows accurate opsx-first guidance
- **GIVEN** baseline 类型为 `raw`
- **WHEN** 用户在 TTY 环境查看 `opsx-first` 模式说明或读取 init instructions
- **THEN** 文案 SHALL 明确 `opsx-first` 会生成正式 OPSX 与 README-only starter
- **AND** SHALL 明确行为 specs 需要在后续常规 change workflow 中补充

#### Scenario: Specs-based baseline shows preserve-only guidance
- **GIVEN** baseline 类型为 `specs-based`
- **WHEN** 用户读取 `full` 模式说明或 init instructions
- **THEN** 文案 SHALL 明确现有 specs 会被保留
- **AND** SHALL 明确仅补充缺失 capability 的 spec
- **AND** SHALL 明确目标路径冲突会 fail-fast

### Requirement: 非交互环境下 fail fast
当 `process.stdout.isTTY` 为 `false` 且用户未传 `--mode` 时，`bootstrap init` SHALL fail-fast 并提示必须显式提供 `--mode`。

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

### Requirement: Bootstrap guidance SHALL explain projection-driven authoring rules
Bootstrap init guidance and phase instructions SHALL describe how config projection governs bootstrap prose fields while keeping canonical tokens unchanged.

#### Scenario: Map-phase guidance references projection semantics
- **WHEN** bootstrap guidance instructs users or agents to fill prose-bearing fields such as `spec.purpose`, requirement prose, scenario titles, or step text
- **THEN** the guidance SHALL explain that those fields follow the projected documentation language policy
- **AND** SHALL explain that canonical template and normative tokens remain unchanged

