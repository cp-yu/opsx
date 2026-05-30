# validate-opsx-dry-run Specification

## Purpose
此规约记录变更 fix-opsx-delta-artifact-and-validation 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: Validator 支持 OPSX dry-run merge 校验

`Validator` SHALL 提供 `validateOpsxDelta(changeDir)` 方法，对 `opsx-delta.yaml` 执行程序化 dry-run merge 校验。

校验流程 SHALL 为：
1. 读取 `project.opsx.yaml`，若不存在则跳过（返回 valid）
2. 读取 `opsx-delta.yaml` 并通过 `OpsxDeltaSchema.safeParse()` 解析，若不存在则跳过（返回 valid）
3. 调用 `applyOpsxDelta()` 执行 dry-run merge（捕获异常，如 MODIFIED 引用不存在的节点）
4. 调用 `validateReferentialIntegrity()` 检查合并后的 bundle
5. 调用 `validateCodeMapIntegrity()` 检查合并后的 bundle

#### Scenario: 有效的 opsx-delta 通过校验

- **GIVEN** `project.opsx.yaml` 存在且合法
- **AND** `opsx-delta.yaml` 内容合法，ADDED/MODIFIED/REMOVED 节点 ID 有效
- **WHEN** `validateOpsxDelta(changeDir)` 执行
- **THEN** 返回 `valid: true`
- **AND** `issues` 为空数组

#### Scenario: project.opsx.yaml 不存在时跳过

- **GIVEN** `openspec/project.opsx.yaml` 不存在
- **WHEN** `validateOpsxDelta(changeDir)` 执行
- **THEN** 返回 `valid: true`
- **AND** `issues` 为空数组
- **AND** SHALL NOT 抛出异常

#### Scenario: opsx-delta.yaml 不存在时跳过

- **GIVEN** `openspec/project.opsx.yaml` 存在
- **AND** change 目录下 `opsx-delta.yaml` 不存在
- **WHEN** `validateOpsxDelta(changeDir)` 执行
- **THEN** 返回 `valid: true`
- **AND** `issues` 为空数组

#### Scenario: MODIFIED 引用不存在的节点时报错

- **GIVEN** `opsx-delta.yaml` 的 MODIFIED section 包含 `{id: cap.nonexistent, intent: "..."}` 
- **AND** `cap.nonexistent` 在 `project.opsx.yaml` 中不存在
- **WHEN** `validateOpsxDelta(changeDir)` 执行
- **THEN** 返回 `valid: false`
- **AND** `issues` 中包含 ERROR 级别条目，消息包含 `OPSX dry-run merge failed`
- **AND** 消息 SHALL 指明失败原因（节点未找到）

#### Scenario: 引用完整性失败时报错

- **GIVEN** `opsx-delta.yaml` 的 ADDED relations 包含 `{from: cap.xxx, type: contains, to: dom.nonexistent}`
- **AND** `dom.nonexistent` 既不在 delta 的 ADDED 中也不在 project.opsx.yaml 中
- **WHEN** `validateOpsxDelta(changeDir)` 执行
- **THEN** 返回 `valid: false`
- **AND** `issues` 中包含 ERROR 级别条目，消息包含 `Referential integrity`

#### Scenario: code-map 完整性失败时报错

- **GIVEN** 合并后的 bundle 的 code_map 条目引用不存在的节点 ID
- **WHEN** `validateOpsxDelta(changeDir)` 执行
- **THEN** 返回 `valid: false`
- **AND** `issues` 中包含 ERROR 级别条目，消息包含 `Code-map integrity`

### Requirement: validate 命令变更路径并行执行 spec + OPSX 校验

`openspec validate --type change` 和 `openspec validate --changes` 在验证 change 时 SHALL 并行执行 `validateChangeDeltaSpecs()` 和 `validateOpsxDelta()`。

#### Scenario: 单 change 验证合并两个报告

- **WHEN** 执行 `openspec validate <change-name> --type change`
- **THEN** SHALL 同时运行 spec delta 结构校验和 OPSX dry-run merge 校验
- **AND** `valid` SHALL 为两个报告均 valid 时才为 true
- **AND** `issues` SHALL 合并两者的所有 issues

#### Scenario: 批量 change 验证包含 OPSX 校验

- **WHEN** 执行 `openspec validate --changes`
- **THEN** 每个 change SHALL 并行执行 spec + OPSX 校验
- **AND** 汇总报告 SHALL 反映所有校验结果

#### Scenario: JSON 输出兼容现有 schema

- **WHEN** 执行 `openspec validate --changes --json`
- **THEN** 输出 JSON 的 `items[].issues` 数组 SHALL 包含 OPSX 校验产生的 issues
- **AND** `items[].valid` SHALL 反映包含 OPSX 校验的合并结果
- **AND** JSON 顶层 shape（`items`, `summary`, `version`）SHALL 保持不变

