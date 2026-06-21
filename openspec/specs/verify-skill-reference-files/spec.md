# verify-skill-reference-files Specification

## Purpose

[REMOVED: verify-change 技能模板已于 commit 763d9d6f 删除。Phase 2 checkpoint 协议现由 reviewer.ts 子代理模型和 apply-change.ts Phase 2 编排段落共同承载。本 spec 保留为历史记录。]
## Requirements
### Requirement: verify skill 包含 Phase 2 checkpoint reference

openspec-verify-change skill 的 SkillTemplate MUST 包含 `referenceFiles` 字段，其中包含完整的 Phase 2 checkpoint 协议文档。主 instructions MUST 明确引用该 reference 文档在 `openspec/references/` 下的受管路径。

[REMOVED: `getVerifyChangeSkillTemplate()` 随 verify-change.ts 模板一起删除。]

#### Scenario: referenceFiles 包含 checkpoint 协议

- **WHEN** 调用 `getVerifyChangeSkillTemplate()`
- **THEN** 返回的 SkillTemplate MUST 包含 `referenceFiles` 数组
- **AND** 数组 MUST 包含一个 reference，其物化目标为 `openspec/references/openspec-phase2-checkpoint-protocol.md`
- **AND** reference 的 `content` MUST 包含完整的 checkpoint 状态机表格
- **AND** content MUST 包含字符串 `"git stash push -u -m \"verify-phase2-checkpoint\""`

[REMOVED: `openspec/references/openspec-phase2-checkpoint-protocol.md` 从未作为制品存在。verify-change 模板已被删除。]

#### Scenario: 主指令引用 checkpoint 协议

- **WHEN** 读取 verify skill 的 `instructions` 字段
- **THEN** instructions MUST 包含 "## Required References" 章节
- **AND** 该章节 MUST 列出 `openspec/references/openspec-phase2-checkpoint-protocol.md`
- **AND** Phase 2 相关步骤 MUST 提示按该 reference 文件执行 checkpoint protocol

### Requirement: checkpoint 协议内容完整性

Phase 2 checkpoint 协议 reference 文件 MUST 包含所有关键元素，确保 agent 能够正确执行 checkpoint 生命周期。

[REMOVED: `PHASE2_CHECKPOINT_PROTOCOL_REFERENCE` 常量不存在，verify-change 模板已被删除。]

#### Scenario: 包含 checkpoint 状态机

- **WHEN** 读取 `PHASE2_CHECKPOINT_PROTOCOL_REFERENCE` 常量
- **THEN** 内容 MUST 包含 "Checkpoint State Machine" 章节
- **AND** MUST 包含状态表格，定义以下状态：
  - `CREATED`: `git stash push -u -m "verify-phase2-checkpoint"`
  - `BASELINE_RESTORED_FOR_RETRY`: `git stash apply <checkpointRef>`
  - `TERMINAL_ACCEPTED`: `git stash drop <checkpointRef>`
  - `TERMINAL_RESTORED`: `git stash pop <checkpointRef>`

#### Scenario: 包含 Hard Rules

- **WHEN** 读取 checkpoint 协议内容
- **THEN** MUST 包含 "Hard Rules" 章节
- **AND** MUST 明确说明：
  - 何时创建 checkpoint（before applying any optimization edits）
  - 何时恢复 baseline（immediately restore after creation, retry after failure）
  - 何时消费 checkpoint（after acceptance or final restore）
  - 失败时如何处理（set ABORTED_UNSAFE, preserve stash entry）

#### Scenario: 包含 optimizer 集成协议

- **WHEN** 读取 checkpoint 协议内容
- **THEN** MUST 包含 "Optimizer Integration" 章节
- **AND** MUST 说明如何 spawn optimizer subagent
- **AND** MUST 说明 input contract（changeName, changeDir, projectRoot）
- **AND** MUST 说明 output format（Search/Replace blocks or NO_OPTIMIZATION_NEEDED）

#### Scenario: 包含 speculative re-verification 流程

- **WHEN** 读取 checkpoint 协议内容
- **THEN** MUST 包含 "Speculative Re-verification" 章节
- **AND** MUST 说明 PASS 后如何处理（finalize, drop checkpoint, record IMPROVED）
- **AND** MUST 说明 FAIL 后如何处理（discard edits, restore baseline, keep checkpoint, retry）
- **AND** MUST 说明 retry budget 管理（optRetries 配额，格式问题不消耗）

### Requirement: 与 optimizer skill 一致的拆分模式

