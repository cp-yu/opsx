## MODIFIED Requirements

### Requirement: Instructions Command

The system SHALL output enriched instructions for creating an artifact, including for scaffolded changes. For the spec-driven `tasks` artifact, the generated instructions SHALL require `tasks.md` to separate implementation goals from executable verification Checks and SHALL require every Check to declare its verification anchor: a change-local spec requirement with scenarios (`Verifies`), a change-local REMOVED requirement (`Verifies` 的无 Scenario 变体), or a preserved main-spec requirement (`Preserves`). For the spec-driven apply instruction, the generated instruction SHALL require strict Master-agent TDD for behavior and code Checks while preserving evidence-only handling for non-runtime text or artifact Checks.

#### Scenario: Show enriched instructions

- **WHEN** user runs `openspec instructions <artifact> --change <id>`
- **THEN** the system outputs:
  - Artifact metadata (ID, output path, description)
  - Template content
  - Dependency status (done/missing)
  - Unlocked artifacts (what becomes available after completion)

#### Scenario: Instructions JSON output

- **WHEN** user runs `openspec instructions <artifact> --change <id> --json`
- **THEN** the system outputs JSON matching ArtifactInstructions interface

#### Scenario: Unknown artifact

- **WHEN** user runs `openspec instructions unknown-artifact --change <id>`
- **THEN** the system displays an error listing valid artifact IDs for the schema

#### Scenario: Artifact with unmet dependencies

- **WHEN** user requests instructions for a blocked artifact
- **THEN** the system displays instructions with a warning about missing dependencies

#### Scenario: Instructions on scaffolded change

- **WHEN** user runs `openspec instructions proposal --change <id>` on a scaffolded change
- **THEN** system outputs template and metadata for creating the proposal
- **AND** does not require any artifacts to already exist

#### Scenario: Tasks instructions require coarse Tasks and Checks sections

- **WHEN** user runs `openspec instructions tasks --change <id> --json`
- **THEN** the returned `instruction` SHALL tell the agent to write `tasks.md` with coarse `### Task N:` sections
- **AND** each task SHALL contain `Goal`, `Files`, `Requirements`, and nested `Checks`
- **AND** `Checks` SHALL contain checkbox items for executable verification work using a `C` prefix
- **AND** the instruction SHALL keep the existing `- [ ]` checkbox prefix contract intact for checks

#### Scenario: Tasks instructions require Verifies fields

- **WHEN** user runs `openspec instructions tasks --change <id> --json`
- **THEN** the returned `instruction` SHALL tell the agent that every check MUST include a `Verifies:` or `Preserves:` field
- **AND** when the change has local delta specs, `Verifies:` SHALL use a change-local relative path from the change directory in the form `specs/<capability>/spec.md`
- **AND** 当 `Verifies:` 锚定普通 requirement 时，SHALL identify one full `Requirement` name and one or more full `Scenario` names
- **AND** 当 `Verifies:` 锚定删除交付物时，SHALL 使用 `REMOVED Requirement "<name>"` 形式且 SHALL NOT 要求 Scenario 名
- **AND** `Verifies:` SHALL NOT use `openspec/specs/...`, project-root-relative paths, absolute paths, archived/main spec paths, or backslash-separated paths

#### Scenario: Tasks instructions convert vague work into testable goals

- **WHEN** user runs `openspec instructions tasks --change <id> --json`
- **THEN** the returned `instruction` SHALL tell the agent to convert validation work into a check for invalid-input behavior
- **AND** SHALL tell the agent to convert bug fixes into a check that reproduces and proves the regression fix
- **AND** SHALL tell the agent to convert refactors into a behavior-equivalence check anchored by a `Preserves:` field，且该 check 的 `Expect:` SHALL 点名被取代的旧形态（旧符号、旧路径或旧重复块），`Command:` SHALL 附带对应缺失断言
- **AND** SHALL tell the agent to convert deletion work into a check anchored by `Verifies: ... REMOVED Requirement "<name>"` with an absence assertion command
- **AND** every task SHALL include at least one Check

#### Scenario: Checks are executable verification items

