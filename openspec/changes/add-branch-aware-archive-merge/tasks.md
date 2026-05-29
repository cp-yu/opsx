## 1. Implementation Tasks

### Task 1: 加载并校验 git 配置节点

**Goal**: 在项目配置加载链路中加入 `git` 顶层节点，含 `merge.strategy`、`merge.messageFrom`、`branch.deleteAfterArchive` 三个字段，缺失时填默认值，非法值降级并 warning。

**Files**:
- Modify: `src/core/config-schema.ts`
- Modify: `src/core/project-config.ts`
- Modify: `src/core/config-projection.ts`
- Test: `test/core/config-schema.test.ts`
- Test: `test/core/project-config.test.ts`

**Requirements**:
- 新增 Zod schema 节点 `git: { merge: { strategy: enum, messageFrom: enum }, branch: { deleteAfterArchive: boolean } }`，使用 `z.enum(['no-ff','ff-only','squash'])` 与 `z.enum(['artifacts','manual'])`
- 字段缺失时填默认值 `no-ff` / `artifacts` / `false`，不输出警告
- 非法 value 走与 `optimization` 相同的 field-by-field warning 路径，回退默认值并保留其他合法字段
- 把 `git` 节点暴露给 `config-projection` 作为 normalized projection 输入，archive surface 投影时渲染 `git` 段
- 路径与文件读写复用现有 `path.join` / `fs.readFile` 链路，不引入新跨平台逻辑

#### Checks

- [x] C1 git 节点完整字段被加载与暴露
  - Verifies: `specs/config-loading/spec.md` / Requirement "加载 git 配置节点" / Scenario "完整 git 节点"
  - Command: `pnpm test -- project-config`
  - Expect: 加载完整 `git` 节点的测试通过

- [x] C2 git 节点缺失时填默认值
  - Verifies: `specs/config-loading/spec.md` / Requirement "加载 git 配置节点" / Scenario "git 节点缺失时填默认值"
  - Command: `pnpm test -- project-config`
  - Expect: 默认值填充测试通过

- [x] C3 schema 拒绝非法值并回退
  - Verifies: `specs/config-loading/spec.md` / Requirement "git 配置字段 Zod schema 校验" / Scenario "merge.strategy 非法值"
  - Command: `pnpm test -- config-schema`
  - Expect: 非法值降级测试通过且警告被断言

- [x] C4 projection 输入暴露 git 段
  - Verifies: `specs/config-loading/spec.md` / Requirement "git 配置暴露给 projection 消费者" / Scenario "projection 输入包含 git 节点"
  - Command: `pnpm test -- config-projection`
  - Expect: projection 输入断言包含 git 三字段

- [x] C5 Windows 路径加载行为一致
  - Verifies: `specs/config-loading/spec.md` / Requirement "跨平台路径与默认值" / Scenario "Windows 上读取 git 节点"
  - Command: `pnpm test -- project-config`
  - Expect: 用 `path.join` 构造的路径在断言中保持稳定

### Task 2: Reviewer skill scope 锚定改造

**Goal**: 把 reviewer skill 的 Self-Read 协议中 `git diff` 内容级命令替换为 `git diff <originalBranch>...HEAD --name-only`，强制以 Read 到的最终文件内容作为唯一权威证据。

**Files**:
- Modify: `.claude/skills/openspec-reviewer/SKILL.md`
- Modify: `.codex/skills/openspec-reviewer/SKILL.md`
- Modify: 模板源文件（generator 入口，结合 `cap.ai.skill-generation`）
- Test: `test/skills/reviewer-skill-content.test.ts`

**Requirements**:
- Self-Read Step 4 改为：先解析 `originalBranch`（`.apply-isolation.json` → `git symbolic-ref refs/remotes/origin/HEAD --short` → 用户提示），再执行 `git diff <originalBranch>...HEAD --name-only` 仅取文件列表
- 删除把 `git diff`、`git log -5 --oneline` 当成判断证据的描述；保留 `git status` 与 `git log` 仅作为 scope 辅助
- 6 步协议中 Step 1 (Locate) 改为基于 name-only 输出而非 diff 内容
- 增加 originalBranch 解析回退的 Scenario 描述
- 输出契约保持不变（result/issues/writeBackPlan 字段不动）

#### Checks

- [x] C1 SKILL.md 移除 diff 内容证据来源
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "Reviewer 输入合约" / Scenario "不依赖 diff 内容判断行为"
  - Command: `pnpm test -- reviewer-skill-content`
  - Expect: 断言 SKILL.md 内不出现 `git diff` 后跟非 `--name-only` 的 token

- [x] C2 originalBranch 解析顺序文档化
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "Reviewer 输入合约" / Scenario "originalBranch 不可解析时降级"
  - Command: `pnpm test -- reviewer-skill-content`
  - Expect: 断言三级回退链全部存在

- [x] C3 .codex 与 .claude 副本一致
  - Verifies: `specs/openspec-reviewer-skill/spec.md` / Requirement "Reviewer 输入合约" / Scenario "所有定位信息完整传入"
  - Command: `pnpm test -- reviewer-skill-content`
  - Expect: 两份 SKILL.md 的 Self-Read 段语义等价（按 normalize 后比对）

