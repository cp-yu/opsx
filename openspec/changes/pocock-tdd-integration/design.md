## Context

当前 OpenSpec Apply 工作流包含三个验证阶段（Phase 0 实现、Phase 1 Reviewer、Phase 2 Optimizer），但缺乏前置的测试质量保障和系统化的代码坏味道检测。Matt Pocock TDD Skill 提供了久经验证的 TDD 最佳实践，包括接口可测试性设计、测试质量标准、Mock 边界约束，以及 6 种经典代码坏味道的识别清单。

现有约束：
- Apply 和 Optimizer 均为 skill 形式，通过 SKILL.md 文件向 Master Agent 和 Subagent 传递指令
- 不能修改 OpenSpec CLI 或核心代码，仅能通过 skill 指令增强
- 需保持与现有三阶段验证流程的兼容性
- Optimizer 已有行为保持优化机制，需在此基础上扩展

## Goals / Non-Goals

**Goals:**
- 在 Apply Phase 0 实现循环中嵌入 3 个 TDD 质量检查点，确保接口可测试性、测试质量、Mock 边界正确
- 在 Optimizer Phase 2 扫描中增加 3 个 Pocock 坏味道维度（长方法、浅模块、原始类型痴迷），并为现有 5 个维度增加具体识别指标
- 保持融合式集成，避免创建独立 TDD skill 导致的多次 subagent 调用开销
- 所有重构操作统一在 Phase 2 进行，Phase 0 仅负责质量门槛

**Non-Goals:**
- 不修改 OpenSpec CLI 核心逻辑或三阶段验证流程
- 不强制所有项目启用 TDD 检查（可通过配置开关）
- 不在 Phase 0 进行自动重构（仅检查和建议，重构留给 Phase 2）
- 不创建独立的 TDD skill（融合到现有 Apply 和 Optimizer skill）

## Decisions

### 决策 1：融合式集成而非独立 Skill

**选择**：将 TDD 原则直接嵌入 Apply 和 Optimizer 的 SKILL.md 文件

**理由**：
- 避免多次 subagent 调用的性能开销（独立 skill 需在每个任务前后调用）
- TDD 检查点与 Apply 实现循环天然契合，无需额外编排
- Optimizer 坏味道扫描是重构的自然扩展，不是独立步骤

**备选方案**：
- 方案 A（独立 Skill）：创建 `/tdd-check` 和 `/tdd-refactor` skill，Apply 在关键点显式调用
  - 优点：模块化，易于开关
  - 缺点：多次 subagent 调用慢，增加编排复杂度
- 方案 B（混合式）：核心原则融合，专项检查显式调用
  - 优点：平衡性能和灵活性
  - 缺点：融合边界难以界定，维护复杂

### 决策 2：重构统一在 Phase 2，Phase 0 仅门槛检查

**选择**：Phase 0 只做 3 个检查点（接口设计、测试质量、Mock 边界），不执行自动重构；所有重构在 Phase 2 Optimizer 统一处理

**理由**：
- Phase 0 需保持高效，避免因重构阻塞实现进度
- Phase 2 已有 Checkpoint 保护机制，重构失败可安全回滚
- 职责分离清晰：Phase 0 保证实现质量，Phase 2 消除坏味道

**备选方案**：
- 方案 A（Phase 0 即时重构）：每次绿灯后立即扫描并重构坏味道
  - 优点：符合 Pocock 原教旨 TDD
  - 缺点：Phase 0 显著延长，可能过度重构
- 方案 B（保守策略）：Phase 0 只扫描不重构，Phase 2 仅处理记录的问题
  - 优点：最安全
  - 缺点：可能累积大量坏味道，Phase 2 负担重

### 决策 3：Optimizer 坏味道清单从 5 项扩展至 8 项

**选择**：保留现有 5 项（重复、结构、控制流、局部性、冗余），新增 3 项 Pocock 维度（长方法、浅模块、原始类型痴迷）

**理由**：
- 现有 5 项已覆盖部分 Pocock 原则（如重复消除、局部性对应 Feature Envy），但缺少具体识别指标
- 新增 3 项填补关键空白（长方法拆分、模块深度评估、值对象化）
- 为所有 8 项增加具体的"Code Smell Indicators"，提升扫描精准度

**备选方案**：
- 方案 A（完全替换）：用 Pocock 6 项坏味道替换现有 5 项
  - 优点：概念统一
  - 缺点：丢失现有"Remove dead weight"等有用维度
- 方案 B（仅增强指标）：不新增维度，只为现有 5 项增加指标
  - 优点：变化最小
  - 缺点：遗漏长方法、浅模块、原始类型痴迷等关键坏味道

