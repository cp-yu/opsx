## MODIFIED Requirements

### Requirement: Reviewer 输入合约

`openspec-reviewer` skill SHALL 定义顶层 agent MUST 传入的轻量定位信息：

| 字段 | 描述 | 必需 |
|---|---|---|
| changeName | change 名称，用于拼接路径 | 是 |
| changeDir | change 目录的绝对路径 | 是 |
| projectRoot | 项目根目录的绝对路径 | 是 |

Reviewer SHALL 自主完成以下信息获取：
- **changeArtifacts**: 从 `changeDir` 读取 proposal.md、specs/*/spec.md、design.md、tasks.md
- **scopeFiles**: 通过 `git diff <originalBranch>...HEAD --name-only` 拿到 feature 分支整体变更文件列表，仅作为定位锚点；`originalBranch` 优先从 `path.join(changeDir, '.apply-isolation.json').originalBranch` 读取，缺失时回退到 `git symbolic-ref refs/remotes/origin/HEAD --short` 解析的远程默认分支
- **finalFileContents**: 对 scopeFiles、`.verify-result.json` 中的 `verificationContext.evidenceFiles` 与 OPSX `code-map` 推断的候选文件，SHALL 通过 Read 读取最终磁盘内容作为唯一权威证据
- **priorVerifyResult**: 自行读取 `changeDir/.verify-result.json`（如存在）
- **opsxContext**: 自行读取 `changeDir/opsx-delta.yaml` 和 `projectRoot/openspec/project.opsx.yaml`

Reviewer MUST NOT 把 `git diff` 的内容级输出（hunks、行变更）作为判断证据；diff 内容只反映过渡 commit 状态，最终态需要 Read 文件内容确认。

如果 `changeName`、`changeDir` 或 `projectRoot` 缺失，reviewer MUST fail closed。

#### Scenario: 所有定位信息完整传入

- **WHEN** 顶层 agent 传入 changeName、changeDir 和 projectRoot
- **THEN** reviewer SHALL 自行读取所有必要文件并继续执行验证协议
- **AND** SHALL NOT 要求 master 传入文件内容

#### Scenario: 缺少定位信息

- **WHEN** changeDir 未传入或路径不存在
- **THEN** reviewer SHALL 返回 FAIL_NEEDS_REMEDIATION 和 CRITICAL issue "Missing required input: changeDir"
- **AND** SHALL 停止，不执行进一步验证

#### Scenario: 首次 verify 无 prior .verify-result.json

- **WHEN** `changeDir/.verify-result.json` 不存在
- **THEN** reviewer SHALL 通过 `git diff <originalBranch>...HEAD --name-only` 与 change artifacts 关键词推断候选实现文件
- **AND** SHALL Read 推断出的候选文件最终内容
- **AND** SHALL 将 priorVerifyResult 视为 null 继续验证

#### Scenario: 利用 .verify-result.json 作为导航 manifest

- **WHEN** `changeDir/.verify-result.json` 存在且包含 `verificationContext.evidenceFiles`
- **THEN** reviewer SHALL Read evidenceFiles 列表中的每个文件最终内容作为候选
- **AND** SHALL 结合 `git diff <originalBranch>...HEAD --name-only` 的结果补充列表中未覆盖的新增文件

#### Scenario: 不依赖 diff 内容判断行为

- **WHEN** reviewer 评估某 requirement 是否实现
- **THEN** SHALL 仅以 Read 到的最终文件内容作为证据
- **AND** SHALL NOT 引用 `git diff` hunk 或某次 commit 的局部变化作为判断依据

#### Scenario: originalBranch 不可解析时降级

- **WHEN** `.apply-isolation.json` 缺失且 `git symbolic-ref refs/remotes/origin/HEAD` 失败
- **THEN** reviewer SHALL 回退到 `git ls-files --modified --others --exclude-standard` 与 `evidenceFiles` 联合作为 scope
- **AND** SHALL 在 `gitDiffSummary` 中以 WARNING 形式注明 scope 推断退化

### Requirement: 6 步验证协议

`openspec-reviewer` skill SHALL 为每个 delta spec requirement 定义并强制执行 6 步客观验证循环：

1. **Locate** — 从 requirement 关键词与 `git diff <originalBranch>...HEAD --name-only` 输出识别候选文件
2. **Read** — 通过 Read 工具检查候选文件的最终磁盘内容，不依赖搜索结果或 diff 内容
3. **Analyze** — 将实现细节与 requirement 意图和所有 Scenario: 块进行比较
4. **Cite** — 记录具体文件路径和行范围作为证据
5. **Judge** — 基于证据强度分配 PASS、WARNING 或 CRITICAL
6. **Explain** — 对于非 PASS，准确说明缺失、偏离或不确定的内容

#### Scenario: 需求被实现证据清晰满足

- **WHEN** finalFileContents 中某文件清晰实现了 requirement 行为
- **AND** 所有关联 Scenario 条件均已覆盖
- **THEN** reviewer SHALL 分配 PASS
- **AND** SHALL 引用文件路径和行范围作为证据

#### Scenario: 搜索后未找到可信证据

- **WHEN** 经过对 scope 内候选文件的彻底 Read
- **AND** 未找到 requirement 行为的可信实现证据
- **THEN** reviewer SHALL 分配 CRITICAL
- **AND** SHALL 说明搜索过程和为何判定为缺失
