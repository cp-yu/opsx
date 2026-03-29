# Spec: bootstrap

## ADDED Requirements

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

#### Scenario: 已有 formal OPSX 的仓库不被这次变更调整

- **GIVEN** 仓库 baseline 为 `formal-opsx` 或 `invalid-partial-opsx`
- **WHEN** 用户尝试启动 bootstrap
- **THEN** bootstrap SHALL 继续保持不支持
- **AND** 现有 `openspec/project.opsx.yaml` SHALL NOT 因本次 project 元数据激活而被调整、迁移或覆写

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
