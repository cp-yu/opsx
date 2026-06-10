# Spec: opsx-shared-context

## Purpose

统一 explore / propose / apply 三个核心工作流对 OPSX 的加载协议，使 OPSX 成为共享一等上下文而非各模板各自为政的附加信息。
## Requirements
### Requirement: 统一加载协议

三个核心工作流模板必须在起始阶段使用同一 OPSX 共享上下文 fragment。该 fragment SHALL 仅引导整读 `openspec/project.opsx.yaml` 这一个文件，SHALL 引导 AI 读取 `project:` 块的 `intent` 和 `scope`，且 SHALL NOT 引导读取 `project.opsx.relations.yaml`、`project.opsx.code-map.yaml` 或 `openspec/specs/`。

#### Scenario: OPSX_SHARED_CONTEXT 包含 project 元数据引导

- **WHEN** 检查 `OPSX_SHARED_CONTEXT` fragment 的文本内容
- **THEN** 该 fragment SHALL 包含一条显式指引，要求读取 `project:` 块以获取项目 intent 和 scope
- **AND** 该指引 SHALL 在"domains → capabilities structure"指引之后

#### Scenario: OPSX_SHARED_CONTEXT 为单文件协议

- **WHEN** 检查 `OPSX_SHARED_CONTEXT` fragment 的文本内容
- **THEN** 该 fragment SHALL 仅引用 `openspec/project.opsx.yaml` 一个文件路径
- **AND** SHALL NOT 包含 `project.opsx.code-map.yaml`、`project.opsx.relations.yaml` 或 `openspec/specs/` 的读取指引
- **AND** SHALL 保留"导航上下文，不替代 change artifacts"的定位表述

#### Scenario: Explore 使用共享上下文

- **GIVEN** `openspec/project.opsx.yaml` 存在
- **WHEN** explore 工作流启动
- **THEN** 在探索开始前按共享协议整读 `project.opsx.yaml`
- **AND** 使用 `OPSX_SHARED_CONTEXT` fragment
- **AND** explore 模板额外保留 `OPSX_NAVIGATION_GUIDANCE` 宽视野导航（code-map 与 specs 深挖）

#### Scenario: Propose 在 artifact 生成前加载 OPSX

- **GIVEN** `openspec/project.opsx.yaml` 存在
- **WHEN** propose 工作流启动
- **THEN** skill 与 command 两个模板均在 artifact 生成循环开始前注入 `OPSX_SHARED_CONTEXT`
- **AND** 不仅限于 opsx-delta 生成阶段才读取
- **AND** OPSX 中的 domain / capability 信息用于约束 proposal 形成

#### Scenario: Apply 使用共享上下文

- **GIVEN** `openspec/project.opsx.yaml` 存在
- **WHEN** apply 工作流启动
- **THEN** skill 与 command 两个模板均在读取 change artifacts 之前注入 `OPSX_SHARED_CONTEXT`
- **AND** OPSX 作为全局边界/依赖约束模型，不仅用于定位代码文件

### Requirement: 优雅降级

当 OPSX 文件缺失或仅部分存在时，工作流 SHALL 继续执行，并仅把缺失部分视为空集合而不是报错中断。

#### Scenario: OPSX 文件不存在时不报错
- **GIVEN** `openspec/project.opsx.yaml` 不存在
- **WHEN** 任一工作流启动
- **THEN** 跳过 OPSX 加载，继续正常执行
- **AND** 不输出错误或警告

#### Scenario: 部分 OPSX 文件缺失
- **GIVEN** `project.opsx.yaml` 存在
- **AND** `project.opsx.relations.yaml` 不存在
- **WHEN** 工作流启动
- **THEN** 加载可用的 OPSX 文件
- **AND** 缺失的文件视为空集合

### Requirement: Fragment 一致性

Explore、propose 与 apply 模板 SHALL 继续引用同一个 `OPSX_SHARED_CONTEXT` 常量，以保证共享的 OPSX 读取协议不会分叉。

#### Scenario: 三个模板使用同一 fragment 常量
- **GIVEN** `OPSX_SHARED_CONTEXT` 定义在 `opsx-fragments.ts` 中
- **WHEN** 检查 explore / propose / apply 模板源码
- **THEN** 三者均引用 `OPSX_SHARED_CONTEXT`
- **AND** 加载的 OPSX 要点集合一致

### Requirement: CLI 点查询互补定位

`OPSX_CLI_QUERY_CONTEXT` fragment SHALL 将 CLI 查询表述为共享直读之后的节点细节补充接口，SHALL NOT 表述为对直读 OPSX YAML 的替代。

#### Scenario: CLI 查询 fragment 不与共享直读冲突

- **WHEN** 检查 `OPSX_CLI_QUERY_CONTEXT` fragment 的文本内容
- **THEN** SHALL NOT 包含 "instead of reading OPSX YAML files directly" 措辞
- **AND** SHALL 表述为在共享 `project.opsx.yaml` 读取之后，使用 `openspec opsx query <node-id> --json` 获取节点 relations 与 code-map 细节
- **AND** propose 与 apply 模板继续注入 `OPSX_CLI_QUERY_CONTEXT`

