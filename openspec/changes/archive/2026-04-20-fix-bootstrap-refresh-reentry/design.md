## Context

当前 bootstrap 状态机把 `openspec/bootstrap/` 的“是否存在”当作唯一入口判据：目录不存在就允许 `init`，目录存在就只能视为当前 run 仍在进行。这和现有合同已经冲突，因为：

- `promote` 成功后工作区应被保留，供审计和后续对比使用
- `formal-opsx -> refresh` 又要求后续 run 能继续把 retained workspace 作为输入约束之一
- 现有 `status` / `instructions` / workflow template 把“目录存在”解释为“继续当前 phase”，但 `promote` 后 phase 仍停在 `promote`，没有新的 re-entry 语义

这个 fix 不是重做 refresh，而是补齐 retained workspace 之后的显式 restart 入口，并为现有保留工作区建立可判定、可迁移的生命周期状态。

## Goals / Non-Goals

**Goals:**
- 为 retained bootstrap workspace 提供显式 restart 入口，避免用户只能手工删除目录才能开始下一轮 refresh
- 区分 in-progress workspace 与 completed workspace，让 `status`、`instructions` 和 `init` 能给出正确下一步
- restart 时保留旧 workspace 的审计痕迹，并用显式位置管理历史快照
- 保持跨平台路径处理一致，避免通过字符串替换或模糊匹配实现目录搬运与清理
- 为旧版本留下的 retained workspace 提供向后兼容的 completed 推断路径

**Non-Goals:**
- 不引入新的 bootstrap 顶层生命周期；仍然沿用 `init -> scan -> map -> review -> promote`
- 不在本次变更中引入新的后台状态数据库或 git tag/note 存储
- 不支持对 in-progress workspace 做强制覆盖式 restart
- 不把 restart 做成隐式自动行为；必须由显式用户意图触发

## Decisions

### D1: 使用 `openspec bootstrap init --restart` 作为显式 re-entry 入口

**选择**：保留现有 `bootstrap init` 命令面，但新增显式 `--restart` 意图。默认 `init` 语义保持简单：没有 workspace 时初始化；有 workspace 时不偷偷改成 reset。只有当用户明确传入 `--restart` 时，系统才会把 retained workspace 视为“开始新一轮 run”。

**理由**：
- 这比在 `init` 内部根据目录与 metadata 悄悄切分两套行为更清晰
- 不需要引入新的顶层子命令，减少 CLI 面膨胀
- `status` / `instructions` 可以直接把下一步写成可执行命令，避免文档和实现分叉

**备选方案**：
- 新增 `openspec bootstrap restart`：语义也清晰，但会额外扩张 CLI surface
- 继续复用裸 `init` 做隐式重入：会把目录存在与状态推断绑死，维护成本更高

### D2: 在 metadata 中写入显式 completed 标记，并为 legacy workspace 提供推断规则

**选择**：在 bootstrap metadata 中增加显式 completed 标记，例如 `completed_at`。`promote` 成功后写入；`status`、`instructions` 与 `init --restart` 依赖它判断当前 workspace 是 completed 还是 in-progress。

同时提供向后兼容推断：
- 对 legacy `refresh` workspace，若 `refresh_anchor_commit` 非空，则可视为已成功 promote
- 对 legacy 非 refresh workspace，若 metadata 仍停在 `promote` 且当前 formal OPSX 三文件已存在，则可视为已完成的 retained workspace

**理由**：
- 仅靠 `phase === 'promote'` 无法区分“已经 promote 完成”和“正准备 promote”
- 没有显式 completed 标记，`status` 和 `init` 永远只能围绕目录存在做猜测
- legacy 推断是必要的，否则旧 workspace 仍然要靠手工迁移才能进入新合同

**备选方案**：
- 继续靠 `phase` 推断：对 refresh 场景不成立，因为 promote 前后 formal OPSX 都存在
- 单纯要求用户删除旧目录：把合同缺口继续外包给人工操作

### D3: restart 前先将旧 workspace 快照到显式历史目录

**选择**：当用户执行 `openspec bootstrap init --restart` 且当前 workspace 被判定为 completed 时，系统先把现有 `openspec/bootstrap/` 整体移动到显式历史目录，再创建新的 `openspec/bootstrap/`。历史目录使用 OpenSpec 管理的固定根路径，例如 `openspec/bootstrap-history/<timestamp>/`。

