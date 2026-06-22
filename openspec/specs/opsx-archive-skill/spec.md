# OPSX Archive Skill Spec

## Purpose

Define the expected behavior for the `/opsx:archive` skill, including readiness checks, spec sync prompting, archive execution, and user-facing output.
## Requirements
### Requirement: OPSX Archive Skill

The system SHALL provide an `/opsx:archive` skill that archives completed changes in the experimental workflow.

#### Scenario: Archive a change with all artifacts complete

- **WHEN** agent executes `/opsx:archive` with a change name
- **AND** all artifacts in the schema are complete
- **AND** all tasks are complete
- **THEN** the agent moves the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`
- **AND** displays success message with archived location

#### Scenario: Change selection prompt

- **WHEN** agent executes `/opsx:archive` without specifying a change
- **THEN** the agent prompts user to select from available changes
- **AND** shows only active changes (excludes archive/)

### Requirement: Artifact Completion Check

The skill SHALL check artifact completion status using the artifact graph before archiving.

#### Scenario: Incomplete artifacts warning

- **WHEN** agent checks artifact status
- **AND** one or more artifacts have status other than `done`
- **THEN** display warning listing incomplete artifacts
- **AND** prompt user for confirmation to continue
- **AND** proceed if user confirms

#### Scenario: All artifacts complete

- **WHEN** agent checks artifact status
- **AND** all artifacts have status `done`
- **THEN** proceed without warning

### Requirement: Task Completion Check

The skill SHALL 在归档前检查 `tasks.md` 的任务完成状态，并执行强制性的完整验证门禁。

#### Scenario: archive-time full verify 在支持 subagent 的工具上复用 verify orchestration

- **WHEN** archive 因缺失或 stale 的 `.verify-result.json` 而重新执行 full verify
- **AND** 当前 AI 工具支持 clean-context subagent verify
- **THEN** the skill SHALL 复用与 `/opsx:verify` 相同的 subagent-orchestrated verify 模板骨架
- **AND** 顶层 archive agent SHALL NOT 在 archive 模板内直接执行 completeness、correctness 或 coherence judgment
- **AND** archive-time full verify 的 Phase 1 verdict SHALL 来自 clean-context reviewer subagent

#### Scenario: archive-time full verify 不得私自跳过可执行的 Phase 2

- **WHEN** archive 因缺失或 stale 的 `.verify-result.json` 而重新执行 full verify
- **AND** canonical Phase 1 result 为 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `openspec/config.yaml` 未禁用 optimization
- **AND** 用户未显式请求 `--skip-optimization`
- **THEN** the skill SHALL 继续执行与 `/opsx:verify` 完全一致的 Phase 2 optimization contract
- **AND** SHALL NOT 仅因 archive-time 存在 speculative edit 风险而降级成 Phase-1-only verify
- **AND** 只有在 config 禁用或用户显式请求 `--skip-optimization` 时，`.verify-result.json` 才可记录 `optimization.status = SKIPPED`

### Requirement: Spec Sync Prompt

The skill SHALL handle sync inline during archive instead of requiring a separate `/opsx:sync` surface.

#### Scenario: Archive a change with delta specs
- **WHEN** agent executes `/opsx:archive`
- **AND** delta specs exist
- **THEN** the skill SHALL reconcile delta specs to main specs as part of archive
- **AND** SHALL NOT require an installed separate `/opsx:sync` skill

#### Scenario: Archive a change with opsx-delta
- **WHEN** agent executes `/opsx:archive`
- **AND** `opsx-delta.yaml` exists
- **THEN** the skill SHALL apply the OPSX delta during archive
- **AND** SHALL validate referential integrity before writing
- **AND** SHALL write updated OPSX files atomically

#### Scenario: Embedded sync failure aborts archive
- **WHEN** inline sync would fail validation or integrity checks
- **THEN** the skill SHALL abort archive
- **AND** SHALL leave main specs unchanged
- **AND** SHALL leave OPSX files unchanged
- **AND** SHALL leave the change directory in place

#### Scenario: Archive summary reports embedded sync result
- **WHEN** archive completes
- **THEN** the summary SHALL report whether archive-time sync updated main specs and OPSX files
- **AND** SHALL distinguish successful sync from skipped sync

#### Scenario: Archive keeps the same sync-state contract
- **WHEN** agent executes `/opsx:archive`
- **AND** delta specs or `opsx-delta.yaml` are present
- **THEN** archive SHALL assess and execute the embedded sync contract before moving the change

### Requirement: Archive Process

The skill SHALL move the change to the archive folder with date prefix.

#### Scenario: Successful archive

- **WHEN** archiving a change
- **THEN** create `archive/` directory if it doesn't exist
- **AND** generate target name as `YYYY-MM-DD-<change-name>` using current date
- **AND** move entire change directory to archive location
- **AND** preserve `.openspec.yaml` file in archived change

#### Scenario: Archive already exists

- **WHEN** target archive directory already exists
- **THEN** fail with error message
- **AND** suggest renaming existing archive or using different date

### Requirement: Skill Output

The skill SHALL provide clear feedback about the archive operation.

#### Scenario: Archive complete with sync

- **WHEN** archive completes after syncing specs
- **THEN** display summary:
  - Specs synced
  - Change archived to location
  - Schema that was used

#### Scenario: Archive complete without sync

- **WHEN** archive completes without syncing specs
- **THEN** display summary:
  - Note that specs were not synced (if applicable)
  - Change archived to location
  - Schema that was used

#### Scenario: Archive complete with warnings

- **WHEN** archive completes with incomplete artifacts or tasks
- **THEN** include note about what was incomplete
- **AND** suggest reviewing if archive was intentional

### Requirement: Archive skill SHALL consume prompt projection
The `/opsx:archive` skill SHALL consume prompt projection for archive-time sync guidance and artifact write-back guidance rather than relying on raw config interpretation inside the template body.

#### Scenario: Archive guidance inherits projected authoring constraints
- **WHEN** the skill explains embedded sync or remediation handling
- **THEN** it SHALL use the shared prompt projection contract for prose guidance
- **AND** SHALL preserve canonical structure and normative tokens unchanged

### Requirement: Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步

`opsx-archive-skill` SHALL 调用 archive CLI 完成 verify、sync 与 move-to-archive；CLI 返回后，agent SHALL 无条件继续归档后的 git 流程：先提交残余实现 diff（如有），再无条件创建 semantic boundary commit，然后提交 OpenSpec/docs 归档制品。CLI 本身 SHALL NOT 执行 archive commit、merge 或 cleanup。

#### Scenario: agent 继续 git 流程

- **WHEN** archive CLI 完成 sync 与 mv
- **THEN** archive skill SHALL 由 agent 继续处理 git 提交流程
- **AND** agent SHALL 按顺序处理：残余实现 diff 提交（如有）、semantic boundary commit、OpenSpec/docs 归档制品提交
- **AND** agent SHALL 在生成归档制品 commit message 前读取 `git.commitMessage.archive` 指向的用户模板，未配置时读取 `openspec/references/openspec-archive-commit-message.md`

#### Scenario: 存在未提交实现变更

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** 工作区仍存在未提交的真实项目实现变更
- **THEN** agent SHALL 先创建普通 implementation commit
- **AND** 该 commit SHALL 只承载尚未提交的真实项目实现变更
- **AND** agent SHALL 在该 commit 之后继续创建 semantic boundary commit

#### Scenario: 无条件创建 semantic boundary commit

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** 残余实现 diff 已提交或不存在
- **THEN** agent SHALL 创建 `--allow-empty` 的 semantic boundary commit
- **AND** boundary commit SHALL 发生在 OpenSpec/docs 归档制品提交之前
- **AND** boundary commit 的 subject SHALL 使用 `feat`、`fix`、`refactor` 等真实语义类型，而非 `meta`
- **AND** message SHALL 通过 `git commit -F -` 传入

#### Scenario: boundary commit message 承载完整 change 总结

- **WHEN** agent 生成 semantic boundary commit message
- **THEN** message body SHALL 包含 `## Why` 章节，内容来自归档 `proposal.md` 的业务背景与 `design.md`（存在时）的技术决策
- **AND** SHALL 包含 `## Changes` 章节，按 `git diff --name-only <base>..<head>` 的文件清单逐文件描述改动原因
- **AND** diff 清单中存在但归档制品未提及的文件 SHALL 如实列出
- **AND** SHALL 以 `Implementation: <base>..<head> (carried by <commits>)` footer 记录 effective diff 范围与承载该 diff 的 commits（含 `wip: opt-*` checkpoint commits 与刚创建的普通 implementation commit）

