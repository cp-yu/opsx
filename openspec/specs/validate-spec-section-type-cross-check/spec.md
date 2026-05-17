# validate-spec-section-type-cross-check Specification

## Purpose
此规约记录变更 validate-spec-section-type-integrity 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: MODIFIED requirement header 必须存在于主 spec

`validateChangeDeltaSpecs()` SHALL 对每个 `## MODIFIED Requirements` 下的 `### Requirement: <name>` 读取对应主 spec（`openspec/specs/<capability>/spec.md`），使用 `normalizeRequirementName()` 匹配，验证该 header 存在。不存在时 SHALL 报 ERROR。

#### Scenario: MODIFIED header 存在于主 spec

- **WHEN** change spec `specs/foo/spec.md` 包含 `## MODIFIED Requirements` 下的 `### Requirement: Bar`
- **AND** 主 spec `openspec/specs/foo/spec.md` 存在且包含 `### Requirement: Bar`
- **THEN** 验证 SHALL 通过，不产生 ERROR

#### Scenario: MODIFIED header 不存在于主 spec

- **WHEN** change spec `specs/foo/spec.md` 包含 `## MODIFIED Requirements` 下的 `### Requirement: Bar`
- **AND** 主 spec `openspec/specs/foo/spec.md` 存在但不包含 `### Requirement: Bar`
- **THEN** 验证 SHALL 报 ERROR
- **AND** 错误信息 SHALL 包含 requirement 名称和建议（应使用 `## ADDED Requirements`）

#### Scenario: MODIFIED 引用不存在的主 spec

- **WHEN** change spec `specs/foo/spec.md` 包含 `## MODIFIED Requirements`
- **AND** 主 spec `openspec/specs/foo/spec.md` 不存在
- **THEN** 验证 SHALL 报 ERROR
- **AND** 错误信息 SHALL 说明主 spec 不存在，MODIFIED 无效

#### Scenario: header 匹配使用 normalizeRequirementName

- **WHEN** change spec 中 MODIFIED header 为 `### Requirement: Foo Bar`
- **AND** 主 spec 中 header 为 `### Requirement: foo bar`（大小写不同）
- **THEN** 验证 SHALL 视为匹配，不报 ERROR

### Requirement: ADDED requirement header 不得已存在于主 spec

`validateChangeDeltaSpecs()` SHALL 对每个 `## ADDED Requirements` 下的 `### Requirement: <name>` 检查对应主 spec 中是否已存在同名 header。已存在时 SHALL 报 ERROR。

#### Scenario: ADDED header 不存在于主 spec

- **WHEN** change spec `specs/foo/spec.md` 包含 `## ADDED Requirements` 下的 `### Requirement: New Thing`
- **AND** 主 spec `openspec/specs/foo/spec.md` 不包含 `### Requirement: New Thing`
- **THEN** 验证 SHALL 通过

#### Scenario: ADDED header 已存在于主 spec

- **WHEN** change spec `specs/foo/spec.md` 包含 `## ADDED Requirements` 下的 `### Requirement: Existing`
- **AND** 主 spec `openspec/specs/foo/spec.md` 已包含 `### Requirement: Existing`
- **THEN** 验证 SHALL 报 ERROR
- **AND** 错误信息 SHALL 建议使用 `## MODIFIED Requirements`

#### Scenario: 主 spec 不存在时 ADDED 合法

- **WHEN** change spec `specs/foo/spec.md` 包含 `## ADDED Requirements`
- **AND** 主 spec `openspec/specs/foo/spec.md` 不存在
- **THEN** 验证 SHALL 通过（新 capability 的所有 requirement 都是 ADDED）

### Requirement: REMOVED/RENAMED requirement header 必须存在于主 spec

`validateChangeDeltaSpecs()` SHALL 对 `## REMOVED Requirements` 和 `## RENAMED Requirements` 中引用的 header 验证其存在于主 spec。

#### Scenario: REMOVED header 存在于主 spec

- **WHEN** change spec 包含 `## REMOVED Requirements` 下的 `### Requirement: Old`
- **AND** 主 spec 包含 `### Requirement: Old`
- **THEN** 验证 SHALL 通过

#### Scenario: REMOVED header 不存在于主 spec

- **WHEN** change spec 包含 `## REMOVED Requirements` 下的 `### Requirement: Ghost`
- **AND** 主 spec 不包含 `### Requirement: Ghost`
- **THEN** 验证 SHALL 报 ERROR

#### Scenario: RENAMED FROM header 存在于主 spec

- **WHEN** change spec 包含 `## RENAMED Requirements` 的 FROM: `Old Name`
- **AND** 主 spec 包含 `### Requirement: Old Name`
- **THEN** 验证 SHALL 通过

#### Scenario: RENAMED FROM header 不存在于主 spec

- **WHEN** change spec 包含 `## RENAMED Requirements` 的 FROM: `Missing`
- **AND** 主 spec 不包含 `### Requirement: Missing`
- **THEN** 验证 SHALL 报 ERROR

