# cli-opsx-query Specification

## Purpose
此规约记录变更 unify-cli-query-interface 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: OPSX query 命令基本结构

系统 SHALL 提供 `openspec opsx query <node-id...> --json` 命令，接受一个或多个 node-id，用于查询 OPSX 节点的完整信息。

#### Scenario: 查询存在的节点返回完整信息

- **WHEN** 用户执行 `openspec opsx query cap.cli.list --json`
- **AND** node `cap.cli.list` 存在于 OPSX 文件中
- **THEN** 系统 SHALL 返回 JSON 对象，包含三个顶层字段：`node`、`relations`、`codeMap`
- **AND** `node` 字段 SHALL 包含 `id`、`type`、`intent`、`status` 属性
- **AND** `relations` 字段 SHALL 包含 `incoming` 和 `outgoing` 两个数组
- **AND** `codeMap` 字段 SHALL 是数组，包含该节点的所有 code-map 引用

#### Scenario: 查询不存在的节点报错

- **WHEN** 用户执行 `openspec opsx query cap.nonexistent --json`
- **AND** node `cap.nonexistent` 不存在于 OPSX 文件中
- **THEN** 系统 SHALL 以非零退出码退出
- **AND** 错误信息 SHALL 包含 `Node 'cap.nonexistent' not found in OPSX`
- **AND** 错误信息 SHALL 列出前 5 个可用节点 ID 作为提示

#### Scenario: OPSX 文件不存在时报错

- **WHEN** 用户在未初始化 OPSX 的项目中执行 `openspec opsx query <any-id> --json`
- **AND** `openspec/project.opsx.yaml` 文件不存在
- **THEN** 系统 SHALL 以非零退出码退出
- **AND** 错误信息 SHALL 包含 `OPSX files not found`
- **AND** 错误信息 SHALL 提示运行 `openspec bootstrap init` 或 `openspec init`

#### Scenario: 单 node-id 且未指定 --depth 时输出形态保持不变

- **WHEN** 用户执行 `openspec opsx query cap.cli.list --json`
- **AND** 命令行中只提供一个 node-id 且未显式指定 `--depth`
- **THEN** 系统 SHALL 返回与历史版本完全一致的 `{node, relations, codeMap}` 单节点形态
- **AND** MUST NOT 输出 `seeds`、`nodes`、`missing` 等子图形态字段

### Requirement: 过滤参数支持

系统 SHALL 支持 `--relations` 和 `--code-map` 过滤参数，允许用户按需获取数据子集。

#### Scenario: 使用 --relations 过滤

- **WHEN** 用户执行 `openspec opsx query cap.cli.list --relations --json`
- **THEN** 系统 SHALL 返回 JSON 对象，仅包含 `node` 和 `relations` 字段
- **AND** MUST NOT 包含 `codeMap` 字段

#### Scenario: 使用 --code-map 过滤

- **WHEN** 用户执行 `openspec opsx query cap.cli.list --code-map --json`
- **THEN** 系统 SHALL 返回 JSON 对象，仅包含 `node` 和 `codeMap` 字段
- **AND** MUST NOT 包含 `relations` 字段

#### Scenario: 同时使用 --relations 和 --code-map

- **WHEN** 用户执行 `openspec opsx query cap.cli.list --relations --code-map --json`
- **THEN** 系统 SHALL 返回完整 JSON 对象，包含 `node`、`relations` 和 `codeMap` 字段

### Requirement: Relations 数据结构

系统 SHALL 将关系按方向分为 incoming 和 outgoing 两类返回。

#### Scenario: 返回 incoming relations

- **WHEN** 查询一个作为关系目标的节点
- **AND** 存在其他节点指向该节点的关系
- **THEN** `relations.incoming` 数组 SHALL 包含所有 `to` 字段为该节点的关系
- **AND** 每个关系对象 SHALL 包含 `from`、`type` 字段

#### Scenario: 返回 outgoing relations

- **WHEN** 查询一个作为关系源的节点
- **AND** 该节点指向其他节点的关系存在
- **THEN** `relations.outgoing` 数组 SHALL 包含所有 `from` 字段为该节点的关系
- **AND** 每个关系对象 SHALL 包含 `to`、`type` 字段

#### Scenario: 节点无任何关系

- **WHEN** 查询一个没有任何关系的节点
- **THEN** `relations.incoming` 和 `relations.outgoing` SHALL 均为空数组
- **AND** MUST NOT 返回 null 或 undefined

### Requirement: Code-map 数据结构

系统 SHALL 从 `openspec/project.opsx.code-map.yaml` 中提取节点的 code-map 引用。

#### Scenario: 节点有 code-map 引用

- **WHEN** 查询一个在 code-map 文件中有引用的节点
- **THEN** `codeMap` 数组 SHALL 包含该节点的所有引用条目
- **AND** 每个条目 SHALL 包含 `path` 字段
- **AND** 条目 MAY 包含 `line_start` 和 `line_end` 字段

#### Scenario: 节点无 code-map 引用

- **WHEN** 查询一个在 code-map 文件中无引用的节点
- **THEN** `codeMap` 数组 SHALL 为空数组
- **AND** MUST NOT 返回 null 或 undefined

#### Scenario: Code-map 文件缺失

- **WHEN** `openspec/project.opsx.code-map.yaml` 文件不存在
- **THEN** 系统 SHALL 以非零退出码退出
- **AND** 错误信息 SHALL 说明 code-map 文件缺失

