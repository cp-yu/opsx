## Why

当前 OpenSpec Apply 工作流缺乏系统化的测试驱动开发（TDD）质量保障机制。虽然实现阶段有任务级检查，但缺少接口可测试性评估、测试质量标准和 Mock 边界约束。Phase 2 优化器关注行为保持优化，但未覆盖经典代码坏味道检测（长方法、浅模块、原始类型痴迷等）。融合 Matt Pocock TDD Skill 的核心原则可在实现前建立质量门槛，在重构阶段系统化消除坏味道，从而提升最终代码质量。

## What Changes

- **Phase 0 增强**：在 Apply Master Agent 实现循环中嵌入 3 个 TDD 质量检查点
  - Checkpoint 1: 接口设计可测试性评估（依赖注入、返回值、最小接口）
  - Checkpoint 2: 测试质量标准验证（公共接口、无内部 mock、单断言、重构存活）
  - Checkpoint 3: Mock 边界约束强制（仅系统边界、依赖注入模式）

- **Phase 2 增强**：扩展 Optimizer 坏味道检测维度从 5 项增至 8 项
  - 保留现有：重复消除、结构简化、控制流清晰、局部性优化、冗余移除
  - 新增 Pocock 维度：长方法拆分、浅模块加深、原始类型痴迷消除
  - 每个维度增加具体的代码坏味道指标、重构模式和行动指南

- **文档更新**：修改 Apply 和 Optimizer 两个 SKILL.md 文件，嵌入 TDD 原则而非创建独立 skill

## Capabilities

### New Capabilities
- `tdd-apply-checkpoints`: Apply Phase 0 的 3 个 TDD 质量检查点实现
- `tdd-optimizer-smells`: Optimizer Phase 2 的 Pocock 坏味道检测增强

### Modified Capabilities
- `opsx-apply-skill`: 修改 Apply SKILL.md，嵌入 3 个 TDD 检查点
- `openspec-optimizer-skill`: 修改 Optimizer SKILL.md，扩展坏味道清单至 8 项

## Impact

**受影响代码**：
- `.claude/skills/openspec-apply-change/SKILL.md` - Phase 0 实现循环增加检查点
- `.claude/skills/openspec-optimizer/SKILL.md` - "What to Improve" 章节扩展

**API 变化**：无，仅 skill 指令层面增强

**依赖**：无新增依赖

**系统影响**：
- Apply Phase 0 时长可能轻微增加（增加 3 个轻量级检查）
- Optimizer Phase 2 扫描覆盖面增加，可能产生更多重构建议
- 整体代码质量预期提升，但需平衡重构激进度