### Task 3: Optimizer skill 一层依赖展开协议

**Goal**: 把 optimizer skill 改造为：scope 锚定与 reviewer 一致；新增"一层依赖展开"协议覆盖 imports/callers/OPSX relations 三路；展开候选不进入 affectedFileHashes 与 patch 目标。

**Files**:
- Modify: `.claude/skills/openspec-optimizer/SKILL.md`
- Modify: `.codex/skills/openspec-optimizer/SKILL.md`
- Modify: 模板源文件（同 Task 2）
- Test: `test/skills/optimizer-skill-content.test.ts`

**Requirements**:
- Self-Read Protocol 替换为先解析 `originalBranch` 再 `git diff <originalBranch>...HEAD --name-only` 拿基础 scope；不再使用 diff 内容
- 新增 "Dependency Expansion (One Hop)" 段，说明 imports / callers / OPSX relations 三路与一层封顶规则
- 明确展开候选的过滤白名单（`path.relative` 排除 `..`，`gitignore` 解析复用，硬编码忽略 `node_modules` / `dist` / `build` / `.git`）
- 强调 Search/Replace PATH 字段仅 scope 内文件；affectedFileHashes 仅 scope 内文件
- 当 `relations.yaml` 不存在时仅执行 imports 与 callers 两路，不报错

#### Checks

- [x] C1 SKILL.md 含一层依赖展开协议
  - Verifies: `specs/openspec-optimizer-skill/spec.md` / Requirement "一层依赖展开扩大优化候选" / Scenario "通过 imports 找到共享模块"
  - Command: `pnpm test -- optimizer-skill-content`
  - Expect: 断言三路展开描述均存在

- [x] C2 展开仅一层规则被显式表述
  - Verifies: `specs/openspec-optimizer-skill/spec.md` / Requirement "一层依赖展开扩大优化候选" / Scenario "展开仅一层"
  - Command: `pnpm test -- optimizer-skill-content`
  - Expect: 断言 SKILL.md 中含"一层"或"one hop"语义约束

- [x] C3 Search/Replace PATH 限制在 scope 内
  - Verifies: `specs/openspec-optimizer-skill/spec.md` / Requirement "一层依赖展开扩大优化候选" / Scenario "展开候选不进入 affectedFileHashes"
  - Command: `pnpm test -- optimizer-skill-content`
  - Expect: 断言"展开候选不可作为 patch 目标"语义存在

- [x] C4 relations.yaml 缺失降级路径
  - Verifies: `specs/openspec-optimizer-skill/spec.md` / Requirement "一层依赖展开扩大优化候选" / Scenario "relations.yaml 缺失时降级"
  - Command: `pnpm test -- optimizer-skill-content`
  - Expect: 断言降级路径文档化

### Task 4: Merge message 生成器从 artifacts 提取

**Goal**: 实现把 proposal.md / design.md / tasks.md 转换为 git-commit-reasons 模板 message 的纯函数生成器，支持 type 推断、scope 抽取、Why/Changes 段构造，能写 manual 草稿。

**Files**:
- Create: `src/core/archive/merge-message.ts`
- Test: `test/core/archive/merge-message.test.ts`
- Test: `test/fixtures/changes/sample-change/`

**Requirements**:
- 输入：归档后的 change 目录绝对路径；输出：`{ subject, body }` 与 `toString()` 拼接好的多行 message
- type 推断按 `proposal.md` 的 `## What Changes` 关键动词命中顺序：添加/新增 → feat、修复 → fix、重构/删除 → refactor、其他 → chore
- scope 抽取优先 `opsx-delta.yaml` 的 ADDED/MODIFIED capabilities 主导 domain，去除 `dom.` 前缀；回退 change name 第一段
- subject 中文标题截断到 50 字符内，整 subject 长度不超过 72；message body 用 `## Why` + `## Changes` 双段
- 不依赖运行时 LLM；纯字符串处理；message 内容通过 stdin 传给后续 spawn 调用，调用方负责

#### Checks

- [x] C1 完整 artifacts 生成期望 message
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "Merge message 从 artifacts 生成" / Scenario "完整 artifacts 生成 message"
  - Command: `pnpm test -- merge-message`
  - Expect: 黄金 fixture 输出与期望逐字节相等

- [x] C2 type 推断覆盖四个分支
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "Merge message 从 artifacts 生成" / Scenario "type 字段从 What Changes 关键动词推断"
  - Command: `pnpm test -- merge-message`
  - Expect: feat/fix/refactor/chore 四个 case 全通过

- [x] C3 scope 优先 OPSX domain
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "Merge message 从 artifacts 生成" / Scenario "scope 字段优先取 OPSX 主导 domain"
  - Command: `pnpm test -- merge-message`
  - Expect: 含 opsx-delta 的 fixture 用 domain，缺失时回退 change name 段

### Task 5: Archive 流程追加 archive commit、merge、cleanup

