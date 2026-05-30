# opsx-delta-merge Specification

## Purpose
此规约记录变更 fix-delta-schema-validation-defects 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: MODIFIED section 执行 shallow merge

`applyOpsxDelta` 对 MODIFIED section 中的节点 SHALL 执行 shallow merge，仅更新 delta 中显式声明的字段，保留节点其余字段不变。`Validator.validateOpsxDelta()` SHALL 复用 `applyOpsxDelta()` 的 dry-run merge 语义，在 validate 阶段提前检测 MODIFIED 节点不存在、引用完整性和 code-map 完整性问题。

#### Scenario: MODIFIED capability 仅含 id 和 intent

- **GIVEN** 主 OPSX 中存在 `cap.cli.init` 节点，其 `type: capability`, `intent: "原始描述"`, `status: active`, `domain: dom.cli`
- **WHEN** delta MODIFIED section 声明 `{id: cap.cli.init, intent: "修改后的描述"}`（不含 type/status/domain）
- **THEN** apply 后 `cap.cli.init.intent` 变为 `"修改后的描述"`
- **AND** `cap.cli.init.type` 保持 `"capability"`
- **AND** `cap.cli.init.status` 保持 `"active"`
- **AND** `cap.cli.init.domain` 保持 `"dom.cli"`

#### Scenario: MODIFIED domain 仅含 id 和 boundary

- **GIVEN** 主 OPSX 中存在 domain 节点
- **WHEN** delta MODIFIED 仅声明 `{id, boundary}`
- **THEN** 仅 boundary 字段被更新
- **AND** type/intent/status 保持不变

#### Scenario: MODIFIED 显式设置字段为可选的空值

- **GIVEN** 主 OPSX 节点有 `domain: "dom.cli"`
- **WHEN** delta MODIFIED 声明 `{id: cap.xxx, domain: undefined}` 或 `{id: cap.xxx}`（不写 domain）
- **THEN** domain 字段保持原值不变（不删除）

#### Scenario: validateOpsxDelta 提前检测 MODIFIED 引用不存在

- **GIVEN** delta MODIFIED 声明 `{id: cap.nonexistent}`
- **AND** `cap.nonexistent` 在主 OPSX 中不存在
- **WHEN** `Validator.validateOpsxDelta(changeDir)` 执行
- **THEN** 返回 ERROR 级别 issue，消息包含 `OPSX dry-run merge failed`
- **AND** 不会等到 sync 阶段才发现错误

### Requirement: MODIFIED delta Schema 仅校验 id 和可变字段

Delta 的 MODIFIED section schema SHALL 仅要求 `id` 字段为必填，`intent` 和 `status` 为可选字段。`type`、`domain`、`boundary` 等标识性字段 SHALL NOT 被要求。

#### Scenario: MODIFIED 不写 type 字段通过校验

- **GIVEN** opsx-delta.yaml 的 MODIFIED section 中 capability 仅声明 `{id: cap.xxx, intent: "..."}` 不含 `type`
- **WHEN** `OpsxDeltaSchema.safeParse()` 执行
- **THEN** 校验通过（success: true）

#### Scenario: MODIFIED 不写 id 字段校验失败

- **GIVEN** opsx-delta.yaml 的 MODIFIED section 中 capability 声明不含 `id`
- **WHEN** `OpsxDeltaSchema.safeParse()` 执行
- **THEN** 校验失败，错误信息明确指出 `id` 字段缺失

### Requirement: REMOVED delta Schema 仅校验 id 字段

Delta 的 REMOVED section schema SHALL 仅要求 `id` 字段为必填。

#### Scenario: REMOVED 仅需 id 字段

- **GIVEN** opsx-delta.yaml 的 REMOVED section 中 capability 仅声明 `{id: cap.xxx}`
- **WHEN** `OpsxDeltaSchema.safeParse()` 执行
- **THEN** 校验通过
- **AND** 无需提供 type/intent/status/domain 等任何其他字段

### Requirement: ADDED section Schema 行为不变

Delta 的 ADDED section SHALL 保持现有的完整 node schema 校验要求。

#### Scenario: ADDED 缺少 type 字段校验失败

- **GIVEN** opsx-delta.yaml 的 ADDED section 中 capability 声明不含 `type`
- **WHEN** `OpsxDeltaSchema.safeParse()` 执行
- **THEN** 校验失败，错误信息明确指示所需字段

### Requirement: Zod 错误信息对缺失字段具有可诊断性

当 ADDED section 的 `type: z.literal(...)` 字段缺失时，错误信息 SHALL 明确指示字段缺失，而非产生 `expected "capability"` 的误导性输出。

#### Scenario: ADDED 缺失 type 时错误信息可诊断

- **GIVEN** opsx-delta.yaml 的 ADDED section 中 node 不含 `type` 字段
- **WHEN** `OpsxDeltaSchema.safeParse()` 执行失败
- **THEN** 错误信息 SHALL 包含"缺失"或"缺少"语义
- **AND** SHALL NOT 仅输出 `expected "capability"` 或 `expected "domain"` 的误导信息

### Requirement: Sync 命令的 Zod 校验错误以易读格式展示

`openspec sync` 在 delta 校验失败时 SHALL 以逐条、带路径的可读格式展示错误，而非输出完整 JSON dump。

#### Scenario: 校验失败时错误易读

- **GIVEN** opsx-delta.yaml 校验失败
- **WHEN** `openspec sync <change>` 执行
- **THEN** 错误输出 SHALL 包含人类可读的消息
- **AND** SHALL 指示出错的 section（ADDED/MODIFIED/REMOVED）和字段路径
- **AND** SHALL NOT 输出原始 JSON 字符串