### 决策 4：Apply Checkpoint 插入位置

**选择**：
- Checkpoint 1：第 117 行后（读取任务后，编写测试前）
- Checkpoint 2：第 123 行后（编写测试后，RED 前）
- Checkpoint 3：第 125 行内（实现时嵌入）

**理由**：
- Checkpoint 1 在编写测试前评估接口设计，避免为不可测试接口强行写测试
- Checkpoint 2 在 RED 前验证测试质量，避免低质量测试进入循环
- Checkpoint 3 在实现时强制 Mock 边界，避免错误的 Mock 策略

**备选方案**：
- 方案 A（统一前置检查）：3 个检查点都在任务开始前执行
  - 优点：一次性完成所有检查
  - 缺点：过早检查 Mock 边界（实现未开始），可能误判

### 决策 5：Optimizer 输出增加坏味道类型标注

**选择**：每个 Search/Replace block 前添加 `<!-- Code Smell: <type> -->` 注释

**理由**：
- 提升 Optimizer 输出的可读性和可追溯性
- 便于 Phase 2 失败时，Master Agent 理解哪类重构失败
- 支持未来按坏味道类型过滤或统计

**备选方案**：
- 方案 A（仅在 summary 中说明）：不标注每个 block，只在最终总结中列出坏味道类型
  - 优点：输出更简洁
  - 缺点：无法将 block 与坏味道类型精确对应

## Risks / Trade-offs

### 风险 1：Phase 0 时长增加

**风险**：3 个检查点增加任务实现时间，可能让用户感觉变慢

**缓解**：
- 检查点设计为轻量级指导，非阻塞式审核
- 仅在违反原则时要求调整，大部分情况快速通过
- 文档说明检查点的价值（避免后期返工）

### 风险 2：Optimizer 建议过多

**风险**：8 个坏味道维度可能产生大量重构建议，Phase 2 执行时间过长

**缓解**：
- 保持优先级排序，高影响问题优先
- `optimization.optRetries` 限制尝试次数（默认 2 次）
- Optimizer 仍需判断"No optimization opportunities found"

### 风险 3：学习曲线

**风险**：用户需理解 TDD 原则，可能产生困惑

**缓解**：
- TDD 原则嵌入 skill，自动应用，用户无需显式触发
- 检查点提供清晰的违规说明和调整建议
- 文档补充 TDD 原则解释和示例

### 权衡 1：融合 vs 模块化

**权衡**：融合式集成获得性能优势，但牺牲了独立开关的灵活性

**决策**：优先性能，通过配置控制（未来可增加 `tdd.enabled: false`）

### 权衡 2：Phase 0 门槛检查 vs 即时重构

**权衡**：仅做门槛检查保持 Phase 0 高效，但违背 Pocock "绿灯后立即重构"原教旨

**决策**：优先工程实用性，重构统一在 Phase 2 有 Checkpoint 保护下进行

### 权衡 3：坏味道清单完整性 vs 扫描开销

**权衡**：8 个维度提升代码质量，但 Optimizer 执行时间可能增加

**决策**：代码质量优先，通过 `optRetries` 和优先级排序控制开销

## Migration Plan

无需迁移，仅修改 skill 文件，下次 Apply/Optimizer 调用时自动生效。

**部署步骤**：
1. 修改 `.claude/skills/openspec-apply-change/SKILL.md`，嵌入 3 个 Checkpoint
2. 修改 `.claude/skills/openspec-optimizer/SKILL.md`，扩展坏味道清单至 8 项
3. 更新 CLAUDE.md 中的 OPSX Best Practices，说明 TDD 集成
4. 运行测试验证现有 Apply 和 Optimizer 行为不受影响

**回滚策略**：
- 若 TDD 检查点导致 Phase 0 过度阻塞，可临时注释 Checkpoint 段落
- 若 Optimizer 建议过多，可临时移除新增的 3 个坏味道维度

## Open Questions

1. **是否需要配置开关**：是否在 `openspec/config.yaml` 增加 `tdd.enabled: false` 允许用户完全禁用 TDD 检查？
   - 倾向：暂不增加，观察实际使用效果后再决定

2. **Checkpoint 违规如何处理**：当 Master Agent 检测到接口设计违规时，是停止并要求用户介入，还是自动调整接口？
   - 倾向：自动调整接口（Agent 有足够上下文），但记录调整原因

3. **Optimizer 坏味道优先级**：8 个维度的优先级如何排序？是否需要动态调整？
   - 倾向：保持文档顺序（重复 > 结构 > 控制流 > 局部性 > 冗余 > 长方法 > 浅模块 > 原始类型痴迷），暂不动态调整
