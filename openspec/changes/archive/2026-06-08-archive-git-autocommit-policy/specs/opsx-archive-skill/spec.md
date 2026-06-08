## MODIFIED Requirements

### Requirement: Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步

`opsx-archive-skill` SHALL 在现有归档流程的 mv 与 sync 完成之后，根据 `git.autoCommit` 决定是否追加 archive commit、merge to originalBranch、可选 branch 清理三个步骤。

#### Scenario: auto 模式三步顺序

- **WHEN** archive 完成 sync 与 mv
- **AND** 配置 `git.autoCommit` 为 `auto`
- **AND** `.apply-isolation.json` 的 `originalBranch` 字段非空
- **AND** 当前 git HEAD 在 feature 分支
- **THEN** archive SHALL 先在 feature 分支执行 archive commit
- **AND** SHALL 切换到 originalBranch 并执行 merge（行为见 archive-branch-merge spec）
- **AND** SHALL 在 merge 成功后按配置决定是否删除 feature 分支
- **AND** archive commit 与 merge 的具体行为 SHALL 与 archive-branch-merge spec 保持一致

#### Scenario: manual 模式只归档

- **WHEN** archive 完成 sync 与 mv
- **AND** 配置 `git.autoCommit` 为 `manual`
- **THEN** archive SHALL 跳过 archive commit
- **AND** SHALL 跳过 merge
- **AND** SHALL 跳过 branch cleanup
- **AND** SHALL 保留归档后的未提交工作树

#### Scenario: 非 git 仓库时跳过

- **WHEN** 项目根目录不是 git 仓库
- **THEN** archive SHALL 跳过 archive commit、merge、branch cleanup 三步
- **AND** SHALL 保留现有的"询问是否切换回原分支"的交互行为作为兜底

#### Scenario: isolation 缺失时解析 originalBranch

- **WHEN** `.apply-isolation.json` 不存在或 `originalBranch` 为空
- **AND** 当前 git HEAD 在 feature 分支
- **AND** 配置 `git.autoCommit` 为 `auto`
- **THEN** archive SHALL 按 archive-branch-merge spec 的 originalBranch 回退顺序解析目标分支
- **AND** 解析成功后 SHALL 继续执行 archive commit、merge、branch cleanup 三步
- **AND** 远程默认分支无法解析时 SHALL 提示用户输入 originalBranch 并写回 `.apply-isolation.json`

### Requirement: Archive 摘要扩展报告 merge 状态

archive 在归档摘要输出中 SHALL 报告 archive commit、merge 与 branch cleanup 的执行结果。

#### Scenario: 摘要报告字段

- **WHEN** archive 完成全部步骤
- **THEN** 摘要 SHALL 包含以下字段：
  - git auto commit 模式（auto / manual）
  - 是否创建了 archive commit（commit SHA / skipped: no changes / skipped: manual）
  - merge 策略（no-ff / ff-only / squash / skipped: manual / skipped: no isolation）
  - merge 结果（success: <merge SHA> / abort: conflict / skipped）
  - feature 分支处理（deleted / kept: branch not merged / kept: config disabled / skipped: manual）
  - originalBranch 当前 HEAD

#### Scenario: 冲突 abort 时摘要

- **WHEN** merge 因冲突 abort
- **THEN** 摘要 SHALL 显式标注 "merge aborted due to conflict"
- **AND** SHALL 提示用户解决冲突后重跑 archive
- **AND** archive 退出码 SHALL 为非 0

### Requirement: Archive 通过 prompt projection 消费 git 配置

archive skill 在执行 archive commit、merge、branch cleanup 时 SHALL 通过统一 runtime projection 消费 `git` 配置节点，而非直接读取 raw YAML 键。

#### Scenario: 配置经投影后被 archive 消费

- **WHEN** archive 需要决定 auto commit 模式、archive commit convention、merge 策略、merge commit convention 与 branch cleanup
- **THEN** archive SHALL 从 prompt/runtime projection 读取 `git.autoCommit`、`git.archive.commitMessage.convention`、`git.merge.strategy`、`git.merge.commitMessage.convention`、`git.branch.deleteAfterArchive`
- **AND** SHALL NOT 在模板正文里直接 `yaml.parse(config.yaml)`
- **AND** projection 缺失字段时 SHALL 使用默认值（`auto` / `openspec-archive` / `no-ff` / `openspec-merge-summary` / `false`）

#### Scenario: 陈旧 projection 字段不再出现

- **WHEN** archive surface 请求 prompt/runtime projection
- **THEN** projection SHALL NOT 输出 `git.merge.messageFrom`
