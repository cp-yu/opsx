## MODIFIED Requirements

### Requirement: Explore 捕获边界保持 specs 为可观察行为

Explore 在已有 change 上发现 insight 时 SHALL 先判断 insight 类型，并将其分类为 future capture target。只有可观察行为需求或可观察行为变化的 future capture target 才是 `specs/<capability>/spec.md`。Explore SHALL NOT 在当前 workflow 中更新这些制品。

#### Scenario: 可观察行为进入 specs

- **WHEN** explore 发现新的可观察行为需求或现有可观察行为变化
- **THEN** 系统 SHALL 将 future capture target 分类为 `specs/<capability>/spec.md`
- **AND** 分类文案 SHALL 表明这是 observable behavior，而不是泛化的 "new requirement"
- **AND** SHALL 将该分类纳入 conversation-only `Design Summary`

#### Scenario: 重构和实现决策进入 design

- **WHEN** explore 形成 refactor rationale、rejected path、implementation strategy 或不再使用旧路径的决策
- **THEN** 系统 SHALL 将 future capture target 分类为 `design.md`
- **AND** SHALL NOT 将这些非行为内容分类到 `specs/<capability>/spec.md`
- **AND** SHALL NOT 在 explore 中更新 `design.md`

#### Scenario: 其他 insight 路由到对应制品

- **WHEN** explore 发现 scope change、new work、verification work、OPSX graph intent change 或 invalidated assumption
- **THEN** scope change SHALL 分类到 `proposal.md`
- **AND** new work 或 verification work SHALL 分类到 `tasks.md`
- **AND** OPSX graph intent change SHALL 分类到 `opsx-delta.yaml`
- **AND** invalidated assumption SHALL 分类到相关制品
- **AND** 制品写入 SHALL 由 `/opsx:propose <change-name>` 或合适的非-explore workflow 执行

### Requirement: Explore 主代理保持只读

Explore main agent SHALL 保持只读。它 SHALL 检查文件、搜索代码、运行只读 OpenSpec 上下文命令、提问、比较方案、解释影响面报告，并生成只存在于对话中的 `Design Summary`；它 SHALL NOT 创建、编辑、删除、格式化、重新生成或 patch 项目文件和 OpenSpec 制品。

#### Scenario: Explore 不写入制品

- **WHEN** 用户调用 `openspec-explore`
- **AND** 对话已形成确定的设计方向
- **THEN** main explore agent SHALL 将结果保留在对话状态中
- **AND** SHALL 生成只存在于对话中的 `Design Summary`
- **AND** SHALL 在需要生成制品时指示用户调用 `/opsx:propose <change-name>`

#### Scenario: Impact sweeper 是 explore 唯一写例外

- **WHEN** explore 需要影响面发现
- **THEN** main explore agent SHALL spawn 一个子代理，并指示该子代理读取并执行 `openspec-impact-sweeper` skill
- **AND** SHALL NOT 将 `openspec-impact-sweeper` 作为 `subagent_type` 传给 Agent 工具，因其是 skill 而非注册 agent type
- **AND** 只有运行该 skill 的子代理 MAY 在 `openspec/sweeper/` 下写入 JSON report
- **AND** main explore agent SHALL 只读取并解释该 report
