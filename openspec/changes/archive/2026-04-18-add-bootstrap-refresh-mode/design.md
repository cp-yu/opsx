## Context

当前 bootstrap 的设计假设是“给还没有 formal OPSX 的仓库做第一次建模”，因此 `detectBootstrapBaseline()` 一旦识别到 `formal-opsx` 就直接拒绝进入工作流。这一合同对首次建模是安全的，但对团队协作并不够用：很多团队在第一次 bootstrap 之后，仍然会通过普通编码、直接改代码或手工维护规约继续演进系统，而不是每次都通过 OpenSpec change 驱动。

现有实现里，bootstrap 已经具备一些增量基础设施，例如 `source_fingerprint`、`candidate_fingerprint` 与 `review_fingerprint`，说明系统已经接受“输入变化会让 review 失效”的模型。但 `promoteBootstrap()` 仍然通过 `copyFile()` 直接把 candidate 三文件覆盖到 formal 位置，这对已有 formal OPSX 项目是危险的，因为它会把人工维护的节点、关系和 project 元数据一并抹掉。

本次设计需要在不拆掉现有五阶段生命周期的前提下，引入一条适用于 `formal-opsx` 仓库的安全增量路径，并保持 macOS / Linux / Windows 的路径处理一致。

## Goals / Non-Goals

**Goals:**
- 为 `formal-opsx` baseline 引入显式 `refresh` mode，并继续沿用 `init → scan → map → review → promote` 生命周期。
- 让 refresh 在 git 可用时利用锚点提交和 diff 缩小扫描范围，在 git 不可用时稳定回退到全量扫描。
- 让 refresh review 只聚焦相对当前 formal OPSX 的增量变化，而不是重新审核整份系统模型。
- 让 refresh promote 使用 merge/delta 更新 formal OPSX，并对 formal specs 执行“保留已有、补充缺失、冲突失败”的显式规则。
- 保持 `invalid-partial-opsx` baseline 继续拒绝，避免把损坏状态带入 refresh 工作流。

**Non-Goals:**
- 不把 refresh 做成新的顶层命令；用户入口仍然是 `openspec bootstrap ...`。
- 不把 git diff 当作事实来源；formal OPSX 仍然是 refresh 的基线真相。
- 不为 refresh 引入自动 rename 推断或自动删除策略。
- 不支持对 `invalid-partial-opsx` 仓库做“边修边 refresh”。
- 不在本次变更中引入新的外部依赖或后台状态数据库。

## Decisions

### D1: 用显式 `refresh` mode 扩展现有 baseline/mode 合同

**选择**：保留现有 baseline 检测流程，但将 `formal-opsx` 从“完全拒绝”改为“仅允许 `refresh` mode”，而 `invalid-partial-opsx` 继续返回空 mode 集合。

**理由**：
- 这保留了 bootstrap 的单一心智模型：所有升级仍走同一条五阶段工作流。
- 把 `refresh` 建模为 mode，而不是独立命令，可以复用现有 status / instructions / validate / promote 命令面。
- `invalid-partial-opsx` 继续拒绝可以避免在损坏输入上叠加更多隐式修复逻辑。

**备选方案**：
- 新增 `openspec opsx refresh` 顶层命令：语义更显式，但会复制 bootstrap 的状态与模板逻辑，制造第二套生命周期。
- 直接放宽 `formal-opsx` 对 `full` 的限制：实现看似更小，但会把首次建模与增量维护混成一条危险路径。

### D2: refresh 的源数据分层必须明确

**选择**：refresh 组装 candidate 时按以下优先级消费输入：
1. 当前 formal OPSX 三文件
2. 当前 `openspec/specs/`
3. 保留的 `openspec/bootstrap/` 工作区
4. git diff 结果（仅用于缩小扫描范围）