verify skill 的 referenceFiles 机制 MUST 与 openspec-optimizer skill 保持一致的模式，确保所有 internal subagent skills 使用统一的模板拆分方式。

#### Scenario: referenceFiles 结构一致

- **WHEN** 对比 `getVerifyChangeSkillTemplate()` 和 `getOptimizerSkillTemplate()` 的 `referenceFiles` 结构
- **THEN** 两者 MUST 使用相同的结构：
  ```typescript
  referenceFiles: [
    {
      path: 'references/<name>.md',
      content: <CONSTANT_STRING>
    }
  ]
  ```
- **AND** path 格式 MUST 为 `references/<kebab-case-name>.md`
- **AND** content MUST 来自文件顶部定义的常量

#### Scenario: 主指令引用格式一致

- **WHEN** 对比 verify 和 optimizer skill 的主 instructions
- **THEN** 两者 MUST 使用相同的引用格式：
  ```markdown
  ## Required References
  
  Read <description>:
  - references/<file>.md
  ```

### Requirement: 测试覆盖

skill template 测试 MUST 验证 verify skill 包含正确的 referenceFiles 和 checkpoint 协议内容。

#### Scenario: 快照测试捕获 referenceFiles 变化

- **WHEN** 运行 `test/core/templates/skill-templates-parity.test.ts`
- **THEN** 测试 MUST 包含 `getVerifyChangeSkillTemplate` 的哈希验证
- **AND** 任何 referenceFiles 内容变化 MUST 导致哈希不匹配
- **AND** 测试失败时 MUST 提示更新预期哈希值

#### Scenario: 生成的 reference 落盘到共享 references home

- **WHEN** 通过 workflow 安装管线生成 skill 文件
- **THEN** `.claude/skills/openspec-verify-change/` 目录 MUST 包含 `SKILL.md`
- **AND** MUST NOT 包含 `references/` 子目录
- **AND** `openspec/references/openspec-phase2-checkpoint-protocol.md` MUST 存在
- **AND** 该文件内容 MUST 与 [REMOVED: PHASE2_CHECKPOINT_PROTOCOL_REFERENCE 常量不存在] 一致
- **AND** `SKILL.md` MUST 引用 `openspec/references/openspec-phase2-checkpoint-protocol.md`

### Requirement: verify skill reference files 随模板删除而移除

verify-change 技能模板 SHALL 已被删除（commit 763d9d6f）。该模板原本 SHALL 通过 referenceFiles 机制提供 Phase 2 checkpoint 协议，但该协议现由 reviewer.ts 子代理模型和 apply-change.ts Phase 2 编排段落共同承载。

#### Scenario: 已删除模板不生成 reference 文件

- **WHEN** 系统生成 workflow skills
- **THEN** 系统 SHALL NOT 生成 `openspec/references/openspec-phase2-checkpoint-protocol.md`
- **AND** SHALL NOT 引用不存在的 `PHASE2_CHECKPOINT_PROTOCOL_REFERENCE` 常量

#### Scenario: checkpoint 协议由 reviewer.ts 承载

- **WHEN** reviewer subagent 执行 Phase 2 优化相关验证
- **THEN** checkpoint 协议 SHALL 由 reviewer.ts 子代理 contract 和 apply-change.ts Phase 2 编排段落定义
- **AND** SHALL NOT 依赖已删除的 verify-change 模板中的 referenceFiles 机制

## Context

### 问题背景

commit 7ce4c30045db 为了满足 skill-template-length-check 要求（每个生成文件 ≤ 200 行），创建了简化版 `buildVerifySkillInstructions()`。但该简化版删除了 Phase 2 checkpoint 的详细指令，特别是 `git stash push` 命令和状态机表格，只留下模糊的 "create a checkpoint" 描述。

这导致 agent 在执行 verify Phase 2 时，错误地创建新分支来"隔离"优化，而不是使用 stash 作为安全回滚点。

### 设计原则

- **详细指令放 reference**：将超过 200 行的详细协议提取为独立的 reference 常量
- **主指令保持简洁**：主 instructions 只包含流程步骤和 reference 引用
- **统一拆分模式**：与 optimizer skill 使用相同的 referenceFiles 结构
- **测试保护**：通过哈希验证确保 referenceFiles 内容变化被捕获

### 相关规约

- `skill-template-length-check`: 定义 200 行限制和 referenceFiles 拆分机制
- `verify-optimization`: 定义 Phase 2 checkpoint 的行为要求
- `internal-skill-installation`: 定义 skill 文件生成和安装流程
