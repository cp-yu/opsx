## MODIFIED Requirements

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
- MUST 使用 ponytail 标签体系（delete/stdlib/native/yagni/shrink）对优化提案进行分类
- MUST NOT 标记因 specs 明确要求而存在的代码为冗余

#### Scenario: Optimizer 使用 Bash 辅助分析
- **WHEN** optimizer 需要确认某函数的调用点或测试覆盖
- **THEN** optimizer SHALL 使用 `grep` 或 `git log` 等只读命令辅助分析
- **AND** SHALL 基于分析结果决定优化策略是否安全

#### Scenario: Optimizer 拒绝行为改变提案
- **WHEN** optimizer 识别出一个可能改变行为的改进（如重排序有副作用的调用）
- **THEN** optimizer MUST NOT 提议此变更
- **AND** SHALL 返回 NO_OPTIMIZATION_NEEDED（若此为唯一改进机会）

#### Scenario: 使用 ponytail 标签分类优化

- **WHEN** optimizer 输出 Search/Replace 优化块
- **THEN** 每个优化提案 SHALL 标注对应的 ponytail 标签：delete（死代码）、stdlib（重造标准库）、native（有平台功能可替代）、yagni（一个实现的抽象）、shrink（同样逻辑更少行数）
- **AND** 标签作为附加分类信息，不改变 Search/Replace 块的结构格式

#### Scenario: 不标记 specs 要求的代码

- **WHEN** optimizer 识别出一个抽象仅有一处实现，但该抽象对应的 spec requirement 明确了必须存在该抽象
- **THEN** optimizer SHALL NOT 将此项标记为 yagni
- **AND** SHALL 跳过该优化，不写入提案