**理由**：
- formal OPSX 才是 refresh 的基线，不应被 git diff 或一次扫描结果覆盖。
- specs 与 bootstrap 工作区提供人工补充语义，可帮助决定哪些节点是现有约束、哪些需要重新审查。
- git diff 只能回答“哪些文件可能变了”，不能可靠回答“节点是否应删除或重命名”。

**备选方案**：
- 只看 git diff 并从改动文件重建 delta：容易漏掉跨文件影响，也无法保护已有人工修订。
- 每次 refresh 都全量扫描且忽略历史工作区：简单但浪费已有上下文，也削弱 review 的可读性。

### D3: 在 bootstrap metadata 中显式记录 refresh 锚点

**选择**：为 bootstrap metadata 增加 refresh 专用字段，例如 `refresh_anchor_commit` 与最近一次成功 promote 的策略信息；只有在 git work tree 中才写入该锚点。

**理由**：
- refresh 要可重复，必须知道“上一次正式基线对应哪个提交”。
- 把锚点写进 bootstrap metadata 比临时查找 git tag、notes 或 commit message 更简单、更可控。
- git 不可用时字段为空即可，不需要额外状态迁移。

**备选方案**：
- 使用 git tag 或 notes 保存锚点：对用户仓库侵入更强，也增加权限与命名冲突问题。
- 仅通过当前工作区 fingerprint 推导锚点：无法关联到 git 历史，做不了稳定 diff。

### D4: 增量扫描只缩小范围，不直接决定删除

**选择**：当 `refresh_anchor_commit` 可用时，scan 阶段收集 `anchor..HEAD`、staged、unstaged 和 untracked 路径，并用 `project.opsx.code-map.yaml` 将路径映射到已有节点；只重扫这些节点及其直接关系邻居。任何删除动作都必须由 review 中明确出现的 REMOVED delta 驱动。

**理由**：
- 这是能明显减少扫描工作量的最小安全做法。
- “直接邻居”可以覆盖常见的 relation 连锁变化，又不会把系统重新扫一遍。
- 显式 review 决定删除，能防止因为 code-map 不完整或路径变更而静默删节点。

**备选方案**：
- 只扫描命中的节点，不带邻居：容易漏掉 relation 变化。
- 根据 git diff 自动生成 REMOVED：风险太高，尤其在文件移动、重命名和 Windows 路径差异下。

### D5: refresh review 产物采用 delta-first 结构

**选择**：保留 `review.md` 作为人类审核面，但内容从“整包 candidate 摘要”调整为“当前 formal OPSX 基线 + 本次 ADDED / MODIFIED / REMOVED 摘要 + 受影响 specs 列表”。如果生成新的派生产物，则通过显式常量命名管理，而不是依赖通配匹配。

**理由**：
- refresh 用户真正需要确认的是“系统相对上次基线发生了什么变化”。
- review 仍然需要和 `review_fingerprint` 绑定，输入一变就 stale。
- 显式文件名常量有助于避免清理与重建时误删其他工作区文件。

**备选方案**：
- 继续使用现有 review 结构：信息量太大，用户难以识别本次变更边界。
- 用结构化 JSON 取代 `review.md`：机器友好，但失去 agent / 用户当前已经适应的审核面。

### D6: refresh promote 必须走 merge，而不是 copy

**选择**：`promoteBootstrap()` 在 `refresh` mode 下不再执行 candidate 三文件整包拷贝，而是将 review 批准后的 delta 应用到当前 formal bundle 上。实现上优先复用现有 `applyOpsxDelta()` 及其 dry-run 校验语义。

**理由**：
- 现有 `copyFile(candidate, formal)` 的 promote 方式只适合首次 bootstrap，不适合已有人工维护的 formal OPSX。
- 仓库里已经有 `applyOpsxDelta()` 和 change sync 的干运行语义，复用它们可以减少重复逻辑。
- merge 后再做 referential integrity / code-map integrity 校验，能保持和现有 OPSX 合同一致。

