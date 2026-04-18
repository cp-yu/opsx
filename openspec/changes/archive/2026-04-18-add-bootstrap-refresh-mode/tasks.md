## 1. Baseline 与 refresh mode 合同

- [x] 1.1 扩展 bootstrap baseline / mode 类型与 metadata schema，使 `formal-opsx` 仅允许 `refresh`，`invalid-partial-opsx` 继续拒绝
- [x] 1.2 更新 `src/commands/bootstrap.ts` 的 pre-init `status`、`instructions`、`init` 帮助与错误文案，暴露 `openspec bootstrap init --mode refresh`
- [x] 1.3 调整 bootstrap workflow 模板和文档，使 `refresh` 被描述为 formal OPSX 的增量模式，而不是伪命令或旧式 flag

## 2. Git-aware 增量扫描与路径映射

- [x] 2.1 在 bootstrap state/metadata 中记录 refresh 锚点提交，并定义 git 不可用时的空值与回退语义
- [x] 2.2 实现从锚点提交到当前工作树的 changed paths 收集，覆盖 committed、staged、unstaged 和 untracked 文件
- [x] 2.3 实现基于 `project.opsx.code-map.yaml` 的路径到节点映射与直接邻居扩展，使用 `path.resolve()` / `path.normalize()` 保证跨平台一致性
- [x] 2.4 当锚点缺失、不可达或路径无法可信映射时，回退到全量扫描并保留 formal OPSX/specs/bootstrap 工作区作为输入约束

## 3. Refresh candidate、review 与 promote

- [x] 3.1 为 refresh 组装 delta-first candidate 结果，明确 ADDED / MODIFIED / REMOVED 节点、关系与受影响 specs
- [x] 3.2 调整 review 生成与 stale 判定，使 refresh 只审核相对当前 formal OPSX 的增量变化
- [x] 3.3 在 `promoteBootstrap()` 中为 `refresh` mode 复用现有 OPSX delta merge 语义，替换整包 `copyFile()` 覆盖路径
- [x] 3.4 实现 refresh 的 formal spec 写回规则：保留已有、补充缺失、冲突失败，并在失败时阻断所有 formal 写入

## 4. 命令面、模板与规约对齐

- [x] 4.1 更新 `openspec/specs/bootstrap/spec.md`、`openspec/specs/bootstrap-baseline/spec.md` 与新增 `bootstrap-refresh-mode` 能力对应实现语义
- [x] 4.2 更新 `docs/opsx-bootstrap.md`、bootstrap workflow template 与相关 schema/template 文本，使 refresh 合同与 CLI 行为一致
- [x] 4.3 为 refresh 产物使用显式文件名/常量追踪，避免通过模糊匹配清理或重建工作区文件

## 5. 测试与回归覆盖

- [x] 5.1 为 `formal-opsx -> refresh` 添加 CLI/integration 测试，覆盖 pre-init status、instructions、init、validate、promote 主路径
- [x] 5.2 添加 git 可用场景测试，验证锚点记录、diff 收敛与 delta review 输出
- [x] 5.3 添加 git 不可用或锚点不可达场景测试，验证全量扫描回退与零崩溃行为
- [x] 5.4 添加 refresh promote 的冲突/失败测试，验证 formal OPSX 与 formal specs 在失败时保持零写入
- [x] 5.5 添加 Windows 路径处理与 CI 验证任务，确保 code-map 路径映射在不同分隔符与大小写条件下稳定工作
