## ADDED Requirements

### Requirement: 三态 domain-map 建模

`readBootstrapState()` 必须将 domain-map 文件分类为 valid、missing 或 invalid，不得将 invalid 静默丢弃。

#### Scenario: 文件存在且 schema 合法
- **GIVEN** `openspec/bootstrap/domain-map/dom.auth.yaml` 存在
- **AND** 内容通过 `DomainMapFileSchema` 验证
- **WHEN** 读取 bootstrap state
- **THEN** `domainMaps` 包含 `dom.auth` 条目
- **AND** `invalidDomainMaps` 不包含 `dom.auth`

#### Scenario: 文件存在但 schema 非法
- **GIVEN** `openspec/bootstrap/domain-map/dom.auth.yaml` 存在
- **AND** 内容是合法 YAML 但不满足 `DomainMapFileSchema`
- **WHEN** 读取 bootstrap state
- **THEN** `domainMaps` 不包含 `dom.auth`
- **AND** `invalidDomainMaps` 包含 `dom.auth` 条目
- **AND** 该条目包含文件名和具体验证失败原因

#### Scenario: 文件存在但 YAML 解析失败
- **GIVEN** `openspec/bootstrap/domain-map/dom.auth.yaml` 存在
- **AND** 内容不是合法 YAML
- **WHEN** 读取 bootstrap state
- **THEN** `invalidDomainMaps` 包含 `dom.auth` 条目
- **AND** 该条目包含 YAML 解析错误信息

#### Scenario: 文件不存在
- **GIVEN** evidence 中声明了 `dom.auth`
- **AND** `openspec/bootstrap/domain-map/dom.auth.yaml` 不存在
- **WHEN** 读取 bootstrap state
- **THEN** `domainMaps` 和 `invalidDomainMaps` 均不包含 `dom.auth`
- **AND** `getBootstrapStatus()` 将该 domain 的 `mapState` 报告为 `missing`

### Requirement: Status 输出区分三态

`getBootstrapStatus()` 返回的 `DomainStatus` 必须通过 `mapState` 字段区分三种状态。

#### Scenario: Status 报告 invalid domain
- **GIVEN** `dom.auth` 的 domain-map 文件存在但 schema 非法
- **WHEN** 查询 bootstrap status
- **THEN** 对应 `DomainStatus.mapState` 为 `invalid`
- **AND** `DomainStatus.mapError` 包含失败原因
- **AND** `DomainStatus.mapped` 为 `false`

#### Scenario: Status 报告 valid domain
- **GIVEN** `dom.auth` 的 domain-map 文件存在且合法
- **WHEN** 查询 bootstrap status
- **THEN** 对应 `DomainStatus.mapState` 为 `valid`
- **AND** `DomainStatus.mapped` 为 `true`

### Requirement: Gate 对 invalid 的处理

`validateGate('map_to_review')` 必须对 invalid domain-map 报告具体错误。

#### Scenario: Gate 因 invalid domain-map 失败
- **GIVEN** `dom.auth` 的 domain-map 文件存在但 schema 非法
- **WHEN** 验证 `map_to_review` gate
- **THEN** gate 返回 `passed: false`
- **AND** errors 包含 `dom.auth` 的文件名和失败原因
- **AND** 错误信息与 "has no domain-map file" 不同

#### Scenario: Gate 因 missing 和 invalid 同时存在而失败
- **GIVEN** `dom.auth` 的 domain-map 缺失
- **AND** `dom.user` 的 domain-map 存在但 schema 非法
- **WHEN** 验证 `map_to_review` gate
- **THEN** errors 分别包含 missing 和 invalid 的诊断信息

### Requirement: Derived artifact stale 标记

当 invalid domain-map 存在时，已有 candidate/review 不得保持 `current` 状态。

#### Scenario: Invalid map 导致 candidate 降级为 stale
- **GIVEN** candidate 和 review 当前状态为 `current`
- **AND** 某个 domain-map 文件被修改为 schema 非法
- **WHEN** 重新计算 derived artifact 状态
- **THEN** `candidateState` 变为 `stale`
- **AND** `reviewState` 变为 `stale`
- **AND** candidate 和 review 文件本身不被删除

#### Scenario: 修复 invalid map 后恢复 current
- **GIVEN** candidate 和 review 状态为 `stale`（因 invalid map）
- **AND** 用户修复了 invalid domain-map 文件
- **WHEN** 执行 `openspec bootstrap validate`
- **THEN** candidate 和 review 可重新生成并恢复为 `current`
