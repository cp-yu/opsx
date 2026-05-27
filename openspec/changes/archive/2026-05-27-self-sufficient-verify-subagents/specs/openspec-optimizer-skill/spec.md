# openspec-optimizer-skill Specification (Delta)

## MODIFIED Requirements

### Requirement: Optimizer 输入合约
`openspec-optimizer` skill SHALL 定义顶层 agent MUST 传入的轻量定位信息：

| 字段 | 描述 | 必需 |
|---|---|---|
| changeName | change 名称，用于拼接路径 | 是 |
| changeDir | change 目录的绝对路径 | 是 |
| projectRoot | 项目根目录的绝对路径 | 是 |

Optimizer SHALL 自主完成以下信息获取：
- **phase1Summary / phase1Issues**: 从 `changeDir/.verify-result.json` 读取 `result` 和 `issues` 字段
- **changeArtifacts**: 从 `changeDir` 读取 proposal.md、specs/*/spec.md、design.md
- **finalFileContents**: 从 `.verify-result.json` 的 `verificationContext.evidenceFiles` 列表逐个读取
- **evidenceFiles**: 同上，直接从 `.verify-result.json` 获取
- **config**: 从 `projectRoot/openspec/config.yaml` 读取 `optimization.enabled` 和 `optimization.optRetries`
- **failedDirections**: 从 `.verify-result.json` 的 `optimization.failedDirections` 读取

如果 `changeName`、`changeDir` 或 `projectRoot` 缺失，optimizer MUST fail closed 并返回错误描述。

#### Scenario: 所有定位信息完整传入
- **WHEN** 顶层 agent 传入 changeName、changeDir 和 projectRoot
- **THEN** optimizer SHALL 自行读取 `.verify-result.json` 获取 Phase 1 结果和 evidence 列表
- **AND** SHALL 自行读取候选实现文件
- **AND** SHALL 继续执行优化分析

#### Scenario: .verify-result.json 不存在
- **WHEN** `changeDir/.verify-result.json` 不存在
- **THEN** optimizer SHALL 返回错误 "Phase 1 result not found — cannot optimize without baseline"
- **AND** SHALL NOT 尝试自行推断 Phase 1 状态

#### Scenario: 利用 evidenceFiles 读取候选文件
- **WHEN** `.verify-result.json` 存在且包含 `verificationContext.evidenceFiles`
- **THEN** optimizer SHALL 逐个读取 evidenceFiles 中的实现文件（排除 spec/design/tasks 文件）
- **AND** SHALL 基于读取的完整文件内容生成精确的 Search/Replace 锚点

### Requirement: Optimizer 角色与硬约束
`openspec-optimizer` skill SHALL 将 subagent 定义为 Phase 2 优化提案者，且 MUST 遵循以下硬约束：

- MUST NOT 引用或依赖任何实现对话历史——该历史不可用且非权威
- MUST 自主读取文件并基于读取内容生成 Search/Replace 块
- MUST 仅优化已有跟踪文件——MUST NOT 创建、删除、重命名或移动文件
- MUST NOT 改变可观察行为——变更 MUST 保持所有现有功能
- MUST NOT 触碰 spec 文件、设计文档、tasks 文件或配置文件——仅实现代码
- MUST NOT 通过 Bash 执行文件修改操作
- MAY 通过 Bash 执行测试命令、git 只读命令和 grep 搜索
- MUST 严格按规定格式返回 Search/Replace 块，偏离将被主 agent 拒绝
- 若无有意义的改进可能，MUST 返回: `No optimization opportunities found`

#### Scenario: Optimizer 使用 Bash 辅助分析
- **WHEN** optimizer 需要确认某函数的调用点或测试覆盖
- **THEN** optimizer SHALL 使用 `grep` 或 `git log` 等只读命令辅助分析
- **AND** SHALL 基于分析结果决定优化策略是否安全

#### Scenario: Optimizer 拒绝行为改变提案
- **WHEN** optimizer 识别出一个可能改变行为的改进（如重排序有副作用的调用）
- **THEN** optimizer MUST NOT 提议此变更
- **AND** SHALL 返回 NO_OPTIMIZATION_NEEDED（若此为唯一改进机会）
