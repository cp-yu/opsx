## MODIFIED Requirements

### Requirement: 空 specs 目录仍应视为 raw baseline
`detectBootstrapBaseline()` SHALL 基于 formal OPSX 文件完整性与真实 spec 内容返回稳定的 baseline 分类，并为每种 baseline 暴露显式允许的 modes。

#### Scenario: 空 openspec/specs/ 目录
- **GIVEN** 项目存在 `openspec/specs/` 目录
- **AND** 该目录为空或仅包含 README.md
- **WHEN** 执行 `detectBootstrapBaseline()`
- **THEN** 返回 `raw`
- **AND** `getAllowedBootstrapModes('raw')` 返回 `['full', 'opsx-first']`

#### Scenario: 有真实 spec 内容的 specs 目录
- **GIVEN** 项目存在 `openspec/specs/my-feature/spec.md`
- **WHEN** 执行 `detectBootstrapBaseline()`
- **THEN** 返回 `specs-based`
- **AND** `getAllowedBootstrapModes('specs-based')` 返回 `['full']`

#### Scenario: Existing formal OPSX uses refresh mode
- **GIVEN** 项目存在完整且合法的 formal OPSX 三文件
- **WHEN** 执行 `detectBootstrapBaseline()`
- **THEN** 返回 `formal-opsx`
- **AND** `getAllowedBootstrapModes('formal-opsx')` 返回 `['refresh']`

#### Scenario: Partial or invalid formal OPSX remains unsupported
- **GIVEN** 项目只存在部分 formal OPSX 文件，或任一 formal OPSX 文件无法通过 schema 校验
- **WHEN** 执行 `detectBootstrapBaseline()`
- **THEN** 返回 `invalid-partial-opsx`
- **AND** `getAllowedBootstrapModes('invalid-partial-opsx')` 返回空列表
