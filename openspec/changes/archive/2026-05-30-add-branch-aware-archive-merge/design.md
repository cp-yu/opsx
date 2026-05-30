## Context

Apply 阶段的 Branch Isolation Preflight 已经把每次 change 的实现工作收敛到一个独立的 feature 分支。在 cN 个 commit 之后，archive 只负责切回 originalBranch、清理 worktree，没有把改动结构化合并回主线。同时 reviewer/optimizer 仍把 `git diff` 的内容当成证据来源——这在过渡 commit 的语义下是错位的：reviewer 真正需要看的是最终磁盘内容，optimizer 真正需要看的是结构关联文件，而不是某次 commit 之间的局部 diff。

`.apply-isolation.json` 已经记录了 `method`、`branchName`、`worktreePath`、`originalBranch`，给后续步骤提供了足够的状态。`openspec/config.yaml` 走 `cap.config.project` 的 Zod schema 与 prompt projection，可以新增字段而不破坏既有 surface。

## Goals / Non-Goals

**Goals:**
- 让 reviewer 的 scope 锚定从 `git diff` 内容改为 `git diff <originalBranch>...HEAD --name-only`，判断证据基于最终文件内容
- 让 optimizer 在 reviewer 同样的 scope 锚定基础上，主动展开一层依赖关联文件，提升优化覆盖面
- 在 archive 流程末尾追加 archive commit + merge to originalBranch（默认 `--no-ff`），merge message 从 change artifacts 生成
- 在 `openspec/config.yaml` 新增 `git.merge.strategy`、`git.merge.messageFrom`、`git.branch.deleteAfterArchive` 三个字段并接入 schema 校验
- 跨平台：所有 git 命令通过 `child_process.spawn` 数组形式执行，路径走 `path.join`

**Non-Goals:**
- 不在本次 change 中新增 `/opsx:merge` 或 `/opsx:release` 等独立命令——合并行为内嵌在 archive
- 不自动解决 merge 冲突；冲突发生时由用户接管
- 不改变 `.apply-isolation.json` 的字段结构
- 不改变 Phase 1/Phase 2 的状态机，仅替换证据收集子步骤
- Optimizer 的依赖展开不超过一层

## Decisions

### Decision 1: Reviewer scope 仅取文件名，不取 diff 内容

**选择**：`git diff <originalBranch>...HEAD --name-only` 拿到本分支变更文件列表，作为候选 scope；判断仍以 `Read` 读到的最终文件内容为唯一权威依据。

**理由**：feature 分支会有 cN 个过渡 commit，`git diff HEAD~1` 之类的局部 diff 反映的是某一次中间状态而非最终态。reviewer 的 6 步协议本来就强调 "Read final file contents"——拿掉 diff 内容证据后，等于把 reviewer 推回 spec 设计的初衷。

**替代方案**：
- `git diff HEAD~N HEAD`：N 难以稳定确定（因为 commit 数量随 task 数量变化），且仍是过渡态
- 完全不看 git，仅基于 `evidenceFiles`：会丢失新增文件的发现路径

`originalBranch` 来源：优先从 `path.join(changeDir, '.apply-isolation.json').originalBranch` 读取，缺失时回退到 `git symbolic-ref refs/remotes/origin/HEAD --short` 解析出的 `origin/<default>` 的 short name。

### Decision 2: Optimizer 一层依赖展开，结果不进入 affectedFileHashes

**选择**：optimizer 在 reviewer 给出的 scope 文件之上，按以下三路扩展一层关联文件：
1. **静态导入**：从 scope 文件的 `import`/`require`/`from ... import` 解析直接依赖
2. **调用方搜索**：用 `grep -RIn "<exportedName>"` 在项目内搜索 scope 文件导出的符号被谁引用
3. **OPSX 关联**：从 `project.opsx.relations.yaml` 找 scope 文件对应节点的 `depends_on` / `relates_to` 一跳邻居

扩展后的文件仅作为"读取候选"用于理解优化机会；当 optimizer 真正提出 Search/Replace 时，仅 scope 内文件可作为 patch 目标，且只有 scope 内文件参与 `affectedFileHashes` 计算。

