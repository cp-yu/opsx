## Purpose

Define the bootstrap workflow contract: how `openspec bootstrap` CLI subcommands guide users through initializing and promoting OPSX architecture files.
## Requirements
### Requirement: Bootstrap docs and workflow templates SHALL describe only the CLI-backed five-phase flow
Bootstrap 文档、workflow templates 与生成的命令指引 SHALL 仅将 bootstrap 描述为由现有 `openspec bootstrap` CLI 子命令驱动的结构化流程。

#### Scenario: Bootstrap command guidance references real CLI subcommands
- **WHEN** a user reads generated bootstrap command content or bootstrap workflow guidance
- **THEN** the documented flow SHALL reference only these CLI subcommands:
  - `openspec bootstrap status`
  - `openspec bootstrap init`
  - `openspec bootstrap instructions`
  - `openspec bootstrap validate`
  - `openspec bootstrap promote`
- **AND** the guidance SHALL describe the lifecycle `init → scan → map → review → promote`

#### Scenario: Deprecated pseudo-command flags are removed from bootstrap docs
- **WHEN** bootstrap docs are updated for the structured CLI-backed workflow
- **THEN** they SHALL NOT describe unsupported command forms such as `/opsx:bootstrap --focus`, `/opsx:bootstrap --extend --capabilities`, `/opsx:bootstrap --extend --relations`, or `/opsx:bootstrap --refresh`
- **AND** the docs SHALL direct scoped initialization to supported CLI parameters such as `openspec bootstrap init --scope ...`

### Requirement: Bootstrap contract surfaces SHALL stay consistent

Bootstrap schema、CLI behavior、workflow templates、generated instructions 与 user-facing docs SHALL 描述同一套 bootstrap 生命周期与模式合同。

#### Scenario: Contract surfaces agree on supported modes
- **WHEN** 检查 bootstrap schema、workflow template、CLI help 与 bootstrap docs
- **THEN** 它们 SHALL 暴露相同的 mode names
- **AND** SHALL 描述相同的 supported upgrade paths
- **AND** `formal-opsx` baseline SHALL 被描述为仅支持 `refresh`

#### Scenario: Contract surfaces agree on raw baseline mode semantics
- **WHEN** 检查 `raw` 基线下的 bootstrap CLI help、instructions、workflow template 与 user docs
- **THEN** `full` SHALL 被描述为“生成正式 OPSX + 完整合法 specs”
- **AND** `opsx-first` SHALL 被描述为“生成正式 OPSX + README-only starter”
- **AND** 任何合同面 SHALL NOT 再把 `raw + full` 描述为仅生成 starter specs

#### Scenario: Contract surfaces agree on refresh semantics for formal OPSX
- **WHEN** 检查 `formal-opsx` 基线下的 bootstrap CLI help、instructions、workflow template 与 user docs
- **THEN** `refresh` SHALL 被描述为“基于现有 formal OPSX 的增量刷新”
- **AND** SHALL 明确说明 git diff 仅用于缩小扫描范围，而非替代 formal OPSX 作为 source of truth
- **AND** SHALL 明确说明 promote 通过 merge/delta 更新正式文件

#### Scenario: Contract surfaces agree on command surface
- **WHEN** 检查生成的 bootstrap command、bootstrap workflow template、CLI subcommand registration 与 bootstrap docs
- **THEN** 它们 SHALL 将 bootstrap 呈现为 CLI-backed agent workflow
- **AND** SHALL 暴露用户可见命令名 `/opsx:bootstrap`
- **AND** SHALL NOT 暗示任何不受支持的一次性或 extend 风格 bootstrap flags
- **AND** SHALL NOT 将 `refresh` 表述为 `/opsx:bootstrap --refresh` 这类伪命令

### Requirement: Bootstrap 产出 SHALL 基于 bootstrap 工作区填充项目级元数据

`assembleBundle()` 生成 bootstrap candidate bundle 时，`project.intent` 和 `project.scope` SHALL 来自 bootstrap 工作区已形成的信息（如 `scope.yaml`、`evidence.yaml`、`domain-map/*.yaml` 与当前 review 状态），而不是来自生态特定的 manifest 文件。

#### Scenario: raw/specs-based bootstrap 使用工作区信息填充 project 元数据

