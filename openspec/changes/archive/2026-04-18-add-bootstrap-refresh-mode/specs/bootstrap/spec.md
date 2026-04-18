## MODIFIED Requirements

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