**理由**：
- 一层够用：抓住直接依赖与直接调用方就能看到大部分跨文件重复模式（共享验证、错误处理、类型定义）
- 两层会引入指数级噪音，且 optimizer 已被要求不修改 scope 外文件
- 不进入 `affectedFileHashes` 是为了保持 Phase 2 状态机不变——hash 范围扩大会影响 freshness 判定
- Search/Replace 仍只能落在 scope 内文件，与"仅优化已有跟踪文件"硬约束一致

**替代方案**：
- 两层扩展：被否决，噪音收益比差
- 全项目扫描：被否决，与 evidence-driven 原则冲突
- 由 reviewer 一并扩展：被否决，reviewer 的判断维度（completeness/correctness/coherence）不需要更广的关联文件

### Decision 3: Archive 末尾追加三步——archive commit、merge、cleanup

**选择**：现有 archive 流程在第 7 步之后追加：

```
Step 7  archive commit on feature branch
        message: "docs(<change-name>): 归档变更制品"
        body: 列出 sync 写入、移动到 archive 的目录、verify 状态

Step 8  switch to originalBranch && git merge <strategy> <feature> -F -
        message: 由 git-commit-reasons 模板生成
        subject: "<type>(<scope>): <从 proposal 提取的中文标题>"
        body:    ## Why  + ## Changes

Step 9  if git.branch.deleteAfterArchive: git branch -d <feature>
        worktree 清理仍按现有 .apply-isolation.json 流程，征求用户同意
```

**理由**：
- archive commit 在 feature 分支上，记录"sync 与归档制品"这件事本身——message 偏 docs 风格，对未来读者有用
- merge commit 在 originalBranch 上，是"这次 change 的语义入口"——message 必须能脱离仓库其他上下文独立读懂，套 git-commit-reasons 模板
- branch 清理放最后，并由 config 控制，避免误删；冲突或失败时不删

**替代方案**：
- 直接 fast-forward：丢失"一次 change 是一个整体"的语义，no-ff 显式保留分支拓扑
- squash：丢失 feature 分支上的细粒度 commit 历史，不符合 apply 阶段 cN commit 的设计意图
- 由 user 手动 merge：与 archive 已经做了 sync/move 的副作用形成不一致状态

### Decision 4: Merge message 生成器从 artifacts 提取

**选择**：在归档时读取 `archive/YYYY-MM-DD-<name>/` 下的 `proposal.md`、`design.md`、`tasks.md`，生成 git-commit-reasons 风格 message：

| message 段位 | 来源 |
|---|---|
| `type` | 从 `proposal.md` 的 `## What Changes` 关键动词推断（"添加/新增"→`feat`，"修复"→`fix`，"重构"→`refactor`，"删除"→`refactor`，缺省 `chore`） |
| `scope` | OPSX 域映射：从 `opsx-delta.yaml` 的 ADDED/MODIFIED capabilities 抽取主导 domain，回退到 change name 第一段 |
| 中文标题 | `proposal.md` 第一段非空 prose 句子（`## Why` 内容）截断到 50 字符内 |
| `## Why` | `## Why` 段前两条要点映射到 `[业务背景]`/`[问题描述]`；`design.md` 的 `## Decisions` 首条映射到 `[技术决策]` |
| `## Changes` | `tasks.md` 中已勾选的 `### Task N:` 各取一行，格式 `` - `<task-name>`: <Goal 一句话>`` |

生成器 MUST 通过 `git commit -F -` heredoc 传入 message，避免反引号、括号、`$` 被 shell 提前展开。

**替代方案**：
- 完全 manual message：被否决，与 messageFrom: artifacts 的目标矛盾
- 直接 dump proposal.md 全文：太长，与 git log 阅读体验冲突
- 借助 LLM 二次润色：被否决，本 change 不引入运行时 LLM 调用

`messageFrom: manual` 模式作为兜底：当用户希望手写 merge message 时，跳过生成器，由 archive 流程把生成的草稿写到 `path.join(changeDir, '.merge-message.draft')` 让用户编辑后再 merge。

