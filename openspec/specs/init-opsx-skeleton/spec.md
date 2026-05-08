# init-opsx-skeleton Specification

## Purpose
此规约记录变更 init-opsx-skeleton 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: OPSX Skeleton Generation on Init

`openspec init` SHALL 在首次初始化（非 extend 模式）时自动生成三个最小化 OPSX 骨架文件，仅当对应文件不存在时创建。

骨架文件生成路径：
- `openspec/project.opsx.yaml` — 空架构骨架（空 domains、空 capabilities）
- `openspec/project.opsx.relations.yaml` — 空关系集
- `openspec/project.opsx.code-map.yaml` — 空代码映射，含当前时间戳的 `generated_at` 字段

所有三个文件 SHALL 包含 `schema_version: 1` 字段。

`project.opsx.yaml` 中的 `project.id` 和 `project.name` SHALL 按以下优先级推断：
1. 读取 `package.json` 的 `name` 字段，若存在则使用
2. 回退为项目根目录的 basename

推断值 SHALL 被转换为合法 ID 格式（小写、特殊字符替换为连字符）。

#### Scenario: First-time init generates OPSX skeletons

- **GIVEN** 项目中 `openspec/` 目录不存在
- **WHEN** 运行 `openspec init`
- **THEN** 系统 SHALL 在 AI 工具配置前，生成 `openspec/project.opsx.yaml`、`openspec/project.opsx.relations.yaml`、`openspec/project.opsx.code-map.yaml` 三个骨架文件
- **AND** `project.opsx.yaml` SHALL 包含空的 `domains` 和 `capabilities` 数组
- **AND** `project.opsx.relations.yaml` SHALL 包含空的 `relations` 数组
- **AND** `project.opsx.code-map.yaml` SHALL 包含空的 `nodes` 数组

#### Scenario: Extend mode does NOT overwrite existing OPSX files

- **GIVEN** `openspec/` 目录已存在，且包含用户已编辑的 `project.opsx.yaml`
- **WHEN** 运行 `openspec init`（extend 模式）
- **THEN** 系统 SHALL NOT 覆盖或修改已有的 `project.opsx.yaml`、`project.opsx.relations.yaml`、`project.opsx.code-map.yaml`

#### Scenario: Skeleton files use safe cross-platform paths

- **WHEN** 生成 OPSX 骨架文件
- **THEN** 文件路径 SHALL 使用 `path.join()` 构造
- **AND** SHALL NOT 硬编码特定操作系统的路径分隔符

### Requirement: Bootstrap Guidance in Init Success Output

`openspec init` 成功提示 SHALL 在 getting started 区块之后、链接之前，显式引导用户运行 `/opsx:bootstrap` 完成架构映射。

#### Scenario: Bootstrap guidance shown when bootstrap is in profile

- **GIVEN** `bootstrap-opsx` workflow 在 active profile 中
- **AND** 非 extend 模式（首次 init）
- **AND** getting started 区块已显示
- **WHEN** 输出成功提示
- **THEN** 显示引导行："Next: run /opsx:bootstrap to map your architecture"

#### Scenario: Bootstrap guidance NOT shown when bootstrap is not in profile

- **GIVEN** `bootstrap-opsx` workflow 不在 active profile 中
- **WHEN** 输出成功提示
- **THEN** SHALL NOT 显示 `/opsx:bootstrap` 引导行

#### Scenario: Bootstrap guidance NOT shown in extend mode

- **GIVEN** 当前为 extend 模式（`openspec/` 已存在）
- **WHEN** 输出成功提示
- **THEN** SHALL NOT 显示 `/opsx:bootstrap` 引导行

