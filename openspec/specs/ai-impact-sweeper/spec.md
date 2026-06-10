# ai-impact-sweeper Specification

## Purpose
此规约记录变更 unify-cli-query-interface 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: Evidence Protocol 使用 CLI 查询接口

Impact sweeper SHALL 通过 OpenSpec CLI 查询 OPSX 数据和 cap→spec 映射，MUST NOT 直接读取 YAML 文件。在读取 specs 时，SHALL 同时执行术语提取步骤，用于检测术语漂移。

#### Scenario: 批量查询 OPSX 节点信息

- **WHEN** sweeper 需要获取 OPSX 节点信息、关系或 code-map 引用
- **THEN** SHALL 将全部 plausible node IDs 通过单次 `openspec opsx query <node-id...> --json` 批量调用获取数据
- **AND** 需要二跳展开时 SHALL 使用 `--depth 2` 参数，MUST NOT 通过逐节点连环查询模拟多跳展开
- **AND** SHALL 使用返回的 `nodes`、`relations`、`codeMap`、`missing` 字段作为证据
- **AND** MUST NOT 直接读取 `openspec/project.opsx.yaml`、`openspec/project.opsx.relations.yaml` 或 `openspec/project.opsx.code-map.yaml`

#### Scenario: 查询 cap→spec 映射

- **WHEN** sweeper 需要构建 cap→spec 映射
- **THEN** SHALL 执行 `openspec list --specs --json` 获取所有 specs 及其 capabilities 字段
- **AND** SHALL 从返回的 JSON 数组中提取每个 spec 的 `capabilities` 字段
- **AND** MUST NOT 直接扫描 `openspec/specs/*/spec.md` 的 YAML frontmatter

#### Scenario: OPSX 文件不存在时的处理

- **WHEN** 执行 `openspec opsx query` 返回错误（OPSX 文件不存在）
- **THEN** sweeper SHALL 在报告的 `coverageGaps` 中记录 "OPSX files not found"
- **AND** SHALL 在报告的 `questions` 中添加关于是否需要运行 bootstrap 的问题
- **AND** MAY 降级到基于 git ls-files 的文件系统搜索

#### Scenario: 读取 specs 时执行术语提取

- **WHEN** sweeper 读取 `mustCheck` specs 以评估影响面
- **AND** 用户通过 `concept` 参数提供了输入术语
- **THEN** SHALL 在读取每个 spec 时提取与 `concept` 语义相近的术语
- **AND** SHALL 统计每个术语的出现次数和分布 specs
- **AND** SHALL 将结果汇总到 JSON 报告的 `terminologyObservations` 字段

