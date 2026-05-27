# openspec-optimizer-skill Specification

## Purpose
此规约记录变更 add-subagent-skills 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
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

### Requirement: 优化原则与禁止项
`openspec-optimizer` skill SHALL 定义优先级排序的优化类别：

1. **降低重复** — 提取重复逻辑为共享函数、去重验证、合并错误处理模式
2. **简化结构** — 展平不必要的嵌套、减少间接层、以直接代码替代过度工程化的抽象
3. **清晰的流程控制** — 优先早返回而非深层条件、减少圈复杂度、让正常路径显而易见
4. **更好的局部性** — 将相关代码移近、保持数据与其操作在同一模块、减少跨模块耦合
5. **删除死代码** — 消除未使用的导入、不可达分支、被注释的代码、冗余类型断言

且 MUST NOT 触碰：
- Spec 文件、设计文档、tasks 文件
- 配置文件
- 测试文件（除非与正在去重的生产逻辑结构上相同）
- Phase 1 无 issue 且目视无结构性改进机会的文件

#### Scenario: 识别有意义的重复消除机会
- **WHEN** 两个文件包含几乎相同的验证逻辑
- **THEN** optimizer SHALL 提案提取共享函数
- **AND** SHALL 确保所有 Search/Replace 块共同保持行为一致

#### Scenario: 简单代码无需优化
- **WHEN** 变更代码已经是扁平结构、无重复、命名清晰
- **THEN** optimizer SHALL 返回 No optimization opportunities found
- **AND** SHALL NOT 制造不存在的改进

### Requirement: Search/Replace 块输出格式
`openspec-optimizer` skill SHALL 精确指定 Search/Replace 块格式：

```
<<<PATH: relative/path/to/file.ts
<<<SEARCH
exact old text
===
replacement new text
>>>REPLACE
```

每个块 MUST 仅针对一个已有文件。SEARCH 内容 MUST 足够具体以匹配唯一位置（含变更区域上下 3-5 行以确保唯一性）。使用文件的真实空白符。匹配置零位置或多位置的块将被拒绝。所有块 MUST 按顺序应用时内部一致。MUST NOT 编号或索引块。

#### Scenario: 产出多个文件的 Search/Replace 块
- **WHEN** optimizer 识别出跨两个文件的优化机会
- **THEN** SHALL 为每个文件产出独立的 Search/Replace 块
- **AND** 块之间以空行分隔
- **AND** 所有块 MUST 形成一致的原子变更

#### Scenario: SEARCH 内容不够唯一
- **WHEN** optimizer 提案的 SEARCH 内容在目标文件中匹配多个位置
- **THEN** 主 agent SHALL 拒绝该块
- **AND** optimizer SHALL 在重新生成时加入更多上下文行

### Requirement: Failed Directions 避重协议
`openspec-optimizer` skill SHALL 定义 failedDirections 避重协议：在生成提案前检查 failedDirections 列表， MUST NOT 提案与其中任一条目策略相同或实质上相似的优化。"实质上相似"意味着：相同目标文件 + 相同类型的结构变更 + 相同的抽象边界。若所有可行优化策略均已在 failedDirections 中，返回 No optimization opportunities found。

Optimizer 自身不记录失败——顶层 agent 在推测性重验证返回 FAIL_NEEDS_REMEDIATION 后追加到 failedDirections。

#### Scenario: 避免重复失败的优化方向
- **WHEN** failedDirections 包含 "extract shared validation logic from auth.ts and user.ts"
- **THEN** optimizer MUST NOT 提案从 auth.ts 和 user.ts 中提取验证逻辑
- **AND** MUST NOT 提案提取相同文件的超集验证逻辑

#### Scenario: 所有策略已用尽
- **WHEN** failedDirections 覆盖了所有 optimizer 能想到的可行优化策略
- **THEN** optimizer SHALL 返回 No optimization opportunities found
- **AND** SHALL NOT 编造低质量的替代提案

### Requirement: 跨工具 skill 路径兼容
`openspec-optimizer` skill 文件 SHALL 通过 `path.join()` 构建安装路径，确保跨平台正确性。Skill 指令中的 Search/Replace PATH 字段 SHALL 使用相对 POSIX 路径。

#### Scenario: Codex 上安装 optimizer skill
- **WHEN** 在任意平台上为 Codex 执行 `openspec init`
- **THEN** skill 文件 SHALL 写入到 `.codex/skills/openspec-optimizer/SKILL.md`
- **AND** Codex 的 skill 名称解析 SHALL 使用 `openspec-optimizer`（无 `$` 前缀在 skill 目录名称中，`$` 前缀为 invoke 时的语法）