#### Scenario: boundary commit 模板路由

- **WHEN** agent 生成 semantic boundary commit message
- **THEN** agent SHALL 在生成前读取 `git.commitMessage.boundary` 指向的用户模板，未配置时读取 `openspec/references/openspec-boundary-commit-message.md`
- **AND** 主 `SKILL.md` SHALL NOT 内联 boundary commit body 的格式规则

#### Scenario: 非 git 仓库时只报告归档结果

- **WHEN** 项目根目录不是 git 仓库
- **THEN** archive skill SHALL 报告 archive CLI 已完成的归档结果
- **AND** SHALL NOT 尝试执行 git 提交、合并或分支清理

#### Scenario: agent 处理 merge message

- **WHEN** agent 后续 git 流程需要创建 merge 或 squash commit message
- **THEN** agent SHALL 在生成 message 前读取 `git.commitMessage.merge` 指向的用户模板，未配置时读取 `openspec/references/openspec-merge-summary-message.md`
- **AND** SHALL NOT 使用 archive CLI 输出的推荐 message

### Requirement: Archive 摘要扩展报告 merge 状态

archive skill 的输出 SHALL 区分 CLI 归档结果与归档后的 git 处理状态，而不是报告 CLI 已执行的 archive commit、merge 或 branch cleanup。