**理由**：
- 这保留了 promote 后“workspace retained for audit”的合同，不会因为 restart 直接抹掉历史审计材料
- 整目录移动比按文件猜测复制更简单、更可靠
- 历史目录独立于当前 workspace，后续清理语义更清楚

**备选方案**：
- 直接原地重置 `openspec/bootstrap/`：实现更小，但会丢失上一轮审计痕迹
- 继续让用户手工 mv：流程不一致，也无法通过 CLI 给出稳定 contract

### D4: 新 run 只继承必要状态，派生产物显式重建

**选择**：restart 创建新 workspace 时，仅继承下一轮 run 真正需要的最小状态：
- mode
- 上一轮 scope（除非用户通过新的 `--scope` 显式覆盖）
- `refresh_anchor_commit`（若存在）

以下派生产物与状态必须显式清空并在后续 `validate` / `review` 中重建：
- `source_fingerprint`
- `candidate_fingerprint`
- `review_fingerprint`
- `candidate_spec_paths`
- 当前 candidate / review 产物

所有清理与重建都通过显式常量或显式文件列表完成，不使用 pattern matching 或目录通配删除。

**理由**：
- anchor 与 scope 是下一轮 refresh 的输入约束；fingerprint 与 candidate/review 只是上一轮派生缓存
- 明确区分“输入状态”和“派生状态”后，restart 语义才稳定
- 显式文件列表更符合现有跨平台与可审计约束

**备选方案**：
- 完整复制旧 workspace 再局部覆盖：会让哪些文件仍然可信变得模糊
- 全部清空不继承：会丢失 refresh 的 git anchor 和已有 scope 约束

### D5: in-progress workspace 继续保持 resume-only

**选择**：若 workspace 未完成，`init --restart` 仍然拒绝执行，并明确指向 `status` / `instructions` 的 resume 路径。这个 change 不支持对未完成 workspace 做覆盖式 restart。

**理由**：
- 未完成 workspace 通常还包含未审查的 `evidence.yaml`、`domain-map/*.yaml` 与 `review.md`，贸然重启风险太高
- 把 restart 严格限定在 completed workspace，可以避免引入二次确认、force 覆盖等额外复杂度

**备选方案**：
- 支持 `--restart --force`：短期看方便，长期会把恢复路径和破坏路径混在一起

## Risks / Trade-offs

- **[历史目录会增长]** → 先限定为显式保留，不在本次变更中自动清理；后续如有需要，再单独设计 cleanup contract
- **[legacy workspace 推断不可能 100% 无歧义]** → 以显式 `completed_at` 为主，legacy 仅做保守推断；不能可靠识别时保持失败而不是误判
- **[`init --restart` 扩张了 init 语义]** → 通过显式 flag 控制，而不是让 `init` 在默认路径上隐式切换行为
- **[目录移动涉及跨平台路径行为]** → 统一使用 Node `path` API 与显式目录常量，测试覆盖 Windows 路径与大小写/分隔符差异

## Migration Plan

1. 为 bootstrap metadata schema 增加 completed 标记与历史目录相关常量。
2. 在 `promoteBootstrap()` 成功路径写入 completed 标记；refresh 继续写入 `refresh_anchor_commit`。
3. 为 legacy retained workspace 增加 completed 推断 helper，供 `status`、`instructions` 与 `init --restart` 共用。
4. 扩展 `bootstrap init` 选项解析与文案，暴露 `--restart` 并在 completed/in-progress 两种场景给出不同反馈。
5. 实现 workspace snapshot + fresh init 流程，显式搬运旧目录到历史目录并重建新 metadata/scope。
6. 更新 workflow template、docs 与 promote template，使 restart 指引和 retained workspace 合同一致。
7. 增加 CLI / utils / integration 测试，覆盖 legacy workspace、refresh anchor 继承、scope 继承、Windows 路径与历史目录写入。

## Open Questions

- 历史目录命名应使用纯时间戳，还是同时附带 mode / baseline 信息以提升可读性。
- `--restart` 成功后是否需要在 stdout 中打印历史快照路径，还是只在 `status --json` 中暴露即可。
- 当用户在 completed workspace 上传入新的 `--scope` 时，是完全替换旧 scope，还是只替换 include 列表。
