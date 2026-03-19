## ADDED Requirements

### Requirement: 统一加载协议

三个核心工作流模板必须在起始阶段使用同一 OPSX 共享上下文 fragment。

#### Scenario: Explore 使用共享上下文
- **GIVEN** `openspec/project.opsx.yaml` 存在
- **WHEN** explore 工作流启动
- **THEN** 在探索开始前加载 OPSX 三件套（project / relations / code-map）
- **AND** 使用 `OPSX_SHARED_CONTEXT` fragment

#### Scenario: Propose 在 artifact 生成前加载 OPSX
- **GIVEN** `openspec/project.opsx.yaml` 存在
- **WHEN** propose 工作流启动
- **THEN** 在 artifact 生成循环开始前即加载 OPSX
- **AND** 不仅限于 opsx-delta 生成阶段才读取
- **AND** OPSX 中的 domain / capability / relation 信息用于约束 proposal 形成

#### Scenario: Apply 使用共享上下文
- **GIVEN** `openspec/project.opsx.yaml` 存在
- **WHEN** apply 工作流启动
- **THEN** 在读取 change artifacts 之前加载 OPSX
- **AND** 使用 `OPSX_SHARED_CONTEXT` fragment
- **AND** OPSX 作为全局边界/依赖约束模型，不仅用于定位代码文件

### Requirement: 优雅降级

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

#### Scenario: 三个模板使用同一 fragment 常量
- **GIVEN** `OPSX_SHARED_CONTEXT` 定义在 `opsx-fragments.ts` 中
- **WHEN** 检查 explore / propose / apply 模板源码
- **THEN** 三者均引用 `OPSX_SHARED_CONTEXT`
- **AND** 加载的 OPSX 要点集合一致