**Goal**: 在 `src/core/archive.ts` 现有流程末尾追加 archive commit、merge、可选 branch cleanup 三步；冲突时 abort 并保留前置副作用；幂等支持已归档目录重跑 merge。

**Files**:
- Modify: `src/core/archive.ts`
- Modify: `.claude/skills/openspec-archive-change/SKILL.md`
- Modify: `.codex/skills/openspec-archive-change/SKILL.md`
- Test: `test/core/archive-branch-merge.test.ts`

**Requirements**:
- 新增子流程：sync + mv 之后调用 `runArchiveCommit` → `runMerge` → `runBranchCleanup`，每步独立幂等
- 所有 git 调用使用 `child_process.spawn` 数组形式；`git commit -F -` 与 `git merge -F -` 通过 stdin 传 message
- 冲突时 `git merge --abort`，保留 archive commit 与 sync 写入；返回非 0 退出码并打印恢复指引
- merge 成功后按 `git.branch.deleteAfterArchive` 与 `git branch --merged` 校验决定是否 `git branch -d`；squash 策略下默认不删
- skill 文档同步追加 Step 7-9 描述与 prompt projection 消费 git 段

#### Checks

- [x] C1 archive commit 在 feature 分支生成
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "Archive commit 在 feature 分支记录归档动作" / Scenario "归档 commit message 固定模板"
  - Command: `pnpm test -- archive-branch-merge`
  - Expect: 临时仓库内执行后 feature 分支顶部 commit 标题等于 `docs(<change>): 归档变更制品`

- [x] C2 默认 no-ff merge 生成 merge commit
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "归档时执行 feature 分支到主分支的合并" / Scenario "默认 no-ff 合并"
  - Command: `pnpm test -- archive-branch-merge`
  - Expect: originalBranch HEAD 的 parent 数量等于 2，message 含 `## Why` 段

- [x] C3 冲突 abort 路径
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "Merge 冲突时 abort 并保留前置副作用" / Scenario "冲突中断 merge"
  - Command: `pnpm test -- archive-branch-merge`
  - Expect: abort 后 feature 分支 archive commit 仍在；退出码非 0

- [x] C4 幂等：已归档目录可继续 merge
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "Merge 冲突时 abort 并保留前置副作用" / Scenario "archive 重跑幂等"
  - Command: `pnpm test -- archive-branch-merge`
  - Expect: 第二次调用跳过 sync 与 mv，直接进入 merge 阶段

- [x] C5 deleteAfterArchive 决策
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "合并后按配置删除 feature 分支" / Scenario "启用删除且分支已合并"
  - Command: `pnpm test -- archive-branch-merge`
  - Expect: 配置开启时分支被删除，关闭或未合并时保留

- [x] C6 originalBranch 解析回退
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "originalBranch 解析与回退" / Scenario "isolation 文件缺失"
  - Command: `pnpm test -- archive-branch-merge`
  - Expect: 删除 `.apply-isolation.json` 后 fallback 到 `git symbolic-ref` 解析的分支名

### Task 6: Archive skill 文档与归档摘要扩展

**Goal**: 把 archive skill 文档（`.claude` 与 `.codex`）扩展到包含 Step 7-9，更新归档摘要输出格式以报告 archive commit、merge 状态、branch cleanup；并保证 skill 通过 prompt projection 消费 git 配置而非直接 parse YAML。

**Files**:
- Modify: `.claude/skills/openspec-archive-change/SKILL.md`
- Modify: `.codex/skills/openspec-archive-change/SKILL.md`
- Modify: `src/core/config-prompts.ts`（archive surface 投影 git 段）
- Test: `test/skills/archive-skill-content.test.ts`
- Test: `test/core/config-prompts.test.ts`

**Requirements**:
- Step 7（archive commit）、Step 8（merge）、Step 9（cleanup）描述加入两份 skill 副本，引用具体 spec scenario
- 摘要 output 块增加新字段：archive commit SHA、merge strategy、merge SHA / abort 状态、feature 分支处理
- prompt projection `archive` surface 输出 git 段；skill 文档说明从 projection 读取而非 raw config
- 删除冲突的旧描述（"切回原分支并退出"作为兜底语义保留，但移到 Scenario "非 git 仓库或无 isolation 时跳过" 的解释里）

#### Checks

- [x] C1 skill 文档含三步追加描述
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "三步顺序"
  - Command: `pnpm test -- archive-skill-content`
  - Expect: 两份 SKILL.md 中均含 Step 7/8/9 标题

- [x] C2 摘要扩展字段
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 摘要扩展报告 merge 状态" / Scenario "摘要报告字段"
  - Command: `pnpm test -- archive-skill-content`
  - Expect: 摘要模板含 archive commit、merge strategy、feature branch 三字段

- [x] C3 git 段 projection 注入
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 通过 prompt projection 消费 git 配置" / Scenario "配置经投影后被 archive 消费"
  - Command: `pnpm test -- config-prompts`
  - Expect: archive surface 投影输出含 git.merge.strategy 等字段
