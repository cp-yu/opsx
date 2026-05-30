<!-- decision: input-from-design-summary; explore Design Summary used; routing=design-summary-found -->

## Why

Apply 阶段已落地 branch isolation，会在 feature 分支上产生 cN 个增量 commit；当前 reviewer/optimizer 仍把 `git diff` 内容当成证据来源，archive 仅切回原分支后就结束，没有把改动回流到 `main`。这造成两个问题：一是 reviewer/optimizer 看到的是过渡态而非最终态，并且 optimizer 的优化面被 `evidenceFiles` 强行收窄；二是 feature 分支与主线脱节，缺少一个能代表整次 change 的 docs 化合并节点。

## What Changes

- 修改 `openspec-reviewer-skill`：Self-Read 阶段移除 `git diff` 内容级命令，改用 `git diff <originalBranch>...HEAD --name-only` 仅作为 scope 锚点；判断证据 SHALL 基于最终磁盘内容
- 修改 `openspec-optimizer-skill`：同上，并新增"一层依赖展开"协议——基于 imports/callers/OPSX relations 把候选文件从 `evidenceFiles` 扩展到直接关联文件，扩展结果不进入 `affectedFileHashes`
- 修改 `opsx-archive-skill`：在 sync 与 move-to-archive 之后新增三步——archive commit（在 feature 分支，记录 sync/move 操作）、merge 到 `originalBranch`（默认 `--no-ff`，message 从 artifacts 生成）、可选 branch 清理
- 修改 `config-loading`：在 `openspec/config.yaml` 中新增 `git` 节点，含 `merge.strategy`、`merge.messageFrom`、`branch.deleteAfterArchive` 三个字段，并接入现有 Zod schema 校验

## Capabilities

### New Capabilities

- `archive-branch-merge`: 归档时把 feature 分支按结构化 commit message 合并回 originalBranch，行为受 `git` 配置节点约束

### Modified Capabilities

- `openspec-reviewer-skill`: scope 锚定改为 `git diff <originalBranch>...HEAD --name-only`，移除 diff 内容证据来源
- `openspec-optimizer-skill`: scope 同上，新增一层依赖展开协议
- `opsx-archive-skill`: 在现有归档流程后追加 archive commit + merge + branch cleanup
- `config-loading`: 新增 `git` 配置节点的加载、默认值与校验

## Impact

- 受影响指令文件：`.claude/skills/openspec-reviewer/SKILL.md`、`.claude/skills/openspec-optimizer/SKILL.md`、`.claude/skills/openspec-archive-change/SKILL.md`、`.codex/skills/` 下的对应副本
- 受影响代码：`src/core/config/` 下的 schema 与 loader、`src/core/changes/archive/` 或同等位置的归档执行链路、`src/core/verify/` 中传给 subagent 的输入合约
- 受影响测试：reviewer/optimizer skill 行为测试、archive 端到端测试、config schema 单元测试
- 复用 `.apply-isolation.json` 中已记录的 `originalBranch`，不引入新的状态文件
- Merge 冲突时不自动解决：abort 后保留 feature 分支上已有的 sync/move/archive commit，由用户手动解决