- **WHEN** user runs `openspec instructions tasks --change <id> --json`
- **THEN** the returned `instruction` SHALL tell the agent that each Check is executable verification work, not explanatory prose
- **AND** each Check SHALL include a command, evidence source, or observable expectation sufficient for an agent to run or inspect it
- **AND** each Check SHALL anchor that verification to a `Verifies:` or `Preserves:` target before implementation starts

#### Scenario: Tasks instructions allow non-runtime text fast path

- **WHEN** user runs `openspec instructions tasks --change <id> --json`
- **THEN** the returned `instruction` SHALL state that non-runtime text or non-runtime artifact changes do not require artificial failing tests
- **AND** SHALL still require at least one lightweight Check that explains how completion will be verified
- **AND** that lightweight Check SHALL still include a non-empty `Verifies:` field
- **AND** the instruction SHALL state that config, schema, template, workflow template, and agent instruction template changes default to behavior Checks unless the task proves there is no runtime or generated-surface consumer
- **AND** the instruction SHALL state that absence assertions（如删除后的 grep 空断言）按非运行时快速路径处理，以 `Command:` 输出作为最终证据，不要求人为的 red/green 形态

#### Scenario: Apply instructions require strict TDD for behavior Checks

- **WHEN** user runs `openspec instructions apply --change <id> --json`
- **THEN** the returned `instruction` SHALL tell the agent to execute behavior and code Checks through strict TDD
- **AND** the instruction SHALL require adding or updating the targeted test before implementation
- **AND** the instruction SHALL require running the Check command or equivalent targeted command and confirming the expected failure before implementation
- **AND** the instruction SHALL require minimal implementation followed by rerunning the same or equivalent Check command and confirming pass before marking progress
- **AND** the instruction SHALL NOT describe apply as directly implementing each pending task without the red/green checkpoint

#### Scenario: Verifies path remains change-local and cross-platform

- **WHEN** a `Verifies:` field names a spec path
- **THEN** the path SHALL be written as a relative POSIX path from the change directory
- **AND** the implementation SHALL resolve the path using Node path APIs such as `path.join(changeDir, verifiesPath)`
- **AND** tests SHALL cover rejection of `openspec/specs/...`, absolute paths, parent traversal, and backslash-separated paths

#### Scenario: REMOVED 锚定的结构校验

- **WHEN** `tasks.md` 中某 Check 的 `Verifies:` 使用 `REMOVED Requirement "<name>"` 形式
- **THEN** 结构校验 SHALL 接受该 Check 不含 Scenario 名
- **AND** SHALL 交叉校验该 requirement 名存在于所指 change-local delta spec 的 `## REMOVED Requirements` 区段
- **AND** 当所指 REMOVED 条目不存在时 SHALL 报告校验错误
- **AND** 普通 `Verifies:` 缺少 Scenario 名时 SHALL 仍按现有规则报告校验错误

#### Scenario: Preserves 字段锚定主 spec 且跨平台解析

- **WHEN** `tasks.md` 中某 Check 包含 `Preserves:` 字段
- **THEN** 该字段 SHALL 使用 `openspec/specs/<capability>/spec.md` 形式的项目根相对 POSIX 路径
- **AND** SHALL identify one full `Requirement` name and one or more full `Scenario` names
- **AND** the implementation SHALL resolve the path using Node path APIs such as `path.join(projectRoot, preservesPath)`
- **AND** 校验 SHALL 拒绝 change-local 路径、绝对路径、父目录穿越和反斜杠分隔路径
- **AND** `Preserves:` 的主 spec 路径许可 SHALL NOT 放宽到 `Verifies:` 字段

#### Scenario: Files 支持 Delete 声明

- **WHEN** user runs `openspec instructions tasks --change <id> --json`
- **THEN** the returned `instruction` 列出的 Files 标签 SHALL 包含 `Delete:`，与 `Create:`、`Modify:`、`Test:` 并列
- **AND** SHALL 说明文件级删除（含移动、合并产生的删除）使用 `Delete:` 声明
- **AND** SHALL 说明生成面改动（如 skill 再生成目录）在 Files 中以目录粒度声明
