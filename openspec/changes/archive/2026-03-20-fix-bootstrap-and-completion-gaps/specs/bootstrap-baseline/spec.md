# Spec: bootstrap-baseline

## Purpose

修复 bootstrap baseline 检测逻辑、重命名 baseline 类型、加固 specs starter 创建条件。

## Requirements

### Requirement: 空 specs 目录不应被视为已有 specs

#### Scenario: 空 openspec/specs/ 目录
- **GIVEN** 项目存在 `openspec/specs/` 目录
- **AND** 该目录为空或仅包含 README.md
- **WHEN** 执行 `detectBootstrapBaseline()`
- **THEN** 返回 `raw`
- **AND** `getAllowedBootstrapModes('raw')` 返回 `['full', 'opsx-first']`

#### Scenario: 有真实 spec 内容的 specs 目录
- **GIVEN** 项目存在 `openspec/specs/my-feature/spec.md`
- **WHEN** 执行 `detectBootstrapBaseline()`
- **THEN** 返回 `specs-based`
- **AND** `getAllowedBootstrapModes('specs-based')` 返回 `['full']`

#### Scenario: 不存在 specs 目录
- **GIVEN** 项目不存在 `openspec/specs/` 目录
- **WHEN** 执行 `detectBootstrapBaseline()`
- **THEN** 返回 `raw`

### Requirement: Baseline 类型命名为 raw 和 specs-based

#### Scenario: 枚举值
- **GIVEN** `BOOTSTRAP_BASELINE_TYPES` 常量
- **THEN** 包含 `['raw', 'specs-based', 'formal-opsx', 'invalid-partial-opsx']`
- **AND** 不包含 `'no-spec'` 或 `'specs-only'`

#### Scenario: 磁盘兼容
- **GIVEN** 已有 `.bootstrap.yaml` 文件中 `baseline_type: no-spec`
- **WHEN** 执行 `parseBootstrapMetadata()`
- **THEN** 返回 `baseline_type: 'raw'`

- **GIVEN** 已有 `.bootstrap.yaml` 文件中 `baseline_type: specs-only`
- **WHEN** 执行 `parseBootstrapMetadata()`
- **THEN** 返回 `baseline_type: 'specs-based'`

### Requirement: Full 模式在无 spec 内容时创建 starter

#### Scenario: 空 specs 目录 + full 模式 promote
- **GIVEN** bootstrap 以 `full` 模式初始化
- **AND** `openspec/specs/` 为空或不存在
- **WHEN** promote 成功
- **THEN** 创建 `openspec/specs/README.md` starter 文件
- **AND** 写入正式 OPSX 三文件

#### Scenario: 有 spec 内容 + full 模式 promote
- **GIVEN** bootstrap 以 `full` 模式初始化
- **AND** `openspec/specs/my-feature/spec.md` 已存在
- **WHEN** promote 成功
- **THEN** 不创建 starter
- **AND** 不修改已有 spec 文件

#### Scenario: opsx-first 模式 promote
- **GIVEN** bootstrap 以 `opsx-first` 模式初始化
- **WHEN** promote 成功
- **THEN** 不创建 specs starter

## PBT Properties

### Property 1: hasRealSpecContent 与 detectBootstrapBaseline 一致性
- **INVARIANT**: `hasRealSpecContent(root) === true` ⟹ `detectBootstrapBaseline(root) === 'specs-based'`（在无 formal OPSX 的前提下）
- **FALSIFICATION**: 生成随机目录结构（空目录、仅 README、有 spec.md、嵌套空目录），验证一致性

### Property 2: 磁盘兼容映射幂等
- **INVARIANT**: 对任意 baseline_type 值，`parse → serialize → parse` 结果不变
- **FALSIFICATION**: 用旧值 `no-spec`/`specs-only` 和新值 `raw`/`specs-based` 交替测试

### Property 3: getAllowedBootstrapModes 排他性
- **INVARIANT**: `raw` 返回 `['full', 'opsx-first']`，`specs-based` 返回 `['full']`，`formal-opsx`/`invalid-partial-opsx` 返回 `[]`
- **FALSIFICATION**: 遍历所有 baseline 类型，验证返回值严格匹配
