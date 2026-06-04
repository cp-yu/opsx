---
capabilities:
  - cap.spec.registry
---
# spec-registry Specification

## Purpose
此规约记录变更 spec-capability-awareness 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 运行时构建 cap↔spec 双向映射

系统 SHALL 提供 `buildSpecRegistry(projectRoot: string)` 函数，扫描 `openspec/specs/*/spec.md` 的 frontmatter，构建并返回包含双向映射的 registry 对象。

#### Scenario: 构建双向映射

- **WHEN** `openspec/specs/cli-archive/spec.md` 的 frontmatter 声明 `capabilities: [cap.cli.archive, cap.change-workflow.archive]`
- **THEN** registry 的 `capToSpecs` SHALL 包含 `cap.cli.archive → ["cli-archive"]` 和 `cap.change-workflow.archive → ["cli-archive"]`
- **AND** registry 的 `specToCaps` SHALL 包含 `cli-archive → ["cap.cli.archive", "cap.change-workflow.archive"]`

#### Scenario: 多个 spec 关联同一 cap

- **WHEN** `specs/cli-archive/spec.md` 和 `specs/archive-verify-gate/spec.md` 的 frontmatter 均声明 `cap.cli.archive`
- **THEN** `capToSpecs.get("cap.cli.archive")` SHALL 返回 `["archive-verify-gate", "cli-archive"]`（按字母序排列）

#### Scenario: 无 frontmatter 的 spec 被跳过

- **WHEN** `specs/legacy-cleanup/spec.md` 无 frontmatter
- **THEN** registry 的 `specToCaps` 中 SHALL NOT 包含 `legacy-cleanup`
- **AND** 该 spec SHALL NOT 出现在任何 `capToSpecs` 的值中

#### Scenario: specs 目录为空或不存在

- **WHEN** `openspec/specs/` 目录不存在或为空
- **THEN** 函数 SHALL 返回空的 `capToSpecs` 和 `specToCaps` Map
- **AND** SHALL NOT 抛出异常

### Requirement: 提供查询 API

系统 SHALL 在 registry 对象上提供四个查询方法。

#### Scenario: getSpecsForCap 查询

- **WHEN** 调用 `registry.getSpecsForCap("cap.cli.archive")`
- **THEN** SHALL 返回所有在 frontmatter 中声明该 cap 的 spec ID 数组
- **AND** 未知 cap ID SHALL 返回空数组

#### Scenario: getCapsForSpec 查询

- **WHEN** 调用 `registry.getCapsForSpec("cli-archive")`
- **THEN** SHALL 返回该 spec frontmatter 中声明的所有 cap ID 数组
- **AND** 未知 spec ID SHALL 返回空数组

#### Scenario: getOrphanedSpecs 查询

- **WHEN** 调用 `registry.getOrphanedSpecs()`
- **THEN** SHALL 返回所有无 frontmatter 或 capabilities 为空的 spec ID 数组

#### Scenario: getUncoveredCaps 查询

- **WHEN** 调用 `registry.getUncoveredCaps(allCapIds)`，传入 OPSX 中所有 cap ID
- **THEN** SHALL 返回没有任何 spec 声明关联的 cap ID 数组

### Requirement: Registry 扫描使用跨平台路径

`buildSpecRegistry` SHALL 使用 `path.join()` 构建所有文件路径，不硬编码路径分隔符。

#### Scenario: Windows 路径处理

- **WHEN** 在 Windows 平台执行 `buildSpecRegistry`
- **THEN** SHALL 使用 `path.join(projectRoot, 'openspec', 'specs')` 构建基础路径
- **AND** SHALL 正确处理反斜杠路径分隔符