### Decision 5: 配置节点结构与默认值

**选择**：在 `openspec/config.yaml` 顶层新增 `git` 节点：

```yaml
git:
  merge:
    strategy: no-ff        # no-ff | ff-only | squash
    messageFrom: artifacts # artifacts | manual
  branch:
    deleteAfterArchive: false
```

配置加载走 `cap.config.project` 的 Zod schema：用 `z.enum` 锁定枚举值，缺失时填充默认值（`no-ff` / `artifacts` / `false`）。配置经过 prompt projection 投出 `git` 段后被 archive skill 消费，archive skill 不再直接读 raw YAML 键。

**理由**：
- 默认 `no-ff`：保留 feature 分支拓扑，是本次 change 的设计默认值
- 默认 `messageFrom: artifacts`：实现 docs 化合并的核心目标
- 默认 `deleteAfterArchive: false`：保守——首次启用本特性的项目里，feature 分支保留更安全

## Risks / Trade-offs

- **Risk**: `originalBranch` 字段缺失（旧的 `.apply-isolation.json` 没记录） → **Mitigation**: 回退路径为 `git symbolic-ref refs/remotes/origin/HEAD`，再缺失则提示用户输入并写回 isolation 文件
- **Risk**: merge 冲突中断 archive → **Mitigation**: 冲突时 `git merge --abort`，保留 feature 分支上已完成的 sync/move/archive commit；archive skill 输出"merge 已 abort，请手动解决冲突后重跑 archive"，archive 自身幂等（已归档目录可被检测）
- **Risk**: `git diff <originalBranch>...HEAD --name-only` 在 detached HEAD / shallow clone 上失败 → **Mitigation**: 命令失败时回退到 `git ls-files --modified --others --exclude-standard` + `verificationContext.evidenceFiles` 联合，并以 WARNING 形式上报
- **Risk**: optimizer 一层依赖展开抓到大量第三方源（如 `node_modules` 内的 ts 源映射） → **Mitigation**: 展开时通过 `path.relative(projectRoot, ...)` 过滤掉以 `..` 开头的路径与项目内已知忽略目录（`node_modules`、`dist`、`build`、`.git`），列表来自 `gitignore` 解析复用而非新写匹配规则
- **Risk**: Windows 上 `child_process.spawn` 默认不解释 shell quoting → **Mitigation**: 全程使用 `spawn(file, args, opts)` 数组形式；message 通过 stdin 而非 `-m "..."` 传入
- **Risk**: change name 含 `/`（feature/x）导致分支名无法直接复用 → **Mitigation**: 复用 `cap.apply.branch-isolation` 已有的 `/` → `-` 规范化逻辑，archive 也走同一规范化函数
- **Risk**: `.apply-isolation.json` 在 archive move 之后才被读取，路径需基于归档后位置 → **Mitigation**: 现有 archive skill 已经先 mv 后读，路径用 `path.join(archiveDir, '.apply-isolation.json')` 即可
- **Risk**: `git.branch.deleteAfterArchive: true` 误删未推送分支 → **Mitigation**: 仅在 merge 成功且 `git.merge.strategy != ff-only` 时执行；删除前 `git branch --merged <originalBranch>` 校验

## Migration Plan

- 配置向后兼容：`openspec/config.yaml` 不存在 `git` 节点时填默认值，所有既有项目无需立即修改 config
- archive skill 行为向后兼容：当 `.apply-isolation.json` 缺失或 `originalBranch` 为空时，先按远程默认分支和用户输入回退解析；仍无法解析时才跳过 merge 与 cleanup
- reviewer/optimizer 行为变更直接生效，但通过软回退处理旧仓库（见 Risks 第三条）

## Open Questions

- merge 之后是否需要在 originalBranch 上自动 `git push`？当前倾向不自动推，由用户在 git 工作流外完成；待确认是否新增 `git.push.afterMerge` 配置项
- archive commit 的 message 是否也走 git-commit-reasons 模板？当前倾向只走 docs 风格固定模板，避免和 merge message 重复
