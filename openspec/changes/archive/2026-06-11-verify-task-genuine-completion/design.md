## Context

Phase 1 reviewer 的验证锚定链条是：`tasks.md` Check → `Verifies`（change-local delta spec 的 Requirement + Scenario）→ 存在性搜索。三处结构性断裂使删除/重构任务无法被认真验证：

1. `parseVerifies` 强制 ≥1 个 Scenario（`task-structure.ts`），而 REMOVED delta 条目 names-only（`validator.ts` 既定语义），删除任务结构上写不出合法 Check。
2. Reviewer 模板与 verify-change 模板全文无 REMOVED 处理；"交付物 = 代码不存在"只能被 Cleanliness 残留检测间接覆盖。
3. schema.yaml 转换规则覆盖 validation/bugfix/refactor/非运行时文本，唯独无删除规则；Files 标签只有 `Create:/Modify:/Test:`。

重构任务另有盲区：行为不变意味着 delta spec 为空，行为等价检查的 `Verifies` 无处可指（change-local-only 校验拒绝主 spec 路径）；且单靠测试证据无法区分"真重构"与"新增副本保留旧码"。

## Goals / Non-Goals

**Goals:**
- 删除、重构任务获得结构合法且可被 reviewer 判定的验证锚点
- Reviewer 能验证"task 认真完成"：声明（Files/Checks）与事实（git diff/代码现状）逐项核对
- 检测 diff 中无法归因到任何 task 的规格外改动
- 主 spec 始终只呈现 WHAT；删除/重构的证据随 change 进 archive

**Non-Goals:**
- 不改 `freshness.ts`：被删 evidence 文件 ENOENT→`skippedFiles` 不参与 hash、复活产生新 entry→fingerprint 失配→STALE，现状语义已正确
- 不改 `validator.ts` 的 REMOVED 校验（names-only、主 spec 存在性检查）
- 不改 verify-cli-gate、archive 门禁、writeback 的 unmark/Remediation 机制
- 不新增验证维度名：缺失性判定归入 Correctness，规格外检测归入 Cleanliness
- 不放宽 `Verifies` 的 change-local 路径约束

## Decisions

### D1: 删除任务锚定 REMOVED delta 条目（新语法变体）

`Verifies: \`specs/<cap>/spec.md\` / REMOVED Requirement "X"`——无 Scenario。

- 否决"锚定删除后行为"（MODIFIED/ADDED 描述删除后状态）：纯删除无行为变化时会逼出人造 requirement，把 log 伪装成 WHAT，违反 spec 内容边界。
- 否决"task 自身证据豁免 Verifies"：丢失 spec 作为事实源的可追溯性。
- REMOVED 锚点归档 sync 后从主 spec 消失，主 spec 不留删除痕迹；证据（Check/Command/Expect）随 change 进 archive。
- parser 交叉校验该 REMOVED 条目存在于 change-local delta spec（防 dangling anchor）；"REMOVED 须存在于主 spec"由 `validator.ts` 现有规则覆盖，不重复实现。

### D2: 重构等价检查用独立 `Preserves:` 字段

`Preserves: \`openspec/specs/<cap>/spec.md\` / Requirement "X" / Scenario "Y"`。

- 否决"放宽 Verifies 允许主 spec 路径"：污染主语法，parser 需按 Check 类型区分路径规则，易顺带放宽。
- 否决"豁免"：同 D1。
- 语义区分清晰：`Verifies` = 验证新行为存在，`Preserves` = 保持旧行为不变。reviewer 对两者执行不同判定模式。
- 路径放宽是字段级的：新增独立 `isValidMainSpecPath` 只服务 `Preserves` 分支，`isValidChangeSpecPath` 不动。

### D3: 等价性判定必须双支

`Preserves 判定 = 行为不变（测试证据）∧ 旧形态消失（缺失断言）`。

理由：重构没做、只新增一份新代码并保留旧代码，测试同样全绿——行为等价对"旧形态是否消失"完全不敏感，旧形态消失才是重构发生过的唯一判别性证据。新旧实现并存 = half migration → CRITICAL。

