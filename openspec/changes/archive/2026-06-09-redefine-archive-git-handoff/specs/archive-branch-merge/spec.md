## REMOVED Requirements

### Requirement: 归档时执行 feature 分支到主分支的合并
**Reason**: archive CLI 不再拥有 git commit、merge、checkout 或 branch cleanup 职责；`git.autoCommit` 改为 agent/user handoff 语义。
**Migration**: 归档完成后由 archive skill/agent 读取 project config 与 references，再由 agent 或用户处理 git 提交和合并。

### Requirement: Merge message 从 artifacts 生成
**Reason**: commit message 生成需要 agent 读取 references 并结合实际 diff 判断，不能由 archive CLI runtime 生成。
**Migration**: agent 在需要 merge/squash message 时读取 `references/merge-summary-message.md` 后生成。

### Requirement: Archive commit 在 feature 分支记录归档动作
**Reason**: archive commit 属于归档后的 git 工作，不属于 archive CLI runtime。
**Migration**: agent 在 CLI 归档完成后读取 `references/archive-commit-message.md`，并在真实项目变更提交之后创建 OpenSpec/docs 归档制品提交。

### Requirement: 合并后按配置删除 feature 分支
**Reason**: branch cleanup 是 git 工作的一部分，archive CLI 不再执行。
**Migration**: agent 或用户在归档后按项目策略处理分支清理。

### Requirement: Merge 冲突时 abort 并保留前置副作用
**Reason**: archive CLI 不再执行 merge，因此不再产生 CLI merge conflict/abort 行为。
**Migration**: agent 或用户执行 merge 时自行处理冲突恢复。

### Requirement: originalBranch 解析与回退
**Reason**: originalBranch 解析只服务于 CLI 自动 merge，archive CLI 不再需要该解析。
**Migration**: agent 或用户在归档后的 git 流程中按需要解析目标分支。

### Requirement: 跨平台 git 命令调用
**Reason**: archive CLI 不再执行 git write commands 或通过 stdin 传入 commit message。
**Migration**: 归档后的 agent git 流程仍应使用安全的命令调用方式，但不属于 archive CLI runtime 行为。