- **GIVEN** 仓库 baseline 为 `raw` 或 `specs-based`
- **AND** bootstrap 工作区存在 `scope.yaml`、`evidence.yaml` 与至少一个有效的 `domain-map/*.yaml`
- **WHEN** `assembleBundle()` 组装 OPSX bundle
- **THEN** `project.intent` SHALL 基于 bootstrap 当前领域 intent 信息生成
- **AND** `project.scope` SHALL 基于 `scope.yaml` 的 mode/include/exclude 与当前映射覆盖信息生成
- **AND** `package.json` 等 manifest SHALL NOT 作为这些字段的 source of truth

#### Scenario: bootstrap 输入不足时字段留空而不是猜测

- **GIVEN** bootstrap 工作区缺少稳定表达 `project.intent` 或 `project.scope` 所需的信息
- **WHEN** `assembleBundle()` 组装 OPSX bundle
- **THEN** 对应字段 SHALL 为 `undefined`（不写入 YAML）
- **AND** 实现 SHALL NOT 使用外部 manifest 或生态启发式填补这些字段

#### Scenario: formal-opsx refresh preserves existing project metadata unless reviewed delta changes it

- **GIVEN** 仓库 baseline 为 `formal-opsx`
- **AND** refresh 以当前 formal OPSX 作为候选基线
- **WHEN** refresh 重新组装 candidate bundle
- **THEN** 现有 `project` 元数据 SHALL 默认被保留为 source of truth
- **AND** 只有在 review 明确批准对应变更时，candidate 才可修改相关 `project` 字段
- **AND** refresh SHALL NOT 通过整包覆写 candidate 文件来隐式改写 formal `project` 元数据

### Requirement: Promote 后 bootstrap 工作区 SHALL 保留，不得主动删除

`promoteBootstrap()` 完成文件复制后，SHALL NOT 删除 `openspec/bootstrap/` 工作区目录。工作区文件包含 bootstrap 过程中形成的项目理解，可能供后续使用。

#### Scenario: Promote 完成后工作区仍然存在

- **GIVEN** `openspec bootstrap promote` 执行成功
- **WHEN** 检查文件系统
- **THEN** `openspec/bootstrap/` 目录及其所有文件 SHALL 仍然存在
- **AND** 终端 SHALL 打印提示，说明 `openspec/bootstrap/` 已保留，用户可在确认后手动删除
- **AND** `promoteBootstrap()` SHALL NOT 调用任何删除该目录或其内容的 API

#### Scenario: Promote 完成时用户收到清理提示

- **GIVEN** promote 所有文件已复制完成
- **WHEN** `promoteBootstrap()` 返回
- **THEN** 调用方 SHALL 获得一条提示消息，说明工作区路径与手动清理方式
- **AND** 此提示 SHALL 明确表示可选（而非必须）

### Requirement: Bootstrap 文档示例 SHALL 使用当前 schema 字段

`docs/opsx-bootstrap.md` 的 "Minimal Example" 代码块 SHALL 使用 `intent` / `scope` 而非已废弃的 `description` / `version`。

#### Scenario: 文档示例不包含废弃字段

- **WHEN** 检查 `docs/opsx-bootstrap.md` 的 YAML 示例
- **THEN** 示例 SHALL 使用 `project.id`、`project.name`、`project.intent` 字段
- **AND** 示例 SHALL NOT 包含 `project.description` 或 `project.version`
- **AND** 示例中的 domain 节点 SHALL NOT 包含内嵌的 `code_refs`

### Requirement: Bootstrap generated artifacts SHALL consume runtime projection
Bootstrap candidate specs, review artifacts, and starter artifacts SHALL consume runtime projection derived from project config so generated prose and stale detection follow the same contract as prompt-driven artifact authoring.

#### Scenario: Bootstrap candidate prose respects projected language policy
- **WHEN** bootstrap assembles candidate specs or review artifacts
- **AND** runtime projection defines a prose-language policy
- **THEN** bootstrap SHALL apply that runtime projection to generated prose fields
- **AND** SHALL preserve canonical English structure tokens and normative keywords

#### Scenario: Projection-affecting config changes invalidate bootstrap outputs
- **WHEN** an effective runtime projection field that changes generated bootstrap text is modified
- **THEN** bootstrap fingerprinting SHALL treat that as source drift
- **AND** review approval SHALL become stale until validate regenerates derived artifacts