重构的隐式删除显式化为断言而非 spec 条目：旧符号是 HOW，进 specs 违反 WHAT 原则；写进 Check 的 `Expect`（点名旧符号/旧路径）与 `Command`（grep 缺失断言）正合适。文件级隐式删除（移动/合并）用 `Delete:` 标签；符号级进 `Expect`。

### D4: 规格外改动检测归入 Cleanliness（第五检测）

Cleanliness 现有哲学是"你完成了你说要完成的工作吗？"；本检测是其对偶："你做了你没说要做的工作吗？"同属 Phase 1、diff-scoped、只管本次 change，历史债务仍归 Optimizer——职责边界不需要重画。

归因宇宙 = ∪ 各 task Files 声明（含目录条目）∪ Checks Command 涉及的测试/证据文件 ∪ change 工件自身（`openspec/changes/<name>/**`）∪ Files 中以目录粒度声明的生成面。

严重级别：无法归因的文件 reviewer 必须读取后判定——行为代码 → CRITICAL；机械性良性（lockfile/纯生成物/格式化）→ WARNING/SUGGESTION；不确定 → CRITICAL（现有 strict 姿态）。选 CRITICAL 的理由：规格外行为改动破坏 review 的信任根基（夹带），且 `artifact_fix` 出口（补 task/spec 呈现）意味着合理改动的代价只是补呈现、不是被迫 revert——严格不等于苛刻。

回写路径：writeback 的 Remediation 清单追加到 `tasks.md` 末尾 `## Remediation` section，不依赖已有 checkbox，规格外发现天然适配；`writeBackPlan.taskLine` 对此类发现允许 `null`。

### D5: 输出 schema 仅 additive 扩展

`summary.cleanliness` 增加 `unaccountedChangesFound` 计数；`writeBackPlan.taskLine` 允许 `null`（仅限规格外发现）。消费方（verify-cli-gate 持久化、freshness、archive 门禁）不读取这些字段的语义，无破坏面。

### D6: `Delete:` 声明 vs git diff 核对归入 Completeness

"task 认真完成"的直接核查：不只信 checkbox，逐项核对声明与事实。`Delete:` 声明的文件须在 `git diff <originalBranch>...HEAD` 中确认已删除，否则 CRITICAL。沿用 reviewer 现有 Self-Read Protocol 的 originalBranch 解析与 diff 命令，不发明新机制。

### D7: apply 侧衔接——缺失断言 Check 走非运行时快速路径

缺失断言（grep 旧符号为空、`test ! -f`）无 red/green 形态：删除前断言必然失败不构成"有意义的 red"。划入现有非运行时快速路径语义：以 Command 输出为最终证据，双绿（等价 Check 的测试 + 缺失断言）才勾选。不修改 strict TDD 契约本身。

## Risks / Trade-offs

- [缺失断言假阴性：动态调用、字符串拼接引用、重导出别名逃过 grep] → reviewer 缺失性判定要求多角度自主搜索（符号/文件/import 路径），Cleanliness 兜底；接受静态证据的固有上限
- [旧形态推导不可靠：reviewer 从 Goal/Files/diff 推导失败导致漏判] → schema.yaml 强制等价 Check 的 Expect 点名旧形态，推导有显式输入；缺失时按"证据弱"走 CRITICAL 升级
- [Preserves 锚点漂移：主 spec 被并发 change 修改/归档导致 requirement 改名] → validate 时交叉校验点名失效锚点，不静默通过；接受为既有并发问题的同类项
- [归因宇宙假阳性：skill 再生成波及 25+ 适配器文件整批误报] → 转换规则要求生成面改动在 Files 中以目录粒度声明（如 `Modify: .claude/skills/`），parser 对目录条目已天然支持
- [模板膨胀逼近指令过载] → 三类判定共享 Locate→…→Judge 循环框架与 severity 通道，只加分派规则不加维度；内容钉死测试防后续增殖
- [Preserves 打破 Check 只锚 change-local 的纯度] → 有意选择，放宽限制在单字段最小面上

## Migration Plan

向后兼容，无迁移：现有 `Verifies` 语义零改动（仅新增变体）；旧 tasks.md 不含新字段时行为与现状一致。模板改动后运行 skill 再生成管线刷新各工具适配器。回滚 = revert 模板与 parser 改动，无持久化数据受影响。

## Open Questions

（无——explore 阶段已逐节确认）
