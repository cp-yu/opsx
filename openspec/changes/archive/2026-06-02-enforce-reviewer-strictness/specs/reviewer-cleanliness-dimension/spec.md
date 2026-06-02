## ADDED Requirements

### Requirement: Cleanliness 维度定义

Reviewer SHALL 在 Coherence 维度之后、OPSX Alignment 之前增加 Cleanliness 维度，用于检测"本次变更应清理但未清理"的遗留物。

该维度 SHALL 检测以下类型的遗留物：

1. **重构后的孤儿代码**：函数/类/导出项在重构后不再被引用
2. **过时的 TODO/FIXME 标记**：引用已完成任务的注释
3. **本次变更引入的死 import**：本次 diff 新增但未使用的 import 语句
4. **半迁移状态**：旧模式和新模式在本次变更中并存
5. **不可达代码路径**：本次变更导致的逻辑不可达代码

Scope SHALL 限定为 `git diff <originalBranch>...HEAD` 范围内的文件，SHALL NOT 检查本次变更之外的历史技术债。

#### Scenario: 检测重构后的孤儿代码

- **WHEN** tasks.md 中有已勾选的任务包含"重构"/"迁移"/"替换"关键词
- **AND** git diff 显示删除了部分旧代码
- **AND** 通过 grep 或 Read 发现旧 API 仍然存在且被导出
- **THEN** reviewer SHALL 判定为 CRITICAL "Incomplete refactor: <old-entity> still exists"
- **AND** SHALL 在 recommendation 中要求完成移除或在 tasks.md 中说明保留理由

#### Scenario: 检测过时的 TODO 标记

- **WHEN** 代码中存在 TODO/FIXME/HACK 注释
- **AND** 注释文本与 tasks.md 中已勾选任务描述匹配
- **THEN** reviewer SHALL 判定为 CRITICAL "Stale TODO for completed work"
- **AND** SHALL 引用具体文件路径和行号

#### Scenario: 检测本次变更引入的死 import

- **WHEN** git diff 显示本次新增了 import 语句
- **AND** 在同一文件中未找到该 import 的使用
- **THEN** reviewer SHALL 判定为 CRITICAL "Unused import introduced"
- **AND** recommendation SHALL 建议移除该 import 语句

#### Scenario: 检测半迁移状态

- **WHEN** tasks.md 中有已勾选的迁移任务
- **AND** git diff 显示同时引入了新 API 和保留了旧 API 的调用
- **THEN** reviewer SHALL 判定为 CRITICAL "Incomplete migration: <old-pattern> and <new-pattern> coexist"
- **AND** recommendation SHALL 建议完成迁移或拆分为分阶段任务

#### Scenario: 不可达代码降级为 WARNING

- **WHEN** 检测到本次变更引入了逻辑不可达的代码路径
- **THEN** reviewer SHALL 判定为 WARNING（而非 CRITICAL）
- **AND** recommendation SHALL 询问这是否为故意的防御性代码

#### Scenario: 未来工作 TODO 降级为 SUGGESTION

- **WHEN** TODO 注释显式引用未来工作或独立 issue（如 "TODO(GH-123): add caching"）
- **THEN** reviewer SHALL 判定为 SUGGESTION（而非 CRITICAL）
- **AND** summary SHALL 标记为 "Future work marker"

### Requirement: 工具无关的检测策略

Reviewer SHALL 采用工具无关的检测策略声明，agent 根据项目类型自主选择适配方法。

Prompt SHALL 提供可选方法库而非强制协议：

- **任务-代码交叉引用**：读取 tasks.md 提取已完成任务描述，搜索代码库查找相关制品
- **Diff 范围搜索**：使用 `git diff --name-only` 识别变更文件，然后搜索这些文件中的标记/模式
- **静态分析**（当可用且可靠时）：利用项目原生的 linter、类型检查器或死代码检测工具
- **模式匹配**：grep 旧 API 名称、TODO 关键词、import 语句，然后 Read 文件确认使用上下文
- **启发式推理**：如果任务说"移除 X"且 git diff 显示文件被修改但 X 仍在最终代码中，这是未完成工作的证据

Reviewer SHALL 优先选择轻量级方法（grep + Read）而非重型工具，除非项目明确期望使用工具（如 package.json scripts 包含 lint/typecheck 命令）。

#### Scenario: TypeScript 项目使用可用工具检测死 import

- **WHEN** 项目包含可用且可靠的 TypeScript lint/typecheck 命令
- **AND** 本次 diff 新增了 import 语句
- **THEN** reviewer MAY 使用该项目原生工具辅助检测死 import
- **AND** SHALL 仍以最终文件内容确认 import 是否被使用

### Requirement: Cleanliness summary schema 扩展

Reviewer 输出的 summary 对象 SHALL 在 coherence 字段之后增加 cleanliness 字段，结构如下：

```json
"cleanliness": {
  "checked": true,
  "orphanedCodeFound": 0,
  "deadImportsFound": 0,
  "staleTodosFound": 0,
  "halfMigrationsFound": 0
}
```

当 tasks.md 缺失或为空时，cleanliness.checked SHALL 为 false，其他计数器字段 SHALL 省略。

#### Scenario: 完整 cleanliness 检查输出

- **WHEN** reviewer 完成 Cleanliness 维度检查
- **AND** 检测到 1 个孤儿代码和 2 个过时 TODO
- **THEN** summary.cleanliness SHALL 为：
  ```json
  {
    "checked": true,
    "orphanedCodeFound": 1,
    "deadImportsFound": 0,
    "staleTodosFound": 2,
    "halfMigrationsFound": 0
  }
  ```

#### Scenario: 无 tasks.md 时跳过 Cleanliness

- **WHEN** 变更无 tasks.md 或 tasks.md 为空
- **THEN** summary.cleanliness.checked SHALL 为 false
- **AND** orphanedCodeFound/deadImportsFound/staleTodosFound/halfMigrationsFound SHALL 省略

### Requirement: Cleanliness 与 Optimizer 的职责边界

Prompt SHALL 在 Cleanliness 段落末尾显式说明该维度属于 Reviewer Phase 1 而非 Optimizer Phase 2 的理由：

- Cleanliness 检查"声称的工作是否真正完成"，这是 Completeness 问题而非 Optimization 问题
- Reviewer 问："你完成了你说要完成的工作吗？"
- Optimizer 问："这能做得更好吗？"
- 来自已勾选"迁移"任务的孤儿代码是未完成的工作，而非质量改进机会
- 本次变更 scope 之外的历史债务（如 6 个月前的 unused exports）是 Optimizer 领域——值得修复，但不 block 归档

#### Scenario: 本次变更引入的孤儿代码由 Reviewer 检测

- **WHEN** 本次 diff 包含重构任务
- **AND** 旧代码在本次变更范围内但未清理
- **THEN** Reviewer SHALL 将其判定为 CRITICAL
- **AND** SHALL block 归档直到清理或显式豁免

#### Scenario: 历史遗留的死代码由 Optimizer 检测

- **WHEN** 代码库中存在 unused exports
- **AND** 这些 exports 不在本次 git diff 范围内
- **THEN** Reviewer SHALL NOT 检测这些历史债务
- **AND** Optimizer Phase 2 MAY 提出优化建议
- **AND** 历史债务 SHALL NOT block 归档
