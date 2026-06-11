## ADDED Requirements

### Requirement: 规格外改动检测

Reviewer SHALL 在 Cleanliness 维度内检测 diff 中无法归因到任何 task 的规格外改动。

归因宇宙 SHALL 由以下集合的并集构成（显式列表查找，不使用模式匹配推断）：

1. 各 task `Files` 声明的条目（`Create:`/`Modify:`/`Delete:`/`Test:`，含目录条目——目录条目覆盖其下所有文件）
2. 各 Check `Command:` 涉及的测试与证据文件
3. change 工件自身（`openspec/changes/<name>/` 目录下所有文件）

Scope SHALL 限定为 `git diff <originalBranch>...HEAD` 范围内的文件；本次变更之外的历史技术债 SHALL NOT 由该检测报告。

#### Scenario: 无法归因的行为代码升级为 CRITICAL

- **WHEN** git diff 中存在归因宇宙之外的文件
- **AND** reviewer 读取该文件后判定其包含行为代码改动
- **THEN** reviewer SHALL 判定为 CRITICAL "Unaccounted change"
- **AND** recommendation SHALL 提供两种出口：补充 task/spec 呈现（artifact_fix）或移除该改动（code_fix）

#### Scenario: 机械性良性改动降级

- **WHEN** git diff 中存在归因宇宙之外的文件
- **AND** reviewer 读取后判定其为机械性良性改动（lockfile、纯生成物、纯格式化）
- **THEN** reviewer SHALL 判定为 WARNING 或 SUGGESTION（而非 CRITICAL）
- **AND** summary SHALL 注明归类理由

#### Scenario: 判定不确定时升级

- **WHEN** 某个归因宇宙之外的文件无法确定是否包含行为改动
- **THEN** reviewer SHALL 判定为 CRITICAL（维持 strict 姿态）
- **AND** SHALL 引用该文件路径与不确定原因

#### Scenario: 生成面以目录粒度归因

- **WHEN** 某 task 的 `Files` 以目录条目声明生成面（如 `Modify: .claude/skills/`）
- **AND** git diff 包含该目录下的多个再生成文件
- **THEN** 这些文件 SHALL 全部归因到该 task
- **AND** SHALL NOT 被报告为规格外改动

#### Scenario: 跨平台路径归因

- **WHEN** 归因宇宙的条目与 git diff 文件路径做匹配
- **THEN** 实现 SHALL 将两侧路径规范化为 POSIX 相对路径后比较
- **AND** Windows 反斜杠路径 SHALL 在规范化后正确归因，不产生平台相关误报

## MODIFIED Requirements

### Requirement: Cleanliness summary schema 扩展

Reviewer 输出的 summary 对象 SHALL 在 coherence 字段之后增加 cleanliness 字段，结构如下：

```json
"cleanliness": {
  "checked": true,
  "orphanedCodeFound": 0,
  "deadImportsFound": 0,
  "staleTodosFound": 0,
  "halfMigrationsFound": 0,
  "unaccountedChangesFound": 0
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
    "halfMigrationsFound": 0,
    "unaccountedChangesFound": 0
  }
  ```

#### Scenario: 无 tasks.md 时跳过 Cleanliness

- **WHEN** 变更无 tasks.md 或 tasks.md 为空
- **THEN** summary.cleanliness.checked SHALL 为 false
- **AND** orphanedCodeFound/deadImportsFound/staleTodosFound/halfMigrationsFound/unaccountedChangesFound SHALL 省略

#### Scenario: 规格外改动计入计数器

- **WHEN** reviewer 检测到 2 个规格外改动（无论严重级别）
- **THEN** summary.cleanliness.unaccountedChangesFound SHALL 为 2
