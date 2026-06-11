<!-- propose-routing: design-summary-found; input-length=20; detail-score=n/a; multi-subsystem=no; decision=proceed-with-design-summary -->
## Why

[业务背景] skill reference 文件目前按工具目录复制（`.claude/` `.codex/` `.github/` 共 39 份物理副本），且每次 `openspec update` 对 skill 目录执行 `rm -rf references/` 后整体重写，用户无法自定义 commit message 模板——任何手改都会被无声清除，想改格式只能改框架源码。同时 git 配置面存在两类伪配置：`git.archive.commitMessage.convention` 与 `git.merge.commitMessage.convention` 是单值 enum（无任何可配置性），`git.autoCommit` 名为全局自动提交开关、实际只控制 archive 后的 handoff，名不副实造成误解。

[技术决策] 将全部 reference 迁移到项目级唯一位置 `openspec/references/`，以 `openspec-` 前缀作为所有权边界（update 只逐文件覆盖前缀文件，严禁目录级删除）；删除 `git.autoCommit` 与两个单值 convention enum，新增 `git.commitMessage.{boundary,archive,merge}` 可选路径覆盖，让用户用自有模板文件替换内置模板。

## What Changes

- 新建 `openspec/references/` 作为全部 skill reference 文件的唯一物理位置，内置 reference 重命名为 `openspec-<name>.md`（如 `openspec-archive-commit-message.md`）。
- sync-engine 不再向各工具 skill 目录写 `references/`，不再执行目录级 `rm -rf`；改为只逐文件覆盖 `openspec/references/openspec-*` 文件，非 `openspec-` 前缀文件永不触碰；一次性清理 skill 目录残留的 `references/`。
- 生成时新增两项校验：reference 文件名全局唯一冲突即报错；reference 内容必须工具中立（不得含 `/opsx:` 等需 per-tool 转换的调用语法），违反即报错。
- 各 workflow 模板（archive/apply/optimizer/verify/sync-specs/impact-sweeper）的 reference 引用路径改为 `openspec/references/openspec-<name>.md`。
- **BREAKING** 删除 `git.autoCommit` 配置：archive 后 git handoff 恒为 agent 自动继续；残留 `git.autoCommit` 字段加载时输出废弃 warning，防止静默翻转误解。
- **BREAKING** 删除 `git.archive.commitMessage.convention` 与 `git.merge.commitMessage.convention` 单值 enum 及其 schema、projection、prompts、迁移逻辑。
- 新增 `git.commitMessage.boundary`、`git.commitMessage.archive`、`git.commitMessage.merge` 可选字符串路径（项目根相对 POSIX 路径，拒绝绝对路径与 `..`）：已配置时 agent 读用户模板，未配置时读 `openspec/references/` 内置模板。`boundary` 键本变更只入 schema，消费方由后续变更 `boundary-commit-change-summary` 定义。
- `openspec init` / `openspec update` 的 config 默认值物化与迁移同步：不再写入 `git.autoCommit` 与 convention 节点，update 迁移时移除存量陈旧节点。
- archive CLI 的 handoff 提醒不再读取 `git.autoCommit`，恒提示 agent 接管。

## Capabilities

### New Capabilities
- `references-home`: `openspec/references/` 目录的所有权模型——`openspec-` 前缀文件由 update 管理（逐文件覆盖、禁目录删除），其他前缀为用户领地；内置 reference 物化、工具中立与文件名唯一性校验；`git.commitMessage.*` 路径覆盖的解析与路由规则。

### Modified Capabilities
- `template-artifact-pipeline`: sync engine 的 reference 写入目标从各工具 skill 目录改为 `openspec/references/`，并增加所有权与工具中立校验约束。
- `verify-skill-reference-files`: verify skill 的 checkpoint 协议 reference 路径从 skill 目录 `references/` 迁移到 `openspec/references/openspec-phase2-checkpoint-protocol.md`。
- `skill-template-length-check`: 生成 reference 的落盘路径表述更新为 `openspec/references/`；`template.referenceFiles[]` 500 行长度检查本身不变。
- `opsx-archive-skill`: 删除 manual 模式行为；git 流程消费从 `git.autoCommit`/convention projection 改为 `git.commitMessage.*` 路径覆盖路由；reference 读取路径迁移。
- `cli-archive`: handoff 提醒不再区分 auto/manual，恒提示 agent 接管。
- `config-loading`: git 节点 schema 重构——删除 `autoCommit` 与 convention 字段，新增 `commitMessage.{boundary,archive,merge}` 可选路径校验，残留 `autoCommit` 输出废弃 warning，默认值物化契约更新。
- `config-project-query`: `openspec config project --json` 输出的 `git` 字段结构更新。
- `cli-update`: config 迁移逻辑更新——移除存量 `git.autoCommit` 与 convention 节点，不再物化它们；skill 刷新时迁移 reference 落盘位置。
- `cli-init`: 生成的 `openspec/config.yaml` 不再包含 `git.autoCommit` 与 convention 节点。

## Impact

- 代码：`src/core/templates/sync-engine.ts`、`src/core/workflow-installation.ts`、`src/core/config-schema.ts`、`src/core/project-config.ts`、`src/core/config-projection.ts`、`src/core/config-prompts.ts`、`src/core/templates/workflows/{archive-change,apply-change,optimizer,verify-change,sync-specs,impact-sweeper}.ts`、init/update 默认值物化与迁移路径。
- 测试：`test/skills/archive-skill-content.test.ts`、`test/core/workflow-installation.test.ts`、`test/core/{config-schema,project-config,init,update}.test.ts`、`test/commands/config.test.ts`、`test/core/archive-branch-merge.test.ts`、`test/core/archive/merge-message.test.ts`、`test/skills/skill-template-length-validation.test.ts`。
- 生成产物：`.claude/` `.codex/` `.github/` skill 目录的 `references/` 移除；新增 `openspec/references/openspec-*.md`（14 个文件）。
- 存量项目：配置了 `git.autoCommit: manual` 的项目行为静默变为 agent 自动 handoff（以废弃 warning 缓解）；手改过生成 reference 文件的项目需迁移到自有前缀文件 + config 路径覆盖。