#### Scenario: 摘要报告字段

- **WHEN** archive CLI 完成归档
- **THEN** 摘要 SHALL 包含以下字段：
  - change name
  - schema
  - archive location
  - verify gate result
  - specs / OPSX sync result
  - next git responsibility（agent 继续处理）

#### Scenario: 不报告 CLI merge 结果

- **WHEN** archive CLI 完成归档
- **THEN** 摘要 SHALL NOT 声称 CLI 创建了 archive commit
- **AND** SHALL NOT 声称 CLI 执行了 merge
- **AND** SHALL NOT 声称 CLI 删除了 feature branch

### Requirement: Archive 通过 prompt projection 消费 git 配置

archive skill 在归档后的 git 流程中 SHALL 通过统一 prompt/runtime projection 消费 `git` 配置节点，而非直接读取 raw YAML 键。

#### Scenario: 配置经投影后被 archive 消费

- **WHEN** archive 需要决定归档后 git 流程的 commit message 模板与 merge 策略
- **THEN** archive SHALL 从 prompt/runtime projection 读取 `git.commitMessage.archive`、`git.commitMessage.merge`、`git.merge.strategy`、`git.branch.deleteAfterArchive`
- **AND** SHALL NOT 在模板正文里直接 `yaml.parse(config.yaml)`
- **AND** projection 缺失字段时 SHALL 使用默认行为（内置模板路由 / `no-ff` / `false`）

#### Scenario: 陈旧 projection 字段不再出现

- **WHEN** archive surface 请求 prompt/runtime projection
- **THEN** projection SHALL NOT 输出 `git.autoCommit`、`git.archive.commitMessage.convention`、`git.merge.commitMessage.convention`、`git.merge.messageFrom`

### Requirement: Archive skill 拆分 commit message convention references

`opsx-archive-skill` SHALL 将 boundary commit、archive commit 与 merge summary commit 的 message 格式说明作为 `openspec/references/` 下的受管 reference 文件提供，并要求 agent 在归档后的 git 流程中按 `git.commitMessage.*` 覆盖路由读取。

#### Scenario: boundary 提交读取 boundary reference
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 要求 agent 在创建 semantic boundary commit 前读取 `git.commitMessage.boundary` 指向的模板，未配置时读取 `openspec/references/openspec-boundary-commit-message.md`
- **AND** `openspec/references/openspec-boundary-commit-message.md` SHALL 说明 boundary commit 的 subject、`## Why`、`## Changes` 与 `Implementation:` footer 格式及其信息来源

#### Scenario: archive 制品提交读取 archive reference
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 要求 agent 在创建 OpenSpec/docs 归档制品 commit 前读取 `git.commitMessage.archive` 指向的模板，未配置时读取 `openspec/references/openspec-archive-commit-message.md`
- **AND** `openspec/references/openspec-archive-commit-message.md` SHALL 说明归档制品 commit 的 subject、`## Why` 与 `## Changes` 格式

#### Scenario: merge 步骤读取 merge summary reference
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 要求 agent 在创建 merge 或 squash commit message 前读取 `git.commitMessage.merge` 指向的模板，未配置时读取 `openspec/references/openspec-merge-summary-message.md`
- **AND** `openspec/references/openspec-merge-summary-message.md` SHALL 说明 merge summary 的 subject、`## Why` 与 `## Changes` 格式

#### Scenario: 主 skill 保留流程边界
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 保留 archive 流程、verify gate、sync、CLI archive、agent git 流程与 references 读取步骤
- **AND** 主 `SKILL.md` SHALL NOT 内联 commit message 格式的完整说明

### Requirement: Archive skill 在用户显式要求时允许绕过 verify gate

`openspec-archive-change` skill SHALL 在用户显式要求时允许 agent 向 archive CLI 传递 `--no-verify` 标志。skill SHALL 优先引导 agent 走标准 verify gate 流程，但当用户明确表示要跳过 verify 时，agent SHALL 直接传递 `--no-verify`，由 CLI 自行执行二次确认。

#### Scenario: 用户显式要求绕过 verify

- **WHEN** 用户以自然语言或命令形式明确指示跳过 verify（例如"直接 --no-verify"、"跳过验证"、"不用 verify 了"）
- **THEN** agent SHALL 向 `openspec archive <change-name>` 命令传递 `--no-verify` 标志
- **AND** agent SHALL NOT 阻拦或要求用户先完成 verify

#### Scenario: 用户未要求绕过时优先标准 verify

- **WHEN** 用户未显式要求跳过 verify
- **AND** verify 结果缺失或 stale
- **THEN** agent SHALL 优先执行标准 verify 流程
- **AND** agent SHALL NOT 自行决定使用 `--no-verify`