### Requirement: 数据访问层复用

系统 MUST 复用 `src/utils/opsx-utils.ts` 中的 `readProjectOpsx()` 函数，MUST NOT 重复实现 YAML 解析逻辑。

#### Scenario: 调用 readProjectOpsx 获取数据

- **WHEN** `openspec opsx query` 命令执行
- **THEN** 系统 SHALL 调用 `readProjectOpsx(projectRoot)` 获取 OPSX bundle
- **AND** bundle SHALL 使用既有 `ProjectOpsxBundle` 结构，包含 `domains`、`capabilities`、`relations`、`code_map` 等字段
- **AND** 系统 SHALL 基于 bundle 数据构建 JSON 响应

### Requirement: 批量节点子图输出

系统 SHALL 在用户提供多个 node-id 或显式指定 `--depth` 时，输出去重合并的子图 JSON 对象，包含 `seeds`、`nodes`、`relations`、`codeMap`、`missing` 五个顶层字段。

#### Scenario: 批量查询多个存在的节点

- **WHEN** 用户执行 `openspec opsx query cap.cli.list cap.cli.show --json`
- **AND** 两个节点均存在于 OPSX 文件中
- **THEN** 系统 SHALL 返回 JSON 对象，`seeds` SHALL 为 `["cap.cli.list", "cap.cli.show"]`
- **AND** `nodes` 数组 SHALL 包含两个 seed 节点对象且无重复，每个节点对象 SHALL 包含 `id`、`type`、`intent`、`status` 属性
- **AND** `relations` 数组 SHALL 包含 seed 节点的全部直接关系，每条关系 SHALL 包含 `from`、`to`、`type` 字段且无重复
- **AND** `codeMap` SHALL 是以 node-id 为键、code-map 引用数组为值的对象
- **AND** `missing` SHALL 为空数组

#### Scenario: 批量查询部分节点不存在

- **WHEN** 用户执行 `openspec opsx query cap.cli.list cap.nonexistent --json`
- **AND** `cap.cli.list` 存在而 `cap.nonexistent` 不存在
- **THEN** 系统 SHALL 以退出码 0 退出
- **AND** `seeds` SHALL 仅包含 `cap.cli.list`
- **AND** `missing` SHALL 为 `["cap.nonexistent"]`
- **AND** `nodes` SHALL 包含 `cap.cli.list` 节点对象

#### Scenario: 批量查询全部节点不存在

- **WHEN** 用户执行 `openspec opsx query cap.nope1 cap.nope2 --json`
- **AND** 所有请求的 node-id 均不存在于 OPSX 文件中
- **THEN** 系统 SHALL 以非零退出码退出
- **AND** 错误信息 SHALL 包含 `not found in OPSX`
- **AND** 错误信息 SHALL 列出前 5 个可用节点 ID 作为提示

### Requirement: depth 深度展开

系统 SHALL 支持 `--depth <n>` 选项，从全部 seed 节点出发沿关系图双向 BFS 展开至多 n 跳，遍历所有关系类型，输出去重后的子图。`--depth` 默认值 SHALL 为 1，上限 SHALL 为 5。

#### Scenario: depth 2 展开二跳邻居

- **WHEN** 用户执行 `openspec opsx query cap.a --depth 2 --json`
- **AND** 存在关系 `cap.a → cap.b` 与 `cap.b → cap.c`
- **THEN** `nodes` 数组 SHALL 包含 `cap.a`、`cap.b`、`cap.c` 三个节点对象
- **AND** `relations` 数组 SHALL 包含上述两条关系
- **AND** 展开 SHALL 同时覆盖 incoming 与 outgoing 两个方向的边

#### Scenario: 展开结果去重

- **WHEN** 多个 seed 的展开路径到达同一节点或同一关系
- **THEN** `nodes` 数组中该节点 SHALL 只出现一次
- **AND** `relations` 数组中同一 `{from, to, type}` 关系 SHALL 只出现一次

#### Scenario: depth 超出上限报错

- **WHEN** 用户执行 `openspec opsx query cap.a --depth 6 --json`
- **THEN** 系统 SHALL 以非零退出码退出
- **AND** 错误信息 SHALL 说明 `--depth` 的有效范围为 1 到 5

#### Scenario: depth 为非法值报错

- **WHEN** 用户执行 `openspec opsx query cap.a --depth abc --json` 或 `--depth 0`
- **THEN** 系统 SHALL 以非零退出码退出
- **AND** 错误信息 SHALL 说明 `--depth` 必须为正整数

### Requirement: 子图输出的过滤参数作用域

系统 SHALL 使 `--relations` 与 `--code-map` 过滤参数作用于整个子图输出：`--relations` 省略 `codeMap` 字段，`--code-map` 省略 `relations` 字段，`seeds`、`nodes`、`missing` 字段 SHALL 始终保留。

#### Scenario: 子图输出使用 --relations 过滤

- **WHEN** 用户执行 `openspec opsx query cap.a cap.b --relations --json`
- **THEN** 返回 JSON SHALL 包含 `seeds`、`nodes`、`relations`、`missing` 字段
- **AND** MUST NOT 包含 `codeMap` 字段

#### Scenario: 子图输出使用 --code-map 过滤

- **WHEN** 用户执行 `openspec opsx query cap.a cap.b --code-map --json`
- **THEN** 返回 JSON SHALL 包含 `seeds`、`nodes`、`codeMap`、`missing` 字段
- **AND** MUST NOT 包含 `relations` 字段