**备选方案**：
- 新写一套 refresh 专属 merge 逻辑：重复、脆弱、难维护。
- 仍然写 candidate 全量 bundle，再用 diff 工具比较后覆盖：本质还是整包替换，风险没降下来。

### D7: refresh 对 specs 的写入规则必须保守

**选择**：refresh promote 对 specs 执行三条显式规则：
- 已有 formal spec 保留
- 新增 capability 且目标路径缺失时才补写 formal spec
- 目标路径冲突时失败，不做隐式 merge 或删除

**理由**：
- formal specs 往往有人为编辑痕迹，自动 merge 很容易把 requirement block 搅乱。
- 和 `specs-based + full` 的既有保守合同一致，用户更容易理解。
- 失败早于正式写入，可以保持 OPSX 与 spec 状态一致。

**备选方案**：
- 自动把 candidate spec 与 formal spec 做文本 merge：太脆弱，也不符合 spec-driven 的显式变更原则。

### D8: 路径映射必须显式做跨平台规范化

**选择**：refresh 在将 git diff 路径映射到 code-map refs 时，统一走 `path.resolve()` / `path.normalize()` 之类的 Node 路径 API，并在比较前做仓库根目录下的相对路径归一化，不用手写字符串替换。

**理由**：
- Windows 的分隔符、大小写和盘符语义与 Unix 不同。
- 现有仓库配置已经明确要求路径相关行为必须跨平台可测。
- 这类行为最适合收敛到显式 helper，而不是散落在 scan 逻辑里做字符串匹配。

**备选方案**：
- 直接比较原始 git diff 字符串和 POSIX refs：在 Windows 上必然脆弱。

## Risks / Trade-offs

- **[git 锚点与实际语义不完全一致]** → diff 只作为缩小扫描范围的提示，formal OPSX 仍是 source of truth，无法可靠使用 git 时直接回退全量扫描。
- **[refresh review 仍可能过大]** → 通过“仅展示 delta + 受影响节点/关系/规格”压缩信息密度，避免重复完整 candidate。
- **[merge 逻辑与首次 bootstrap promote 产生分叉]** → 将 refresh 的 merge 实现尽量复用现有 `applyOpsxDelta()` 与 change sync 干运行路径，避免复制第二套语义。
- **[spec 冲突会让 promote 更常失败]** → 这是有意的保守失败；显式冲突比静默覆盖更安全。
- **[保留 bootstrap 工作区会增加状态文件复杂度]** → 工作区本来就保留，refresh 只是在此基础上增加锚点与 delta 产物管理，不引入额外清理义务。

## Migration Plan

1. 扩展 baseline/mode 类型与 CLI 帮助，使 `formal-opsx -> refresh` 成为受支持路径。
2. 扩展 bootstrap metadata schema，允许记录 refresh 锚点与相关派生产物状态。
3. 在 scan/validate 期间加入 git-aware 路径收集与 code-map 路径映射 helper，并保留全量扫描回退路径。
4. 调整 review 生成逻辑，使 refresh 输出 delta-first 审核内容。
5. 调整 promote 逻辑：`full` / `opsx-first` 继续走现有首次写入语义，`refresh` 改为 merge-based promote。
6. 补充 CLI、integration 与 Windows 路径测试；确认 git 不可用时的回退路径稳定。
7. 如发现 refresh promote 结果异常，可直接删除工作区重新执行 refresh，formal OPSX 因为使用 dry-run + merge 前校验不会被半写入；必要时可通过 git 恢复到锚点提交状态。

## Open Questions

- refresh review 是否需要单独产出结构化 delta 文件，还是只在 `review.md` 中展示 delta 摘要即可。
- refresh 生成的新 capability spec 是否需要单独的 candidate 目录命名，以避免与首次 bootstrap candidate spec 混淆。
- 当 code-map 覆盖不足导致“变更路径无法映射到节点”时，是默认升级为全量扫描，还是在 review 中显式标记“未能精确定位”。
